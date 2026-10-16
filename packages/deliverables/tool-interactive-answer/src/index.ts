/** Source-backed tables, charts, and timelines registered as an opt-in tool. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { buildAnswer, foldSources, sourcesSchema } from './evidence.ts'
import type { Limits } from './evidence.ts'
import type {} from '@deepseek-ai/dsh-session-projection'
export type * from './types.ts'

/** Tool and evidence-retention limits, configurable per profile. */
export interface Config extends Limits {}

/** Positive bounds reject invalid configuration at activation. */
export const Config: z<Partial<Config> & Pick<Config, 'sourceTools'>, Config> = z.object({
  sourceTools: z.array(z.string()).min(1).required(),
  maxSources: z.natural().min(1).default(8),
  maxSourceBytes: z.natural().min(1).default(65536),
  maxRows: z.natural().min(1).default(200),
  maxColumns: z.natural().min(1).default(12),
  maxResultBytes: z.natural().min(1).default(262144),
})

/** Cordis plugin identity. */
export const name = 'tool-interactive-answer'
/** Required source projection and tool registries. */
export const inject = ['tools', 'sessionProjections']

/**
 * Register bounded source retention and the interactive_answer tool.
 * @param ctx - host registries.
 * @param config - validated evidence and output bounds.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.sessionProjections.register({
    key: 'interactiveAnswerSources', stateSchema: sourcesSchema,
    init: () => ({ pending: [], settled: [] }),
    apply: (state, event) => foldSources(state, event, config), stateVersion: 1,
  })
  ctx.tools.register(defineTool({
    name: 'interactive_answer',
    description: 'Show a table, trend, Pareto chart, or trace timeline from an earlier successful JSON tool result in this conversation. Reference its sourceCallId and select exact fields; never supply invented business values. Use rowsPath and column paths as arrays of property names or array indexes. Keep query warnings, nulls, units, and time labels. Charts require numeric values; timeline preserves source order. Re-query if evidence is unavailable or too large.',
    parameters: {
      sourceCallId: { type: 'string', required: true, description: 'Call id of the successful source query in this conversation.' },
      title: { type: 'string', required: true, description: 'Short answer title.' },
      kind: { type: 'string', required: true, enum: ['table', 'trend', 'pareto', 'timeline'] },
      rowsPath: { type: 'array', required: true, items: { type: 'string' }, description: 'Property path from source JSON to its row array; [] selects a root array.' },
      columns: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
        title: { type: 'string', required: true },
        path: { type: 'array', required: true, items: { type: 'string' }, description: 'Property path from one row to a scalar; [] selects a scalar row.' },
      } } },
      labelColumn: { type: 'integer', required: true, description: 'Zero-based label or time column index.' },
      valueColumn: { type: 'integer', required: true, description: 'Zero-based numeric value column index; use 0 for tables/timelines without measurements.' },
      unit: { type: 'string', required: true, description: 'Unit from the source or metric definition; empty when absent. No unit conversion is performed.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      presentationMeta: (_args, value) => value,
    },
    execute(args, exec) {
      if (exec.agent === undefined) throw new Error('interactive_answer requires an owning agent session')
      exec.signal.throwIfAborted()
      const sources = ctx.sessionProjections.stateOf(exec.agent.session, 'interactiveAnswerSources')
      if (sources === undefined) throw new Error('Interactive answer source projection is unavailable')
      const answer = buildAnswer(args, sources, config)
      return Promise.resolve({ ...answer, columns: answer.columns.map(column => ({ ...column })), source: { ...answer.source } })
    },
  }))
}
