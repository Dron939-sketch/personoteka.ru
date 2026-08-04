import { NextResponse, type NextRequest } from 'next/server'

import { LK_COOKIE, lkEnabled, verifyToken } from './src/lib/lk-auth'

/**
 * Защита личного кабинета. Проверка живёт в middleware, а не в самих страницах:
 * так закрыт весь раздел разом, включая те страницы, которые появятся позже —
 * забыть поставить проверку на новой странице невозможно.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Страница входа должна оставаться доступной, иначе войти будет некуда.
  if (pathname.startsWith('/lk/vhod')) return NextResponse.next()

  if (!lkEnabled()) {
    // Пароль не задан — кабинет выключен, а не открыт нараспашку.
    return NextResponse.redirect(new URL('/lk/vhod/', request.url))
  }

  const ok = await verifyToken(request.cookies.get(LK_COOKIE)?.value)
  if (ok) return NextResponse.next()

  const login = new URL('/lk/vhod/', request.url)
  login.searchParams.set('dalee', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/lk/:path*'],
}
