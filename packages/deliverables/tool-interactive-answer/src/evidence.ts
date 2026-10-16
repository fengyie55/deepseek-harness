/** Bounded evidence selection; display tools never supply replacement business values. */
import { z } from 'zod'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { AnswerSource, AnswerSources, InteractiveAnswer } from './types.ts'

const pathSchema = z.array(z.string().max(200)).max(16)

/** Model JSON validation, including field selection and chart column indexes. */
export const requestSchema = z.strictObject({
  sourceCallId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  kind: z.enum(['table', 'trend', 'pareto', 'timeline']),
  jsonPath: pathSchema.optional(),
  rowsPath: pathSchema,
  columns: z.array(z.strictObject({ title: z.string().trim().min(1).max(100), path: pathSchema })).min(1),
  labelColumn: z.number().int().nonnegative(),
  valueColumn: z.number().int().nonnegative(),
  unit: z.string().max(100),
})

/** Projection checkpoint validation; failed or oversized results are never retained. */
export const sourcesSchema: z.ZodType<AnswerSources> = z.object({
  pending: z.array(z.object({ callId: z.string().transform(ToolCallId), name: z.string(), arguments: z.json() })),
  settled: z.array(z.object({
    callId: z.string().transform(ToolCallId), name: z.string(), seq: z.number().int().nonnegative(),
    arguments: z.json(), document: z.json(),
  })),
})

/** Deployment bounds applied to evidence retention and complete answers. */
export interface Limits {
  /** Exact tool names whose JSON results may supply displayed business records. */
  sourceTools: string[]
  /** Maximum pending calls and settled evidence records retained per session, each. */
  maxSources: number
  /** Maximum UTF-8 bytes of one retained source, including query arguments. */
  maxSourceBytes: number
  /** Maximum source row count; larger arrays require a narrower query. */
  maxRows: number
  /** Maximum displayed scalar fields per source row. */
  maxColumns: number
  /** Maximum UTF-8 bytes of the complete serialized answer, including its source. */
  maxResultBytes: number
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

/**
 * Fold native and nested tool outcomes into bounded session-local evidence.
 * @param state - previous evidence.
 * @param event - committed session event.
 * @param limits - configured retention bounds.
 * @returns next evidence, retaining only successful JSON documents.
 */
export function foldSources(state: AnswerSources, event: SessionEvent, limits: Limits): AnswerSources {
  if (event.type === 'tool/call' || event.type === 'tool/ptc-dispatch-start') {
    const call = event.type === 'tool/call'
      ? event.data
      : { callId: event.data.subCallId, name: event.data.name, arguments: event.data.arguments }
    if (!limits.sourceTools.includes(call.name) || byteLength(call.arguments) > limits.maxSourceBytes) return state
    const args = z.json().safeParse(call.arguments)
    if (!args.success) return state
    const pending = [...state.pending, { callId: call.callId, name: call.name, arguments: args.data }]
    return { ...state, pending: pending.slice(-limits.maxSources) }
  }
  if (event.type !== 'tool/result' && event.type !== 'tool/ptc-dispatch') return state
  const result = event.type === 'tool/result' ? { ...event.data.message, callId: event.data.message.toolCallId } : {
    callId: event.data.subCallId, content: event.data.content, isError: event.data.isError,
  }
  const call = state.pending.find(item => item.callId === result.callId)
  if (call === undefined) return state
  const next = { ...state, pending: state.pending.filter(item => item !== call) }
  if (result.isError || byteLength(result.content) > limits.maxSourceBytes) return next
  const texts = result.content.filter(item => item.type === 'text')
  if (texts.length !== 1 || texts[0]?.type !== 'text') return next
  let document: JsonValue
  try {
    document = z.json().parse(JSON.parse(texts[0].text))
  } catch (error) {
    // Ordinary text results contain no structured evidence to select.
    if (error instanceof SyntaxError || error instanceof z.ZodError) return next
    throw error
  }
  const source: AnswerSource = { ...call, seq: event.seq, document }
  if (byteLength(source) > limits.maxSourceBytes) return next
  return { ...next, settled: [...state.settled, source].slice(-limits.maxSources) }
}

function atPath(value: JsonValue, path: readonly string[]): JsonValue {
  let current = value
  for (const key of path) {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) {
      throw new Error(`Source field missing: ${JSON.stringify(path)}`)
    }
    const selected: JsonValue | undefined = Array.isArray(current) ? current[Number(key)] : current[key]
    if (selected === undefined) throw new Error(`Source field missing: ${JSON.stringify(path)}`)
    current = selected
  }
  return current
}

function assertSuccessful(doc: JsonValue): void {
  if (doc !== null && typeof doc === 'object' && !Array.isArray(doc)) {
    if (doc.isError === true || doc.error != null || (typeof doc.status === 'string' && !['success', 'partial', 'ready', 'ok', 'completed'].includes(doc.status))) {
      throw new Error('Source reports failure; obtain successful evidence before displaying an answer')
    }
  }
}

/**
 * Select exact source cells and refuse missing fields, failed envelopes, and oversized output.
 * @param input - model-supplied display selection.
 * @param sources - current session's retained evidence.
 * @param limits - deployment bounds.
 * @returns a self-contained answer with unchanged source values and complete evidence.
 */
export function buildAnswer(input: unknown, sources: AnswerSources, limits: Limits): InteractiveAnswer {
  const args = requestSchema.parse(input)
  const source = sources.settled.find(item => item.callId === args.sourceCallId)
  if (source === undefined) {
    const available = sources.settled.map(item => ({ sourceCallId: item.callId, tool: item.name, seq: item.seq }))
    throw new Error(`Source unavailable. Use an exact sourceCallId from available sources (not a document request_id or bundle_id): ${JSON.stringify(available)}. If none are available, query again for a bounded JSON result in this session.`)
  }
  let doc = source.document
  assertSuccessful(doc)
  if (args.jsonPath !== undefined) {
    const text = atPath(doc, args.jsonPath)
    if (typeof text !== 'string') throw new Error('jsonPath must select JSON text')
    doc = z.json().parse(JSON.parse(text))
    assertSuccessful(doc)
  }
  if (args.columns.length > limits.maxColumns) throw new Error('Too many selected columns; select fewer fields')
  if (args.labelColumn >= args.columns.length || args.valueColumn >= args.columns.length) throw new Error('Selected column index is out of range')
  const raw = atPath(doc, args.rowsPath)
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Source rows must be a non-empty array')
  if (raw.length > limits.maxRows) throw new Error('Too many source rows; query a smaller interval or aggregate at the data source')
  const rows = raw.map(row => args.columns.map((column) => {
    const cell = atPath(row, column.path)
    if (cell !== null && typeof cell === 'object') throw new Error('Select scalar fields; nested objects are not display cells')
    return cell
  }))
  if (args.kind === 'trend' || args.kind === 'pareto') {
    if (!rows.some(row => typeof row[args.valueColumn] === 'number')) throw new Error('Chart requires numeric values')
    if (rows.some(row => row[args.valueColumn] !== null && typeof row[args.valueColumn] !== 'number')) throw new Error('Chart values must be numbers or null')
    if (args.kind === 'pareto' && rows.some(row => typeof row[args.valueColumn] === 'number' && Number(row[args.valueColumn]) < 0)) throw new Error('Pareto values must be non-negative')
  }
  const answer: InteractiveAnswer = {
    format: 'interactive-answer', version: 1, title: args.title, kind: args.kind, columns: args.columns, rows,
    labelColumn: args.labelColumn, valueColumn: args.valueColumn, unit: args.unit,
    source, rowsPath: args.rowsPath, ...(args.jsonPath === undefined ? {} : { jsonPath: args.jsonPath }),
  }
  if (byteLength(answer) > limits.maxResultBytes) throw new Error('Answer exceeds configured byte limit; query fewer rows or select fewer fields')
  return answer
}
