/** Labels owned by the interactive-answer client plugin. */
export const zh = {
  filter: '筛选记录', analyze: '继续分析',
  instruction: '请根据下面选中的原始记录继续分析，保留完整标识、数据来源、时间范围、单位、缺失值和覆盖告警；需要更多数据时重新查询，不要把当前片段当作完整总体。',
  source: '数据来源', evidence: '原始查询与结果', rows: '返回记录数',
  missing: '缺失', empty: '没有匹配的记录', pending: '正在生成展示',
  fallback: '查看工具结果', failed: '发送失败，请重试',
  order: '按源数据顺序展示', chart: '图表', cumulative: '累计占比',
  sourceEvent: '来源事件序号', incomplete: '数据覆盖、口径和告警以原始查询结果为准',
  coverage: '查询状态与覆盖告警',
  trendOrder: '按观测顺序排列，间距不代表经过的时长',
  originalRow: '来源记录序号', query: '原始查询参数', unit: '单位',
} as const

/** Locale key union for the registered dictionary. */
export type AnswerKey = keyof typeof zh

/** English labels matching the Chinese dictionary. */
export const en: Record<AnswerKey, string> = {
  filter: 'Filter records', analyze: 'Analyze selection',
  instruction: 'Analyze the selected original record below. Preserve complete identifiers, sources, time ranges, units, missing values, and coverage warnings. Query again when more evidence is needed; this excerpt is not the complete population.',
  source: 'Source', evidence: 'Original query and result', rows: 'Returned rows',
  missing: 'Missing', empty: 'No matching records', pending: 'Preparing display',
  fallback: 'View tool result', failed: 'Could not send. Try again.',
  order: 'Displayed in source order', chart: 'Chart', cumulative: 'Cumulative share',
  sourceEvent: 'Source event', incomplete: 'See the original result for coverage, definitions, and warnings',
  coverage: 'Query status and coverage warnings',
  trendOrder: 'Observation order; spacing does not represent elapsed time',
  originalRow: 'Original record number', query: 'Original query arguments', unit: 'Unit',
}
