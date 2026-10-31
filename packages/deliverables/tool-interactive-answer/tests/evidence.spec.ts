/** Evidence selection keeps exact source values and rejects unsupported presentation data. */
import { describe, expect, it } from 'vitest'
import { ToolCallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { buildAnswer, foldSources } from '../src/evidence.ts'
import type { Limits } from '../src/evidence.ts'
import type { AnswerSources } from '../src/types.ts'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import * as InteractiveAnswerPlugin from '../src/index.ts'

const limits: Limits = { sourceTools: ['query'], maxSources: 2, maxSourceBytes: 20000, maxRows: 5, maxColumns: 4, maxResultBytes: 40000 }
const request = {
  sourceCallId: 'query-1', title: 'Observed measurements', kind: 'table', rowsPath: ['data', 'rows'],
  columns: [{ title: 'SN', path: ['sn'] }, { title: 'Value', path: ['value'] }], labelColumn: 0, valueColumn: 1, unit: 's',
}
const document = { status: 'success', data: { rows: [{ sn: 'SN 001 02', value: 0 }, { sn: 'SN 001 03', value: null }] }, warnings: ['partial coverage'] }

function evidence(doc: unknown = document, error = false, name = 'query', id = 'query-1', bounds = limits): AnswerSources {
  const callId = ToolCallId(id)
  const call: SessionEvent = { seq: SessionSeq(0), time: 0, type: 'tool/call', data: {
    turn: 1, step: 1, callId, name, arguments: '{"sn":"SN 001 02"}',
  } }
  const result: SessionEvent = { seq: SessionSeq(1), time: 1, type: 'tool/result', surfaceOp: 'append', sourceEventSeqs: [SessionSeq(0)], data: { turn: 1, step: 1,
    message: createToolResultMessage({ callId, content: [{ type: 'text', text: JSON.stringify(doc) }], isError: error }),
  } }
  return foldSources(foldSources({ pending: [], settled: [] }, call, bounds), result, bounds)
}

describe('interactive evidence', () => {
  it('preserves zero, null, complete spaced identities, warnings, and query arguments', () => {
    const answer = buildAnswer(request, evidence(), limits)
    expect(answer.rows).toEqual([['SN 001 02', 0], ['SN 001 03', null]])
    expect(answer.source.document).toEqual(document)
    expect(answer.source.arguments).toBe('{"sn":"SN 001 02"}')
    expect(answer.source.seq).toBe(1)
  })

  it('does not admit unapproved, failed, absent, or oversized sources', () => {
    expect(evidence(document, false, 'run_code').settled).toEqual([])
    expect(evidence(document, true).settled).toEqual([])
    expect(evidence(document, false, 'query', 'query-1', { ...limits, maxSourceBytes: 1 }).settled).toEqual([])
    expect(() => buildAnswer(request, { pending: [], settled: [] }, limits)).toThrow('Source unavailable')
    expect(() => buildAnswer(request, evidence({ status: 'error', data: document.data }), limits)).toThrow('Source reports failure')
  })

  it('lists retained call identities when the model supplies a document request id', () => {
    expect(() => buildAnswer({ ...request, sourceCallId: 'request-business-1' }, evidence(), limits))
      .toThrow('"sourceCallId":"query-1","tool":"query","seq":1')
  })

  it('selects embedded JSON explicitly and retains the complete transport result', () => {
    const wrapper = { content: [{ type: 'text', text: JSON.stringify(document) }], isError: false }
    const selected = { ...request, jsonPath: ['content', '0', 'text'] }
    const answer = buildAnswer(selected, evidence(wrapper), limits)
    expect(answer.rows).toEqual([['SN 001 02', 0], ['SN 001 03', null]])
    expect(answer.source.document).toEqual(wrapper)
    expect(answer.jsonPath).toEqual(selected.jsonPath)
    expect(() => buildAnswer({ ...selected, jsonPath: ['content'] }, evidence(wrapper), limits)).toThrow('JSON text')
    expect(() => buildAnswer(selected, evidence({ ...wrapper, isError: true }), limits)).toThrow('Source reports failure')
    const failed = { content: [{ type: 'text', text: JSON.stringify({ status: 'error' }) }] }
    expect(() => buildAnswer(selected, evidence(failed), limits)).toThrow('Source reports failure')
    expect(() => buildAnswer(selected, evidence({ content: [{ type: 'text', text: 'invalid' }] }), limits)).toThrow(SyntaxError)
  })

  it.each([
    [{ rowsPath: ['absent'] }, 'Source field missing'],
    [{ columns: [{ title: 'Absent', path: ['absent'] }], valueColumn: 0 }, 'Source field missing'],
    [{ labelColumn: 2 }, 'out of range'],
    [{ kind: 'trend', valueColumn: 0 }, 'numeric'],
    [{ kind: 'pareto', valueColumn: 0 }, 'numeric'],
  ])('rejects an invalid selection %j', (change, error) => {
    expect(() => buildAnswer({ ...request, ...change }, evidence(), limits)).toThrow(error)
  })

  it('enforces complete UTF-8 result bytes and configurable row/column bounds without truncation', () => {
    const sources = evidence()
    const localizedRequest = { ...request, title: '真实记录🧪' }
    const answer = buildAnswer(localizedRequest, sources, limits)
    const exact = new TextEncoder().encode(JSON.stringify(answer)).byteLength
    expect(buildAnswer(localizedRequest, sources, { ...limits, maxResultBytes: exact })).toEqual(answer)
    expect(() => buildAnswer(localizedRequest, sources, { ...limits, maxResultBytes: exact - 1 })).toThrow('byte limit')
    expect(() => buildAnswer(request, sources, { ...limits, maxRows: 1 })).toThrow('Too many source rows')
    expect(() => buildAnswer(request, sources, { ...limits, maxColumns: 1 })).toThrow('Too many selected columns')
  })

  it('refuses non-scalar cells, empty arrays, string measurements, and negative Pareto weights', () => {
    const source = (rows: unknown[]) => evidence({ status: 'success', data: { rows } })
    expect(() => buildAnswer(request, source([]), limits)).toThrow('non-empty array')
    expect(() => buildAnswer(request, source([{ sn: 'SN', value: {} }]), limits)).toThrow('scalar fields')
    expect(() => buildAnswer({ ...request, kind: 'trend' }, source([{ sn: 'SN', value: '1' }]), limits)).toThrow('numeric')
    expect(() => buildAnswer({ ...request, kind: 'pareto' }, source([{ sn: 'SN', value: -1 }]), limits)).toThrow('non-negative')
    expect(buildAnswer({ ...request, kind: 'trend' }, source([{ sn: 'SN', value: -1 }]), limits).rows).toEqual([['SN', -1]])
  })

  it('retains nested evidence under its subcall identity', () => {
    const subCallId = ToolCallId('nested-query')
    const rootCallId = ToolCallId('program')
    const call = { rootCallId, parentCallId: rootCallId, subCallId, name: 'query', arguments: { sn: 'SN 001 02' } }
    const start: SessionEvent = { seq: SessionSeq(0), time: 0, type: 'tool/ptc-dispatch-start', data: call }
    const end: SessionEvent = { seq: SessionSeq(1), time: 1, type: 'tool/ptc-dispatch', data: {
      ...call, isError: false, content: [{ type: 'text', text: JSON.stringify(document) }],
    } }
    const state = foldSources(foldSources({ pending: [], settled: [] }, start, limits), end, limits)
    expect(buildAnswer({ ...request, sourceCallId: subCallId }, state, limits).rows).toEqual([['SN 001 02', 0], ['SN 001 03', null]])
    expect(state.pending).toEqual([])
  })

  it('removes tool and projection registrations when the plugin unloads', async () => {
    const ctx = new Context()
    try {
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(SessionProjectionRegistry)
      const fiber = ctx.plugin(InteractiveAnswerPlugin, InteractiveAnswerPlugin.Config({ sourceTools: ['query'] }))
      await fiber
      const session = Session.create(SessionId('interactive-disposal'))
      expect(ctx.sessionProjections.stateOf(session, 'interactiveAnswerSources')).toEqual({ pending: [], settled: [] })
      expect(ctx.tools.schemas().some(tool => tool.name === 'interactive_answer')).toBe(true)
      await fiber.dispose()
      expect(ctx.tools.schemas().some(tool => tool.name === 'interactive_answer')).toBe(false)
      expect(ctx.sessionProjections.stateOf(session, 'interactiveAnswerSources')).toBeUndefined()
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('fails configuration when no approved source is declared', () => {
    expect(() => InteractiveAnswerPlugin.Config({ sourceTools: [] })).toThrow()
    expect(() => InteractiveAnswerPlugin.Config({ sourceTools: ['query'], maxRows: 0 })).toThrow()
    expect(InteractiveAnswerPlugin.Config({ sourceTools: ['query'], maxRows: 3 }).maxRows).toBe(3)
  })
})
