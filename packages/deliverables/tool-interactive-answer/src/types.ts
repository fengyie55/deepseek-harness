/** Recorded evidence and display selections for interactive answers. */
import type { ToolCallId } from '@deepseek-ai/dsh-llm/brand'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'

/** One bounded, successful JSON result available to the calling session. */
export interface AnswerSource {
  callId: ToolCallId
  name: string
  seq: number
  arguments: JsonValue
  document: JsonValue
}

/** Pending calls and settled JSON evidence retained by the host projection. */
export interface AnswerSources {
  pending: { callId: ToolCallId; name: string; arguments: JsonValue }[]
  settled: AnswerSource[]
}

/** One source field selected for display, without changing its value. */
export interface AnswerColumn {
  title: string
  path: string[]
}

/** Replayable answer stored as ordinary tool result data. */
export interface InteractiveAnswer {
  format: 'interactive-answer'
  version: 1
  title: string
  kind: 'table' | 'trend' | 'pareto' | 'timeline'
  columns: AnswerColumn[]
  rows: (string | number | boolean | null)[][]
  labelColumn: number
  valueColumn: number
  unit: string
  source: AnswerSource
  rowsPath: string[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionStateMap {
    /** Bounded JSON evidence from this session's successful tool calls. */
    interactiveAnswerSources: AnswerSources
  }
}
