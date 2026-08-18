'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import styles from './AgencyAccountForm.module.css'

/**
 * Заведение учётной записи агентства из кабинета редакции.
 *
 * Дублирует CLI `npm run agentstvo` для окружений без консоли (хостинг).
 * Повторная отправка с тем же логином и новым паролем меняет пароль —
 * восстановления нет, редакция просто задаёт новый.
 */
export function AgencyAccountForm() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'sending'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setMessage(null)
    setError(null)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      const response = await fetch('/api/lk/agentstva/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = (await response.json().catch(() => ({}))) as {
        error?: string
        slug?: string
        note?: string
      }
      if (!response.ok) throw new Error(body.error ?? 'Не получилось сохранить')
      setMessage(body.note ?? `Готово: агентство «${String(data.name || data.login)}» может входить в кабинет`)
      form.reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось сохранить')
    } finally {
      setState('idle')
    }
  }

  return (
    <form className={`${styles.form} ym-hide-content`} onSubmit={onSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Название агентства</span>
          <input name="name" maxLength={120} placeholder="ООО «Пример»" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Логин</span>
          <input
            name="login"
            required
            maxLength={40}
            pattern="[A-Za-z0-9._\-]{3,40}"
            placeholder="primer"
            autoComplete="off"
          />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Пароль — не короче 10 знаков</span>
          <input name="password" type="text" required minLength={10} maxLength={120} autoComplete="off" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Биографий в месяц</span>
          <input name="limit" type="number" min={1} max={100} defaultValue={10} />
        </label>
      </div>

      <p className={styles.hint}>
        Повторная отправка с тем же логином и новым паролем меняет пароль. Название и лимит
        при этом не трогаются.
      </p>

      {message && (
        <p className={styles.done} role="status">
          {message}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={state === 'sending'}>
        {state === 'sending' ? 'Сохраняем…' : 'Завести доступ'}
      </button>
    </form>
  )
}
