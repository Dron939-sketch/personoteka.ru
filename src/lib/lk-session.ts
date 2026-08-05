import 'server-only'

import { cookies } from 'next/headers'

import { getAgency, type Agency } from './agencies'
import { LK_COOKIE, readToken, type LkSession } from './lk-auth'

/**
 * Сессия кабинета для серверных страниц.
 *
 * Middleware уже не пустил бы сюда чужого, но страница всё равно обязана знать,
 * чья это сессия: агентство должно видеть только своё. Полагаться на `?agency=`
 * из адреса было бы дырой размером с кабинет.
 */

export async function lkSession(): Promise<LkSession | null> {
  const token = (await cookies()).get(LK_COOKIE)?.value
  return readToken(token)
}

/** Агентство текущей сессии. `null`, если это редакция или запись пропала. */
export async function currentAgency(): Promise<Agency | null> {
  const session = await lkSession()
  if (!session || session.role !== 'agency' || !session.agency) return null
  return getAgency(session.agency) ?? null
}
