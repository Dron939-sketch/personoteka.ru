'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import styles from './LkLoginForm.module.css'

function Form() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const next = useSearchParams().get('dalee')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      const response = await fetch('/api/lk/vhod/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось войти')
      }
      // Кабинет рендерится на сервере, поэтому нужен полный переход, а не push.
      window.location.href = next && next.startsWith('/lk') ? next : '/lk/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>Пароль редакции</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={sending || !password}>
        {sending ? 'Проверяем…' : 'Войти'}
      </button>

      <p className={styles.note}>
        Сессия живёт двенадцать часов. Общий пароль — временное решение: роли
        владельца профиля, агентства и редактора появятся вместе с базой
        пользователей.
      </p>
    </form>
  )
}

export function LkLoginForm() {
  // useSearchParams требует границы Suspense при статическом рендере.
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  )
}
