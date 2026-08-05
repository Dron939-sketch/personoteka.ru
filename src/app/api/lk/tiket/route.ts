import { LK_COOKIE, lkEnabled, verifyToken } from '@/lib/lk-auth'
import { setTicketState, type TicketKind, type TicketState } from '@/lib/tickets'

/**
 * Смена состояния тикета из кабинета.
 *
 * Проверка сессии сделана здесь, а не в middleware: matcher закрывает `/lk/*`,
 * а этот адрес живёт в `/api/`, где рядом стоит открытая форма входа. Полагаться
 * на то, что кто-то потом расширит matcher и не сломает вход, нельзя.
 */

export const dynamic = 'force-dynamic'

const STATES: TicketState[] = ['open', 'in_work', 'done', 'rejected']
const KINDS: TicketKind[] = ['lead', 'removal']

export async function POST(request: Request) {
  if (!lkEnabled()) {
    return Response.json({ error: 'Кабинет не настроен' }, { status: 503 })
  }

  const token = cookie(request.headers.get('cookie'), LK_COOKIE)
  if (!(await verifyToken(token))) {
    return Response.json({ error: 'Нужен вход в кабинет' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const ticket = typeof payload.ticket === 'string' ? payload.ticket : ''
  const kind = payload.kind as TicketKind
  const state = payload.state as TicketState
  const note = typeof payload.note === 'string' ? payload.note.slice(0, 500) : undefined

  if (!ticket || !KINDS.includes(kind) || !STATES.includes(state)) {
    return Response.json({ error: 'Не указан тикет или состояние' }, { status: 400 })
  }

  try {
    setTicketState({ ticket, kind, state, note })
  } catch (error) {
    console.error('[lk/tiket] не записано', error)
    return Response.json({ error: 'Реестр недоступен для записи' }, { status: 500 })
  }

  return Response.json({ ok: true })
}

function cookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}
