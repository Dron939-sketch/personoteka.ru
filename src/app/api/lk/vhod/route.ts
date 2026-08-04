import { LK_COOKIE, issueToken, lkEnabled, passwordMatches } from '@/lib/lk-auth'
import { clientIp, rateLimit } from '@/lib/request'

/** Вход в кабинет: проверка пароля и выдача подписанной сессии. */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!lkEnabled()) {
    return Response.json({ error: 'Кабинет не настроен' }, { status: 503 })
  }

  // Перебор пароля — единственная реальная угроза для одного общего секрета.
  if (!rateLimit(`lk:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return Response.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 })
  }

  let payload: { password?: unknown }
  try {
    payload = (await request.json()) as { password?: unknown }
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!passwordMatches(password)) {
    return Response.json({ error: 'Неверный пароль' }, { status: 401 })
  }

  const response = Response.json({ ok: true })
  response.headers.append('Set-Cookie', sessionCookie(request, await issueToken()))
  return response
}

/** Выход: гасим сессию. */
export async function DELETE(request: Request) {
  const response = Response.json({ ok: true })
  response.headers.append('Set-Cookie', sessionCookie(request, '', 0))
  return response
}

/**
 * Кука сессии. `Secure` ставим только поверх HTTPS: на локальном стенде по http
 * браузер такую куку просто отбросит, и войти будет невозможно.
 * Путь — корень, а не /lk: иначе кука не уйдёт на /api/lk/ при выходе.
 */
function sessionCookie(request: Request, value: string, maxAge = 12 * 60 * 60): string {
  const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol
  const secure = proto.startsWith('https')
  return [
    `${LK_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
    `Max-Age=${maxAge}`,
  ].join('; ')
}
