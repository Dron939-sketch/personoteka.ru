import {
  agencyPasswordOk,
  findAgencyByLogin,
  hashPassword,
  listAgencies,
  saveAgency,
  type Agency,
} from '@/lib/agencies'
import { storageIsPersistent } from '@/lib/data-dir'
import { lkSession } from '@/lib/lk-session'
import { slugify } from '@/lib/translit'

/**
 * Заведение и управление учётными записями агентств из кабинета редакции.
 *
 * Исторически это делал только CLI-скрипт (`npm run agentstvo`), и на
 * собственной машине этого достаточно. На хостинге — нет: у владельца нет
 * консоли внутри контейнера, и тариф «Доступ для агентств» оказывался
 * непродаваемым — учётку физически некому было завести. Поэтому та же
 * операция доступна редакции из кабинета; правила совпадают с CLI, чтобы
 * оба пути давали одинаковые записи.
 *
 * Регистрации по-прежнему нет: доступ продаётся, а не раздаётся формой.
 */

export const dynamic = 'force-dynamic'

async function requireEditor() {
  const session = await lkSession()
  return session?.role === 'editor'
}

export async function GET() {
  if (!(await requireEditor())) {
    return Response.json({ error: 'Нужен вход редакции' }, { status: 401 })
  }
  // Хеши и соли наружу не отдаются даже редакции — им негде применяться.
  const agencies = listAgencies().map(({ slug, name, login, limit_per_month, disabled, created_at }) => ({
    slug,
    name,
    login,
    limit_per_month,
    disabled: Boolean(disabled),
    created_at,
  }))
  return Response.json({ agencies, persistent: storageIsPersistent() })
}

export async function POST(request: Request) {
  if (!(await requireEditor())) {
    return Response.json({ error: 'Нужен вход редакции' }, { status: 401 })
  }

  let payload: { name?: unknown; login?: unknown; password?: unknown; limit?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const login = typeof payload.login === 'string' ? payload.login.trim().toLowerCase() : ''
  const password = typeof payload.password === 'string' ? payload.password : ''
  const limit = Number(payload.limit ?? 10)

  if (!login || !/^[a-z0-9._-]{3,40}$/.test(login)) {
    return Response.json(
      { error: 'Логин: 3–40 знаков, латиница, цифры, точка, дефис, подчёркивание' },
      { status: 400 },
    )
  }

  const existing = findAgencyByLogin(login)

  // Существующий логин + новый пароль = смена пароля, как в CLI.
  if (existing) {
    if (!password) {
      return Response.json({ error: 'Агентство уже есть; чтобы сменить пароль, укажите новый' }, { status: 400 })
    }
    if (password.length < 10) {
      return Response.json({ error: 'Пароль не короче десяти знаков' }, { status: 400 })
    }
    if (agencyPasswordOk(existing, password)) {
      return Response.json({ ok: true, slug: existing.slug, note: 'Пароль не изменился' })
    }
    saveAgency({ ...existing, ...hashPassword(password) })
    console.info('[agentstva] пароль изменён', existing.slug)
    return Response.json({ ok: true, slug: existing.slug })
  }

  if (!name) return Response.json({ error: 'Укажите название агентства' }, { status: 400 })
  if (password.length < 10) {
    return Response.json({ error: 'Пароль не короче десяти знаков' }, { status: 400 })
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return Response.json({ error: 'Лимит — целое число от 1 до 100' }, { status: 400 })
  }

  const slug = slugify(name)
  if (!slug) return Response.json({ error: 'Из названия не получается слаг' }, { status: 400 })
  if (listAgencies().some((a) => a.slug === slug)) {
    return Response.json({ error: `Слаг «${slug}» уже занят — выберите другое название` }, { status: 400 })
  }

  const agency: Agency = {
    slug,
    name,
    login,
    ...hashPassword(password),
    limit_per_month: limit,
    created_at: new Date().toISOString(),
  }
  saveAgency(agency)
  console.info('[agentstva] заведено', slug)
  return Response.json({ ok: true, slug })
}

/** Приостановка и возобновление подписки. */
export async function PATCH(request: Request) {
  if (!(await requireEditor())) {
    return Response.json({ error: 'Нужен вход редакции' }, { status: 401 })
  }

  let payload: { slug?: unknown; disabled?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const slug = typeof payload.slug === 'string' ? payload.slug : ''
  const agency = listAgencies().find((a) => a.slug === slug)
  if (!agency) return Response.json({ error: 'Агентство не найдено' }, { status: 404 })

  saveAgency({ ...agency, disabled: Boolean(payload.disabled) })
  console.info('[agentstva]', slug, payload.disabled ? 'приостановлено' : 'возобновлено')
  return Response.json({ ok: true })
}
