'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import styles from './LkLoginForm.module.css'

type Mode = 'editor' | 'agency'

function Form() {
  const [mode, setMode] = useState<Mode>('editor')
  const [login, setLogin] = useState('')
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
        body: JSON.stringify(mode === 'agency' ? { login, password } : { password }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось войти')
      }
      const body = (await response.json().catch(() => ({}))) as { home?: string }
      // Кабинет рендерится на сервере, поэтому нужен полный переход, а не push.
      window.location.href = next && next.startsWith('/lk') ? next : (body.home ?? '/lk/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.modes} role="group" aria-label="Кто входит">
        <button
          type="button"
          className={mode === 'editor' ? styles.modeOn : styles.mode}
          onClick={() => setMode('editor')}
        >
          Редакция
        </button>
        <button
          type="button"
          className={mode === 'agency' ? styles.modeOn : styles.mode}
          onClick={() => setMode('agency')}
        >
          Агентство
        </button>
      </div>

      {mode === 'agency' && (
        <label className={styles.field}>
          <span className={styles.label}>Логин агентства</span>
          <input
            type="text"
            name="login"
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </label>
      )}

      <label className={styles.field}>
        <span className={styles.label}>{mode === 'agency' ? 'Пароль' : 'Пароль редакции'}</span>
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

      <button
        type="submit"
        className={styles.submit}
        disabled={sending || !password || (mode === 'agency' && !login)}
      >
        {sending ? 'Проверяем…' : 'Войти'}
      </button>

      <p className={styles.note}>
        Сессия живёт двенадцать часов. Учётную запись агентства заводит редакция —
        регистрации нет: доступ входит в подписку.
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
