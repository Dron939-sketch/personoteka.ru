import { buildConsentRecords } from '@/lib/consent'
import { clientIp, rateLimit, verifyCaptcha } from '@/lib/request'

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

  // TODO(этап 4): записать заявку и согласия в БД и создать сделку в CRM.
  // Журнал согласий обязан пережить перезапуск приложения — консоль тут временная.
  console.info('[zayavka]', {
    name,
    email,
    sphere,
    contact: str(payload.contact),
    message: str(payload.message)?.slice(0, 2000),
    consents,
  })

  return Response.json({ ok: true })
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}
