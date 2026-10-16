/** Standalone conversation answers derive from successful native or nested tool results. */
import type { SessionEventLike } from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-tools/types'
import type { ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { Answer } from './model.ts'
import { readAnswer } from './model.ts'

declare module '@deepseek-ai/dsh-client-ui-chat/client' {
  interface ChatNodeDataMap {
    /** Source-backed answer displayed outside the collapsible tool process. */
    'interactive-answer': { answer: Answer }
  }
}

function answerOf(event: SessionEventLike): Answer | null {
  if (event.type === 'tool/result') return readAnswer({
    content: event.data.message.content, isError: event.data.message.isError === true, meta: event.data.meta,
  })
  if (event.type === 'tool/ptc-dispatch' && event.data.name === 'interactive_answer') return readAnswer({
    content: event.data.content, isError: event.data.isError,
  })
  return null
}

/** Definition kept separate from the renderer so replay never depends on mounted UI state. */
export const answerDefinition: ConversationNodeDefinition<Answer> = {
  kind: 'interactive-answer', target: 'chat',
  match(event) {
    if (event.type !== 'tool/result' && event.type !== 'tool/ptc-dispatch') return null
    if (answerOf(event) === null) return null
    return { id: event.type === 'tool/result' ? event.data.message.toolCallId : event.data.subCallId, role: 'start' }
  },
  start(_context, match) {
    const answer = answerOf(match.event)
    if (answer === null) throw new Error('Interactive answer requires a validated result')
    return answer
  },
  update(context) { return context.state },
  buildViewNode(context) {
    if (context.state === undefined || context.start === undefined) return null
    return {
      key: context.key, kind: 'interactive-answer', id: context.id, target: 'chat',
      anchorSeq: context.start.event.seq, location: context.start.location, visibility: 'visible',
      groupTree: 'turn',
      data: { answer: context.state },
    }
  },
}
