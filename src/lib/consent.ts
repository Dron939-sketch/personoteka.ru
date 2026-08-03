/**
 * Журнал согласий — §11.1 ТЗ.
 *
 * Требование закона: фиксируются дата, IP и ВЕРСИЯ ТЕКСТА согласия. Поэтому версия —
 * константа в коде: любая правка формулировки согласия обязана менять её, иначе
 * в журнале останутся записи, ссылающиеся на текст, которого уже нет.
 */

/** Версия текста согласий. Меняется вместе с текстом на /politika-konfidencialnosti/. */
export const CONSENT_VERSION = '2026-08-01'

export type ConsentKind =
  /** Согласие на обработку ПДн. */
  | 'processing'
  /** Отдельное согласие на распространение ПДн — ст. 10.1 152-ФЗ. */
  | 'distribution'

export interface ConsentRecord {
  kind: ConsentKind
  version: string
  /** Момент фиксации согласия, ISO 8601. */
  given_at: string
  ip: string
  user_agent: string
  subject_email: string
  /** Тип формы, в которой дано согласие. */
  source: 'lead' | 'removal'
}

export function buildConsentRecords(input: {
  kinds: ConsentKind[]
  ip: string
  userAgent: string
  email: string
  source: ConsentRecord['source']
  now?: Date
}): ConsentRecord[] {
  const givenAt = (input.now ?? new Date()).toISOString()
  return input.kinds.map((kind) => ({
    kind,
    version: CONSENT_VERSION,
    given_at: givenAt,
    ip: input.ip,
    user_agent: input.userAgent,
    subject_email: input.email,
    source: input.source,
  }))
}

/** Регламент реакции на запрос об удалении/исправлении — §11.3. */
export const REMOVAL_SLA = {
  /** Рабочих дней на подтверждение получения. */
  acknowledge_business_days: 3,
  /** Рабочих дней на мотивированное решение. */
  decide_business_days: 10,
} as const
