'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CONSENT_VERSION } from '@/lib/consent'
import { METRIKA_ID } from '@/lib/site'

import styles from './LeadForm.module.css'

type State = 'idle' | 'sending' | 'sent' | 'error'

/**
 * «Прислать разбор на почту» под результатом проверки цифрового следа.
 *
 * По желанию: проверка работает без почты, и это остаётся правдой. Кто
 * хочет получить разбор письмом — оставляет адрес; сервер (/api/razbor)
 * шлёт письмо человеку и кладёт запрос в реестр редакции.
 */
function leadSource(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    out.page = window.location.href.slice(0, 500)
    out.referrer = document.referrer.slice(0, 500)
    const raw = window.localStorage.getItem('pt_first_touch')
    if (raw) {
      const first = JSON.parse(raw) as { url?: string; referrer?: string; ts?: number }
      if (first.url) out.first_url = String(first.url).slice(0, 500)
      if (first.referrer) out.first_referrer = String(first.referrer).slice(0, 500)
      if (first.ts) out.first_at = new Date(first.ts).toISOString()
    }
  } catch {
    /* хранилище недоступно */
  }
  return out
}

export function RazborForm({ answers }: { answers: Record<string, string> }) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [openedAt] = useState(() => Date.now())

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setError(null)
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())
    try {
      const response = await fetch('/api/razbor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          answers,
          consent_version: CONSENT_VERSION,
          source: leadSource(),
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось отправить')
      }
      setState('sent')
      try {
        const ym = (window as unknown as { ym?: (id: number, m: string, g: string) => void }).ym
        if (ym && METRIKA_ID > 0) ym(METRIKA_ID, 'reachGoal', 'razbor_email')
      } catch {
        /* Метрика не должна ломать форму */
      }
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Не удалось отправить')
    }
  }

  if (state === 'sent') {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Отправили</p>
        <p>Разбор уйдёт на почту в течение нескольких минут. Если не пришёл — проверьте «Спам».</p>
      </div>
    )
  }

  return (
    <form className={`${styles.form} ym-hide-content`} onSubmit={onSubmit}>
      <h3 className={styles.title}>Прислать этот разбор на почту</h3>
      <p className={styles.note}>
        По желанию: проверка работает и без этого. Письмо одно, с разбором по звеньям и тем, что
        можно сделать самому. Рассылок нет.
      </p>
      <label className={styles.field}>
        <span className={styles.label}>Имя</span>
        <input name="name" autoComplete="name" maxLength={120} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>
          Электронная почта <span aria-hidden="true">*</span>
        </span>
        <input name="email" type="email" required autoComplete="email" maxLength={160} />
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" name="consent_processing" value="1" required />
        <span>
          Даю согласие на обработку персональных данных в соответствии с{' '}
          <Link href="/politika-konfidencialnosti/">политикой обработки ПДн</Link>.
        </span>
      </label>
      <input
        className={styles.trap}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
      />
      <input type="hidden" name="form_opened_at" value={openedAt} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={state === 'sending'}>
        {state === 'sending' ? 'Отправляем…' : 'Прислать разбор'}
      </button>
    </form>
  )
}
