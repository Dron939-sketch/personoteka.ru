/**
 * Доступ в личный кабинет.
 *
 * Кабинет показывает редакционную очередь, а в ней есть имена частных лиц —
 * тех, кто ещё не дал согласия на публикацию. Отдавать это без проверки нельзя,
 * поэтому раздел закрыт паролем.
 *
 * Это временное решение на один общий пароль: полноценные роли из §8.5
 * (владелец профиля, агентство, редактор) появятся вместе с базой пользователей
 * на этапе 6. Пока задача скромнее — не дать посторонним увидеть очередь.
 *
 * Если `LK_PASSWORD` не задан, кабинет выключен целиком: неподготовленный
 * деплой не должен открывать данные по умолчанию.
 */

const COOKIE = 'personoteka_lk'
/** Срок жизни сессии — рабочий день. */
const TTL_MS = 12 * 60 * 60 * 1000

export const LK_COOKIE = COOKIE

export function lkEnabled(): boolean {
  return Boolean(process.env.LK_PASSWORD)
}

function secret(): string {
  // Отдельный ключ подписи не обязателен: пароль и так известен только серверу.
  return process.env.LK_SECRET ?? process.env.LK_PASSWORD ?? ''
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Сравнение за постоянное время: обычное `===` подсказывает, где строки разошлись. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.LK_PASSWORD
  if (!expected) return false
  return safeEqual(input, expected)
}

export async function issueToken(now = Date.now()): Promise<string> {
  const expires = String(now + TTL_MS)
  return `${expires}.${await sign(expires)}`
}

export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false
  const [expires, mac] = token.split('.')
  if (!expires || !mac) return false
  if (Number(expires) < now) return false
  return safeEqual(mac, await sign(expires))
}
