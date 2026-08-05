import { agencyPasswordOk, findAgencyByLogin } from '@/lib/agencies'
import { LK_COOKIE, issueToken, lkEnabled, passwordMatches } from '@/lib/lk-auth'
import { clientIp, rateLimit } from '@/lib/request'

/**
 * Вход в кабинет: проверка пароля и выдача подписанной сессии.
 *
 * Две роли — редакция (общий пароль) и агентство (логин и свой пароль). Ответ
 * на неверные данные одинаковый в обоих случаях: по тексту ошибки не должно
 * быть видно, существует ли такой логин.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!lkEnabled()) {
    return Response.json({ error: 'Кабинет не настроен' }, { status: 503 })
  }

  // Перебор пароля — единственная реальная угроза для одного общего секрета.
  if (!rateLimit(`lk:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return Response.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 })
  }

  let payload: { password?: unknown; login?: unknown }
  try {
    payload = (await request.json()) as { password?: unknown; login?: unknown }
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const password = typeof payload.password === 'string' ? payload.password : ''
  const login = typeof payload.login === 'string' ? payload.login.trim() : ''

  // Без логина — вход редакции. С логином — агентство.
  if (!login) {
    if (!passwordMatches(password)) {
      return Response.json({ error: 'Неверный пароль' }, { status: 401 })
    }
    return withSession(request, { role: 'editor' }, '/lk/')
  }

  const agency = findAgencyByLogin(login)
  if (!agency || !agencyPasswordOk(agency, password)) {
    return Response.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  return withSession(request, { role: 'agency', agency: agency.slug }, '/lk/agentstvo/')
}

async function withSession(
  request: Request,
  session: Parameters<typeof issueToken>[0],
  home: string,
): Promise<Response> {
  const response = Response.json({ ok: true, home })
  response.headers.append('Set-Cookie', sessionCookie(request, await issueToken(session)))
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
