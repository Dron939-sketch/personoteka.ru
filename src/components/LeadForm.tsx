'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CONSENT_VERSION } from '@/lib/consent'

import styles from './LeadForm.module.css'

type State = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Форма заявки (§8.4) и форма запроса на удаление/исправление данных (§11.3).
 *
 * Юридический минимум (§11.1): два РАЗНЫХ согласия — на обработку ПДн и на их
 * распространение (ст. 10.1 152-ФЗ). Оба обязательны, оба фиксируются в журнале
 * вместе с версией текста, датой и IP (это делает серверный обработчик).
 */
export function LeadForm({
  kind = 'lead',
  title,
  submitLabel = 'Отправить заявку',
}: {
  kind?: 'lead' | 'removal'
  title?: string
  submitLabel?: string
}) {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  const isRemoval = kind === 'removal'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setError(null)

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    try {
      const response = await fetch(kind === 'removal' ? '/api/udalenie' : '/api/zayavka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, consent_version: CONSENT_VERSION }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Не удалось отправить форму')
      }
      setState('sent')
      form.reset()
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Не удалось отправить форму')
    }
  }

  if (state === 'sent') {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Заявка принята</p>
        <p>
          {isRemoval
            ? 'Мы подтвердим получение в течение 3 рабочих дней и сообщим решение в течение 10 рабочих дней.'
            : 'Редактор свяжется с вами в течение рабочего дня, чтобы уточнить детали и прислать договор.'}
        </p>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
      {title && <h2 className={styles.title}>{title}</h2>}

      <label className={styles.field}>
        <span className={styles.label}>
          Имя и фамилия <span aria-hidden="true">*</span>
        </span>
        <input name="name" required autoComplete="name" maxLength={120} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>
          Электронная почта <span aria-hidden="true">*</span>
        </span>
        <input name="email" type="email" required autoComplete="email" maxLength={160} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Телефон или мессенджер</span>
        <input name="contact" autoComplete="tel" maxLength={120} />
      </label>

      {isRemoval ? (
        <>
          <label className={styles.field}>
            <span className={styles.label}>
              Ссылка на страницу <span aria-hidden="true">*</span>
            </span>
            <input name="page_url" required placeholder="https://personoteka.ru/…" maxLength={300} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Что требуется исправить или удалить <span aria-hidden="true">*</span>
            </span>
            <textarea name="message" required rows={5} maxLength={2000} />
          </label>
        </>
      ) : (
        <>
          <label className={styles.field}>
            <span className={styles.label}>
              Сфера деятельности <span aria-hidden="true">*</span>
            </span>
            <input name="sphere" required maxLength={120} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Коротко о себе</span>
            <textarea name="message" rows={5} maxLength={2000} />
          </label>
        </>
      )}

      <fieldset className={styles.consents}>
        <legend className={styles.label}>Согласия</legend>

        <label className={styles.checkbox}>
          <input type="checkbox" name="consent_processing" value="1" required />
          <span>
            Даю согласие на обработку персональных данных в соответствии с{' '}
            <Link href="/politika-konfidencialnosti/">политикой обработки ПДн</Link>.
          </span>
        </label>

        {!isRemoval && (
          <label className={styles.checkbox}>
            <input type="checkbox" name="consent_distribution" value="1" required />
            <span>
              Даю отдельное согласие на <strong>распространение</strong> персональных данных —
              публикацию биографии на сайте в открытом доступе (ст. 10.1 152-ФЗ).
            </span>
          </label>
        )}

        <p className={styles.note}>
          Версия текста согласия: <span className="tabular">{CONSENT_VERSION}</span>. Дата, IP и
          версия фиксируются в журнале согласий. Согласие можно отозвать — через{' '}
          <Link href="/udalenie-dannyh/">форму отзыва и удаления данных</Link>.
        </p>
      </fieldset>

      {/* Капча (Yandex SmartCaptcha, §9.4) подключается здесь: виджет отдаёт токен
          в скрытое поле, серверный обработчик проверяет его до записи заявки. */}
      <input type="hidden" name="captcha_token" value="" />

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={state === 'sending'}>
        {state === 'sending' ? 'Отправляем…' : submitLabel}
      </button>
    </form>
  )
}
