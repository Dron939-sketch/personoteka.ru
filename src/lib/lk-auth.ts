/**
 * Доступ в личный кабинет.
 *
 * Ролей две. **Редакция** входит по общему паролю `LK_PASSWORD` и видит очередь,
 * качество карточек, обращения и материалы агентств. **Агентство** входит по
 * своему логину и паролю (`src/lib/agencies.ts`) и видит только своё: лимит
 * подписки, свои страницы, свои просмотры и форму публикации.
 *
 * Роль зашита в подписанный токен, а не в отдельную куку: иначе её можно было бы
 * подменить, оставив подпись сессии в силе.
 *
 * Общий пароль редакции — по-прежнему временное решение: персональные учётки
 * редакторов появятся вместе с полной базой пользователей (§8.5). Задача пока
 * скромнее — развести два кабинета и не дать посторонним увидеть очередь, где
 * есть имена людей, ещё не давших согласия на публикацию.
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

export type LkRole = 'editor' | 'agency'

export interface LkSession {
  role: LkRole
  /** Слаг агентства — только для роли `agency`. */
  agency?: string
}

/**
 * Токен: `срок.роль.агентство.подпись`. Подписывается всё вместе, поэтому роль
 * нельзя поднять до редакционной, не сломав подпись. Пустое поле агентства
 * помечается прочерком: пустая часть между точками читалась бы неоднозначно.
 */
export async function issueToken(session: LkSession, now = Date.now()): Promise<string> {
  const payload = `${now + TTL_MS}.${session.role}.${session.agency ?? '-'}`
  return `${payload}.${await sign(payload)}`
}

export async function readToken(
  token: string | undefined,
  now = Date.now(),
): Promise<LkSession | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [expires, role, agency, mac] = parts
  if (role !== 'editor' && role !== 'agency') return null
  if (!Number(expires) || Number(expires) < now) return null
  if (!safeEqual(mac, await sign(`${expires}.${role}.${agency}`))) return null
  if (role === 'agency' && agency === '-') return null
  return { role, agency: agency === '-' ? undefined : agency }
}

/** Есть ли вообще действующая сессия — для мест, где роль не важна. */
export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  return (await readToken(token, now)) !== null
}
