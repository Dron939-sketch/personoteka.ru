import 'server-only'

import nodemailer from 'nodemailer'

/**
 * Уведомления редакции о новых обращениях.
 *
 * Реестр на диске гарантирует, что заявка не потеряется. Но лежащая в файле
 * заявка — это ещё не полученная заявка: кто-то должен узнать о ней, не заходя
 * в кабинет. Для §11.3 это прямое требование — ответственный за обработку ПДн
 * уведомляется о запросе, а не обнаруживает его при следующем визите.
 *
 * Письмо отправляется ПОСЛЕ записи в реестр и не влияет на ответ формы: если
 * почта не настроена или сервер молчит, обращение всё равно принято и лежит на
 * диске. Обратный порядок означал бы отказ человеку из-за нашей почты.
 *
 * Настройки — переменные окружения. Без `SMTP_HOST` отправка пропускается
 * (как и проверка капчи на стенде), но в лог пишется предупреждение: молчащая
 * почта на проде должна быть заметна.
 */

/** Куда уходят уведомления. Это внутренний адрес, публичный — `SITE.email`. */
export function notifyAddress(): string {
  return process.env.NOTIFY_EMAIL ?? 'dron939@yandex.ru'
}

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

function transport() {
  const port = Number(process.env.SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 — SSL с первого байта, 587 — STARTTLS. Яндекс отдаёт оба, но молча
    // подключаться не тем способом нельзя: сервер просто закроет соединение.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  })
}

export async function notify(subject: string, lines: string[]): Promise<void> {
  if (!mailConfigured()) {
    console.warn('[mail] SMTP не настроен, письмо не отправлено:', subject)
    return
  }

  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to: notifyAddress(),
      subject,
      text: lines.join('\n'),
    })
  } catch (error) {
    // Обращение уже в реестре — падать здесь нечему, но знать об этом надо.
    console.error('[mail] не отправлено', subject, error)
  }
}
