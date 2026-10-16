// @vitest-environment jsdom
/** Record selection preserves source indexes through sorting, filtering, and retries. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { AnswerContent } from '../src/client/AnswerCard.tsx'
import { en } from '../src/client/locales.ts'
import { followupText, readAnswer, orderedRows } from '../src/client/model.ts'
import type { Answer } from '../src/client/model.ts'

afterEach(cleanup)
const t = makeTranslate(en)
const labels = {
  instruction: en.instruction, source: en.source, originalRow: en.originalRow, query: en.query, coverage: en.coverage, unit: en.unit,
}
const answer: Answer = {
  format: 'interactive-answer', version: 1, title: 'Observed records', kind: 'table',
  columns: [{ title: 'SN', path: ['sn'] }, { title: 'Value', path: ['value'] }],
  rows: [['SN 001 02', 0], ['SN 001 03', 2], ['SN 001 04', null]],
  labelColumn: 0, valueColumn: 1, unit: 's', rowsPath: ['data', 'rows'],
  source: { callId: 'source-1', name: 'governed_query', seq: 0, arguments: { sn: 'SN 001 02' },
    document: { coverage: { complete: false }, warnings: ['partial coverage'] } },
}

function block(value: unknown = answer): ToolResultNode {
  return {
    kind: 'tool-result', seq: 2, time: 0, callTime: 0, callId: 'display-1', name: 'interactive_answer',
    args: PartialArguments.fromText('{}'), call: { name: 'interactive_answer', argsRaw: '{}' },
    content: [{ type: 'text', text: JSON.stringify(value) }], isError: false, subCalls: [],
  }
}

describe('interactive answer cards', () => {
  it('renders null distinctly from zero and sends the original filtered row', async () => {
    const send = vi.fn(async (_text: string) => {})
    const view = render(<AnswerContent answer={answer} send={send} t={t} />)
    expect(view.getByText('0')).toBeTruthy()
    expect(view.getByText('Missing')).toBeTruthy()
    fireEvent.change(view.getByRole('textbox'), { target: { value: 'SN 001 03' } })
    fireEvent.click(view.getByRole('button', { name: 'Analyze selection' }))
    await waitFor(() =>{  expect(send).toHaveBeenCalledOnce() })
    const prompt = send.mock.calls[0]![0]
    expect(prompt).toContain('Original record number: 2')
    expect(prompt).toContain('SN: "SN 001 03"')
    expect(prompt).toContain('Value: 2')
    expect(prompt).toContain('governed_query (source-1)')
    expect(prompt).toContain('Original query arguments: {"sn":"SN 001 02"}')
    expect(prompt).toContain('"coverage":{"complete":false}')
    expect(prompt).toContain('partial coverage')
  })

  it('keeps records visible after admission fails and permits a retry', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(undefined)
    const view = render(<AnswerContent answer={answer} send={send} t={t} />)
    fireEvent.click(view.getAllByRole('button')[0]!)
    await waitFor(() =>{  expect(view.getByRole('alert').textContent).toBe('Could not send. Try again.') })
    expect(view.getByText('SN 001 02')).toBeTruthy()
    fireEvent.click(view.getAllByRole('button')[0]!)
    await waitFor(() =>{  expect(send).toHaveBeenCalledTimes(2) })
    await waitFor(() =>{  expect(view.queryByRole('alert')).toBeNull() })
  })

  it('does not connect trend points across missing values', () => {
    const view = render(<AnswerContent answer={{ ...answer, kind: 'trend', rows: [['a', 1], ['b', null], ['c', -2]] }} send={async () => {}} t={t} />)
    expect(view.container.querySelectorAll('circle')).toHaveLength(2)
    expect(view.container.querySelectorAll('line')).toHaveLength(0)
    expect(view.getByRole('table')).toBeTruthy()
  })

  it('sorts Pareto observations without losing source indexes and shows no fabricated percentage for zero total', () => {
    expect(orderedRows({ ...answer, kind: 'pareto' }).map(item => item.index)).toEqual([1, 0, 2])
    expect(followupText({ ...answer, kind: 'pareto' }, 1, labels)).toContain('SN 001 03')
    const view = render(<AnswerContent answer={{ ...answer, kind: 'pareto', rows: [['a', 0], ['b', null]] }} send={async () => {}} t={t} />)
    expect(view.container.textContent).not.toContain('NaN')
    expect(view.container.textContent).not.toContain('100%')
  })

  it('renders source-ordered timeline entries and preserves changing product identities', () => {
    const view = render(<AnswerContent answer={{ ...answer, kind: 'timeline' }} send={async () => {}} t={t} />)
    expect(view.getAllByRole('listitem')).toHaveLength(3)
    expect(view.getAllByRole('listitem').map(item => item.querySelector('strong')?.textContent)).toEqual(['SN 001 02', 'SN 001 03', 'SN 001 04'])
  })

  it('renders finite geometry and cumulative shares for large finite measurements', () => {
    const trend = render(<AnswerContent answer={{ ...answer, kind: 'trend', rows: [['a', -1e308], ['b', 1e308]] }} send={async () => {}} t={t} />)
    expect([...trend.container.querySelectorAll('circle')].every(point => Number.isFinite(Number(point.getAttribute('cy'))))).toBe(true)
    trend.unmount()
    const pareto = render(<AnswerContent answer={{ ...answer, kind: 'pareto', rows: [['a', 1e308], ['b', 1e308]] }} send={async () => {}} t={t} />)
    expect(pareto.getByText('Cumulative share: 100.0%')).toBeTruthy()
    expect(pareto.container.textContent).not.toContain('NaN')
  })

  it('validates replay and nested-call content and refuses unsupported versions or corrupt cells', () => {
    expect(readAnswer(block())).toEqual(answer)
    expect(readAnswer({ ...block(), meta: { ...answer, source: { ...answer.source } } })).toEqual(answer)
    expect(readAnswer(block({ ...answer, version: 2 }))).toBeNull()
    expect(readAnswer(block({ ...answer, rows: [['incomplete']] }))).toBeNull()
    expect(readAnswer(block({ ...answer, kind: 'trend', rows: [['SN', '3']] }))).toBeNull()
    expect(readAnswer({ ...block(), isError: true })).toBeNull()
  })
})
