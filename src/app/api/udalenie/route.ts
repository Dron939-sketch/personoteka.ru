import { REMOVAL_SLA, buildConsentRecords } from '@/lib/consent'
import { clientIp, rateLimit, verifyCaptcha } from '@/lib/request'

/**
 * Запрос на удаление или исправление данных — §11.3.
 *
 * Запрос обязан создавать тикет и уведомлять ответственного (критерий приёмки §15):
 * молча принятый и потерянный запрос — нарушение срока реакции, а не баг интерфейса.
 * Согласие на распространение здесь не запрашивается: заявитель, наоборот, его отзывает.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const ip = clientIp(request)

  if (!rateLimit(`udalenie:${ip}`)) {
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
  const pageUrl = str(payload.page_url)
  const message = str(payload.message)

  if (!name || !email || !pageUrl || !message) {
    return Response.json(
      { error: 'Укажите имя, почту, ссылку на страницу и суть запроса' },
      { status: 400 },
    )
  }
  if (payload.consent_processing !== '1') {
    return Response.json(
      { error: 'Нужно согласие на обработку данных для рассмотрения запроса' },
      { status: 400 },
    )
  }
  if (!(await verifyCaptcha(str(payload.captcha_token)))) {
    return Response.json({ error: 'Не пройдена проверка «я не робот»' }, { status: 400 })
  }

  const consents = buildConsentRecords({
    kinds: ['processing'],
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    email,
    source: 'removal',
  })

  // TODO(этап 4): создать тикет в реестре запросов, поставить сроки из REMOVAL_SLA
  // и отправить уведомление ответственному за обработку ПДн.
  console.warn('[udalenie] требуется реакция', {
    name,
    email,
    pageUrl,
    message: message.slice(0, 2000),
    acknowledge_by_business_days: REMOVAL_SLA.acknowledge_business_days,
    decide_by_business_days: REMOVAL_SLA.decide_business_days,
    consents,
  })

  return Response.json({ ok: true })
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
