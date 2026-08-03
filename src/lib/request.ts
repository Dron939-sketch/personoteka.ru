import 'server-only'

/** Общая обвязка обработчиков форм: IP, ограничение частоты, капча (§9.4). */

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS = 5

/**
 * Ограничение частоты в памяти процесса. Этого достаточно против случайного
 * дребезга формы, но НЕ против распределённого перебора: на нескольких инстансах
 * счётчики не общие.
 *
 * TODO(этап 4): перенести в Redis вместе с подключением капчи.
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

/**
 * Проверка токена Yandex SmartCaptcha (§9.4).
 *
 * Пока секрет не задан, проверка пропускается — иначе формы нельзя было бы
 * протестировать на стенде. На проде отсутствие `SMARTCAPTCHA_SERVER_KEY`
 * означает открытую форму, поэтому переменная обязательна в чек-листе запуска.
 */
export async function verifyCaptcha(token: string | undefined): Promise<boolean> {
  const secret = process.env.SMARTCAPTCHA_SERVER_KEY
  if (!secret) return true
  if (!token) return false

  try {
    const response = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, token }),
    })
    if (!response.ok) return false
    const result = (await response.json()) as { status?: string }
    return result.status === 'ok'
  } catch {
    // Недоступность сервиса капчи не должна открывать форму нараспашку.
    return false
  }
}
