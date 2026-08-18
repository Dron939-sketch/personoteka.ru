import { NextResponse, type NextRequest } from 'next/server'

import { LK_COOKIE, lkEnabled, readToken } from './src/lib/lk-auth'

/**
 * Защита личного кабинета. Проверка живёт в middleware, а не в самих страницах:
 * так закрыт весь раздел разом, включая те страницы, которые появятся позже —
 * забыть поставить проверку на новой странице невозможно.
 *
 * Кабинетов два, и они не пересекаются. `/lk/agentstvo/*` — агентское; всё
 * остальное под `/lk/` — редакционное. Роль не из своей зоны не получает 403,
 * а переезжает на свою главную: это не попытка взлома, а промах по ссылке.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Страница входа должна оставаться доступной, иначе войти будет некуда.
  if (pathname.startsWith('/lk/vhod')) return NextResponse.next()

  if (!lkEnabled()) {
    // Пароль не задан — кабинет выключен, а не открыт нараспашку.
    return NextResponse.redirect(new URL('/lk/vhod/', request.url))
  }

  const session = await readToken(request.cookies.get(LK_COOKIE)?.value)
  if (!session) {
    const login = new URL('/lk/vhod/', request.url)
    login.searchParams.set('dalee', pathname)
    return NextResponse.redirect(login)
  }

  const agencyArea = pathname.startsWith('/lk/agentstvo')
  if (agencyArea && session.role !== 'agency') {
    return NextResponse.redirect(new URL('/lk/', request.url))
  }
  if (!agencyArea && session.role === 'agency') {
    return NextResponse.redirect(new URL('/lk/agentstvo/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/lk/:path*'],
}
