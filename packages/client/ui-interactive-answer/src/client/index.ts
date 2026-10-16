/** Registers source-backed interactive tool cards and locale dictionaries. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { AnswerCard } from './AnswerCard.tsx'
import type { AnswerInjected } from './AnswerCard.tsx'
import { en, zh } from './locales.ts'
import { answerDefinition } from './definition.ts'
import type { AnswerKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Interactive evidence cards and follow-up actions. */
    interactiveAnswer: AnswerKey
  }
}

/** Services used by card registration and session-specific input. */
export const inject = ['slots', 'locale', 'sessions', 'conversation', 'uiConversation']

/**
 * Mount dictionaries and the keyed tool card with reversible registrations.
 * @param ctx - client services.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('interactiveAnswer', { zh, en }))
  ctx.uiConversation.events.register(answerDefinition)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node', key: 'interactive-answer', locale: 'interactiveAnswer',
    inject: (sessionId): AnswerInjected => ({
      send: async (text) => {
        const scope = ctx.sessions.scope(sessionId)
        if (scope === undefined) throw new Error('Interactive answer session is no longer open')
        const conversation = scope.get('conversation')
        if (conversation === undefined) throw new Error('Interactive answer conversation is unavailable')
        await conversation.send(text)
      },
    }),
  }, AnswerCard))
}
