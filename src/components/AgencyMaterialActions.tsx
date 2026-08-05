'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import styles from './TicketState.module.css'

/**
 * Снятие агентского материала с публикации и возврат его обратно.
 *
 * Кнопка одна и зависит от текущего состояния: показывать «снять» рядом с уже
 * снятой страницей — способ ошибиться в спешке.
 */
export function AgencyMaterialActions({
  slug,
  published,
}: {
  slug: string
  published: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function move() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/lk/biografiya/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, status: published ? 'hidden' : 'published' }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось сохранить')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.buttons}>
        <button type="button" className={styles.button} disabled={busy} onClick={move}>
          {busy ? '…' : published ? 'снять с публикации' : 'вернуть на сайт'}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
