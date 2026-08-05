import { buildConsentRecords } from '@/lib/consent'
import { clientIp, rateLimit, verifyCaptcha } from '@/lib/request'
import { addLead } from '@/lib/tickets'

/**
 * Приём заявки с лендинга (§8.4) с фиксацией согласий (§11.1).
 *
 * Оба согласия обязательны и разные: на обработку ПДн и отдельно на их
 * распространение (ст. 10.1 152-ФЗ). Без любого из них заявка не принимается —
 * это не валидация формы, а условие законности публикации.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = clientIp(request)

  if (!rateLimit(`zayavka:${ip}`)) {
    return Response.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const name = str(payload.name)
  const email = str(payload.email)
  const sphere = str(payload.sphere)

  if (!name || !email || !sphere) {
    return Response.json({ error: 'Заполните имя, почту и сферу деятельности' }, { status: 400 })
  }
  if (!isEmail(email)) {
    return Response.json({ error: 'Проверьте адрес электронной почты' }, { status: 400 })
  }
  if (payload.consent_processing !== '1' || payload.consent_distribution !== '1') {
    return Response.json(
      { error: 'Нужны оба согласия: на обработку и на распространение данных' },
      { status: 400 },
    )
  }
  if (!(await verifyCaptcha(str(payload.captcha_token)))) {
    return Response.json({ error: 'Не пройдена проверка «я не робот»' }, { status: 400 })
  }

  const consents = buildConsentRecords({
    kinds: ['processing', 'distribution'],
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    email,
    source: 'lead',
  })

  const lead = {
    name,
    email,
    sphere,
    contact: str(payload.contact),
    message: str(payload.message)?.slice(0, 2000),
    ip,
    consents,
  }

  try {
    const ticket = addLead(lead)
    // В лог — только идентификатор: сами ПДн лежат в реестре, дублировать их
    // в потоке логов незачем.
    console.info('[zayavka] принята', ticket.id)
  } catch (error) {
    // Реестр недоступен. Заявку нельзя подтвердить молча: человек решит, что
    // она принята, и будет ждать ответа, которого никто не увидит.
    console.error('[zayavka] не записана', error, lead)
    return Response.json(
      { error: 'Не удалось сохранить заявку. Напишите, пожалуйста, на почту редакции.' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}
