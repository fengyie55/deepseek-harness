/** Live append and history replay produce the same independently rendered answer. */
import { describe, expect, it } from 'vitest'
import { ConversationNodeAssembler } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionEventLikeEntry } from '@deepseek-ai/dsh-api-session-controller/client'
import { chatViewDefinition } from '../../ui-chat/src/client/conversation-nodes/chat-snapshot-builder.ts'
import { createToolResultMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionSeq } from '@deepseek-ai/dsh-session'
import { answerDefinition } from '../src/client/definition.ts'

const value = {
  format: 'interactive-answer', version: 1, title: 'Evidence', kind: 'table',
  columns: [{ title: 'SN', path: ['sn'] }], rows: [['SN 001 02']],
  labelColumn: 0, valueColumn: 0, unit: '', rowsPath: ['rows'],
  source: { callId: 'query', name: 'query', seq: 0, arguments: {}, document: { rows: [{ sn: 'SN 001 02' }] } },
}

function result(document: unknown = value): SessionEventLikeEntry {
  const callId = ToolCallId('display')
  return { type: 'event', event: {
    type: 'tool/result', seq: SessionSeq(3), time: 0, surfaceOp: 'append', sourceEventSeqs: [SessionSeq(2)],
    data: { turn: 1, step: 1, message: createToolResultMessage({
      callId, isError: false, content: [{ type: 'text', text: JSON.stringify(document) }],
    }) },
  } }
}

function assembler(events: readonly SessionEventLikeEntry[]) {
  const value = new ConversationNodeAssembler(
    { entries: () => [answerDefinition], fallbackEntry: () => undefined },
    { entries: () => [chatViewDefinition] },
  )
  value.replaceWindow(events, false)
  value.activateTarget('chat')
  return value
}

describe('interactive answer conversation definition', () => {
  it('keeps the same visible result through live append, reload, and unrecognized metadata', () => {
    const event = result()
    const prefix: SessionEventLikeEntry[] = [
      { type: 'event', event: { type: 'turn/start', seq: SessionSeq(0), time: 0, data: { turn: 1 } } },
      { type: 'event', event: { type: 'step/start', seq: SessionSeq(1), time: 0, data: { turn: 1, step: 1 } } },
      { type: 'event', event: { type: 'tool/call', seq: SessionSeq(2), time: 0,
        data: { turn: 1, step: 1, callId: ToolCallId('display'), name: 'interactive_answer', arguments: '{}' } } },
    ]
    const live = assembler(prefix)
    live.append(event)
    live.flush()
    const replay = assembler([...prefix, event])
    const liveView = live.get('chat')
    const replayView = replay.get('chat')
    expect(liveView?.order).toHaveLength(1)
    expect(replayView?.order).toEqual(liveView?.order)
    const key = liveView?.order[0]
    if (key === undefined) throw new Error('missing answer node')
    expect(liveView?.nodes.get(key)).toMatchObject({
      kind: 'interactive-answer', visibility: 'visible', processGroup: 'independent', data: { answer: value },
    })
    expect(replayView?.nodes.get(key)).toMatchObject({
      key, kind: 'interactive-answer', anchorSeq: 3, processGroup: 'independent', data: liveView?.nodes.get(key)?.data,
      location: { kind: 'step', turn: { turn: 1 }, step: { step: 1 } },
    })
    expect(assembler([result({ ...value, version: 2 })]).get('chat')?.order).toEqual([])
  })
})
