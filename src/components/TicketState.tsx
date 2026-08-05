'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { TICKET_STATE_LABEL, type TicketKind, type TicketState } from '@/lib/ticket-types'

import styles from './TicketState.module.css'

/**
 * Переключатель состояния тикета.
 *
 * Состояние не редактируется на месте, а дописывается событием: реестр
 * append-only, и история «кто когда перевёл запрос в работу» нужна ровно тем же
 * §11.3, что и сам срок. Поэтому кнопки только добавляют запись, а страница
 * перечитывает свёртку.
 */

const NEXT: Record<TicketState, TicketState[]> = {
  open: ['in_work', 'done', 'rejected'],
  in_work: ['done', 'rejected'],
  done: ['in_work'],
  rejected: ['in_work'],
}

export function TicketStateSwitch({
  ticket,
  kind,
  state,
}: {
  ticket: string
  kind: TicketKind
  state: TicketState
}) {
  const [busy, setBusy] = useState<TicketState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function move(next: TicketState) {
    setBusy(next)
    setError(null)
    try {
      const response = await fetch('/api/lk/tiket/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket, kind, state: next }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось сохранить')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        {NEXT[state].map((next) => (
          <button
            key={next}
            type="button"
            className={styles.button}
            disabled={busy !== null}
            onClick={() => move(next)}
          >
            {busy === next ? '…' : TICKET_STATE_LABEL[next]}
          </button>
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
