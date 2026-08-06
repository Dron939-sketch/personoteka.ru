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
 * Капча необязательна: пока `SMARTCAPTCHA_SERVER_KEY` не задан, проверка
 * пропускается. Владелец сознательно решил обойтись без неё, чтобы не
 * заставлять человека доказывать, что он человек, ради одной заявки.
 * Форма при этом не остаётся беззащитной — работают три других рубежа,
 * невидимых живому посетителю: ограничение частоты по адресу (`rateLimit`),
 * ловушка `looksAutomated` и минимальное время заполнения. Спам-трафик они
 * срезают почти целиком; целевую атаку — нет, и если такая случится,
 * достаточно завести ключ, код к этому готов.
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

/**
 * Признаки того, что форму заполнила программа, а не человек — §9.4.
 *
 * Два независимых признака, оба невидимы посетителю.
 *
 * Первый — поле-ловушка. В разметке есть input, скрытый стилями и убранный
 * из порядка обхода и из дерева доступности. Человек его не видит и не может
 * в него попасть ни мышью, ни с клавиатуры, ни через экранный диктор.
 * Автоматический заполнитель обходит DOM и заполняет всё подряд — значит,
 * непустое значение здесь означает робота.
 *
 * Второй — время. Форма запоминает момент отрисовки; человек тратит на имя,
 * почту, сферу, сообщение и два флажка минимум несколько секунд, программа
 * отправляет мгновенно. Порог намеренно низкий: лучше пропустить робота,
 * чем отказать торопливому человеку, вставившему всё из буфера обмена.
 *
 * Проверка молчаливая: при срабатывании обработчик отвечает так же, как
 * при успехе. Робот, получивший внятную ошибку, подбирает обход; робот,
 * получивший «спасибо», уходит довольным.
 */
const MIN_FILL_MS = 3000

export function looksAutomated(payload: {
  /** Поле-ловушка. */
  website?: unknown
  /** Метка времени отрисовки формы, миллисекунды. */
  form_opened_at?: unknown
}): boolean {
  if (typeof payload.website === 'string' && payload.website.trim() !== '') return true

  const opened = Number(payload.form_opened_at)
  if (!Number.isFinite(opened) || opened <= 0) {
    // Метки нет вовсе — так выглядит запрос, собранный в обход формы.
    return true
  }
  const elapsed = Date.now() - opened
  // Отрицательное значение означает подставленное будущее время.
  return elapsed < MIN_FILL_MS || elapsed < 0
}
