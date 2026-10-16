/** Interactive source records with accessible chart and table alternatives. */
import { useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { Answer } from './model.ts'
import { evidenceContext, followupText, orderedRows } from './model.ts'
import type {} from './index.ts'
import css from './AnswerCard.module.css'

/** Session-bound callback supplied by the slot registration. */
export interface AnswerInjected {
  send: (text: string) => Promise<void>
}

type Props = PropsRuntime<'conversation.chat.node', 'interactive-answer'> & PropsLocale<'interactiveAnswer'> & InjectFace<AnswerInjected>
type Labels = PropsLocale<'interactiveAnswer'>['t']

function formatCell(value: string | number | boolean | null | undefined, t: Labels): string {
  return value == null ? t('missing') : String(value)
}

function Trend({ answer, t }: { answer: Answer; t: Labels }) {
  const values = answer.rows.map(row => row[answer.valueColumn]).filter((value): value is number => typeof value === 'number')
  if (values.length === 0) return null
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const scale = Math.max(Math.abs(low), Math.abs(high))
  const points = answer.rows.map((row, index) => {
    const value = row[answer.valueColumn]
    return typeof value === 'number' ? {
      x: 30 + 540 * index / Math.max(1, answer.rows.length - 1),
      y: high === low ? 100 : 175 - 150 * (value / scale - low / scale) / (high / scale - low / scale), value,
    } : null
  })
  return <figure className={css.chart}>
    <figcaption>{answer.columns[answer.valueColumn]?.title} {answer.unit}</figcaption>
    <p className={css.facts}>{t('trendOrder')}</p>
    <svg viewBox="0 0 600 200" role="img" aria-label={t('chart')}>
      <text x="0" y="20">{high}</text><text x="0" y="195">{low}</text>
      {points.map((point, index) => {
        if (point === null) return null
        const previous = points[index - 1]
        return <g key={index}>
          {previous != null && <line x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} />}
          <circle cx={point.x} cy={point.y} r="4"><title>{formatCell(answer.rows[index]?.[answer.labelColumn], t)}: {point.value} {answer.unit}</title></circle>
        </g>
      })}
    </svg>
    <div className={css.axis}>
      <span>{formatCell(answer.rows[0]?.[answer.labelColumn], t)}</span>
      <span>{formatCell(answer.rows.at(-1)?.[answer.labelColumn], t)}</span>
    </div>
  </figure>
}

function Pareto({ answer, t }: { answer: Answer; t: Labels }) {
  const order = orderedRows(answer)
  const values = order.map(({ row }) => row[answer.valueColumn])
  const numbers = values.filter((value): value is number => typeof value === 'number')
  const maximum = Math.max(0, ...numbers)
  const total = maximum > 0 ? numbers.reduce((sum, value) => sum + value / maximum, 0) : 0
  let accumulated = 0
  return <figure className={css.chart}>
    <figcaption>{answer.columns[answer.valueColumn]?.title} {answer.unit}</figcaption>
    <ol className={css.bars}>{order.map(({ index, row }) => {
      const value = row[answer.valueColumn]
      if (typeof value === 'number' && maximum > 0) accumulated += value / maximum
      const percent = typeof value === 'number' && total > 0 ? `${(accumulated / total * 100).toFixed(1)}%` : t('missing')
      return <li key={index}>
        <span>{formatCell(row[answer.labelColumn], t)}</span>
        <span className={css.bar}><span style={{ width: `${typeof value === 'number' && maximum > 0 ? value / maximum * 100 : 0}%` }} /></span>
        <span>{formatCell(value, t)} {answer.unit}</span><span>{t('cumulative')}: {percent}</span>
      </li>
    })}</ol>
  </figure>
}

/** Render a validated answer with local selection and an explicit follow-up action. */
export function AnswerContent({ answer, send, t }: { answer: Answer; send: AnswerInjected['send']; t: Labels }) {
  const [filter, setFilter] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const order = orderedRows(answer).filter(({ row }) => row.some(value =>
    value !== null && String(value).toLocaleLowerCase().includes(filter.toLocaleLowerCase())))
  const analyze = async (index: number) => {
    if (sending) return
    setSending(true)
    setFailed(false)
    try {
      await send(followupText(answer, index, {
        instruction: t('instruction'), source: t('source'), originalRow: t('originalRow'),
        query: t('query'), coverage: t('coverage'), unit: t('unit'),
      }))
    } catch (_error) {
      // Admission errors remain visible beside the retained selection.
      setFailed(true)
    } finally {
      setSending(false)
    }
  }
  return <section className={css.card} aria-label={answer.title}>
    <h3>{answer.title}</h3>
    <p className={css.facts}>{t('source')}: {answer.source.name} · {t('rows')}: {answer.rows.length} · {t('sourceEvent')}: {answer.source.seq}</p>
    <p className={css.facts}>{t('incomplete')}</p>
    <details><summary>{t('coverage')}</summary><pre>{JSON.stringify(evidenceContext(answer), null, 2)}</pre></details>
    {answer.kind === 'trend' && <Trend answer={answer} t={t} />}
    {answer.kind === 'pareto' && <Pareto answer={answer} t={t} />}
    {answer.kind === 'timeline' && <p>{t('order')}</p>}
    <Input value={filter} onChange={(event) => { setFilter(event.target.value) }} aria-label={t('filter')} placeholder={t('filter')} />
    <div className={css.scroll} tabIndex={0} role="region" aria-label={answer.title}>
      {answer.kind === 'timeline' ? <ol className={css.timeline}>{order.map(({ index, row }) => <li key={index}>
        <strong>{formatCell(row[answer.labelColumn], t)}</strong>
        <dl>{answer.columns.map((column, columnIndex) => columnIndex === answer.labelColumn ? null : <div key={columnIndex}>
          <dt>{column.title}</dt><dd>{formatCell(row[columnIndex], t)}</dd>
        </div>)}</dl>
        <Button size="sm" variant="outline" disabled={sending} onClick={() => void analyze(index)}>{t('analyze')}</Button>
      </li>)}</ol> : <table><caption>{answer.title}{answer.unit === '' ? '' : ` (${answer.unit})`}</caption>
        <thead><tr>{answer.columns.map((column, index) => <th key={index} scope="col">{column.title}</th>)}<th scope="col">{t('analyze')}</th></tr></thead>
        <tbody>{order.map(({ index, row }) => <tr key={index}>
          {answer.columns.map((_column, columnIndex) => <td key={columnIndex}>{formatCell(row[columnIndex], t)}</td>)}
          <td><Button size="sm" variant="outline" disabled={sending} onClick={() => void analyze(index)}>{t('analyze')}</Button></td>
        </tr>)}</tbody>
      </table>}
      {order.length === 0 && <p>{t('empty')}</p>}
    </div>
    {failed && <p role="alert">{t('failed')}</p>}
    <details><summary>{t('evidence')}</summary><pre>{JSON.stringify(answer.source, null, 2)}</pre></details>
  </section>
}

/**
 * Render a validated answer outside collapsible tool activity.
 * @param props - conversation node, dictionary, and session-bound sender.
 * @returns the interactive answer.
 */
export function AnswerCard({ node, send, t }: Props) {
  return <AnswerContent key={node.id} answer={node.data.answer} send={send} t={t} />
}
