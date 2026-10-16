/** Deterministic external evidence provider for assembled profile snapshots. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['tools']

/** Register a synthetic query whose null measurement and coverage warning must survive display. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'query_observations', description: 'Read fixture observations for display acceptance.', parameters: {},
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute() {
      const document = { status: 'success', data: { rows: [
        { sn: 'SN 001 02', time: '2026-01-01T08:00:00+08:00', process: 'Molding', value: 0 },
        { sn: 'SN 001 02', time: '2026-01-01T08:10:00+08:00', process: 'Coating', value: null },
      ] }, coverage: { complete: false }, warnings: ['Fixture covers two observed stations only'] }
      return { content: [{ type: 'text', text: JSON.stringify(document) }], isError: false }
    },
  }))
}
