import { buildConsentRecords } from '@/lib/consent'
import { notify } from '@/lib/mail'
import { clientIp, looksAutomated, rateLimit, verifyCaptcha } from '@/lib/request'
import { addLead, type LeadSource } from '@/lib/tickets'

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
  // Тихий отсев роботов, когда капча не подключена (§9.4). Отвечаем как при
  // успехе и ничего не записываем: робот, получивший внятную ошибку, подберёт
  // обход, а получивший «спасибо» — уйдёт довольным. В лог пишем, чтобы
  // отличать тишину «никто не пишет» от тишины «всех отсеяли».
  if (looksAutomated(payload)) {
    console.info('[zayavka] отсеяна как автоматическая', ip)
    return Response.json({ ok: true })
  }

  const consents = buildConsentRecords({
    kinds: ['processing', 'distribution'],
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    email,
    source: 'lead',
  })

  const source = leadSource(payload.source)

  const lead = {
    name,
    email,
    sphere,
    contact: str(payload.contact),
    message: str(payload.message)?.slice(0, 2000),
    ip,
    consents,
    source,
  }

  try {
    const ticket = addLead(lead)
    // В лог — только идентификатор: сами ПДн лежат в реестре, дублировать их
    // в потоке логов незачем.
    console.info('[zayavka] принята', ticket.id)
    // Письмо после записи и без ожидания: заявка уже сохранена, и почта
    // не должна ни задерживать ответ формы, ни ломать его своей ошибкой.
    void notify(`Заявка на размещение: ${name}`, [
      `Имя: ${name}`,
      `Почта: ${email}`,
      `Сфера: ${sphere}`,
      lead.contact ? `Ещё контакт: ${lead.contact}` : '',
      lead.message ? `\nСообщение:\n${lead.message}` : '',
      ...sourceLines(source),
      `\nЗаявка в кабинете: /lk/zayavki/`,
    ].filter(Boolean))
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

/** Источник заявки из формы: только строки, по 500 символов, без лишних ключей. */
function leadSource(raw: unknown): LeadSource | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const keys: (keyof LeadSource)[] = ['page', 'referrer', 'first_url', 'first_referrer', 'first_at']
  const out: LeadSource = {}
  for (const k of keys) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 500)
  }
  return Object.keys(out).length ? out : undefined
}

function sourceLines(source?: LeadSource): string[] {
  if (!source) return ['\nОткуда: не определено (хранилище недоступно)']
  const utm = (u?: string) => {
    try {
      const q = new URL(u ?? '').searchParams
      // utm_term — поисковая фраза, её Директ подставляет макросом {keyword}
      // (14.09.2026 добавлен во все объявления Персонотеки и Личностей).
      // Без неё письмо называло кампанию и группу, но не запрос, и понять,
      // какая фраза привела заплатившего человека, было нельзя. Пустой
      // utm_term — тоже ответ: значит показ пришёл от автотаргетинга.
      const parts = ['utm_source', 'utm_campaign', 'utm_content', 'utm_term', 'etext']
        .map((k) => (q.get(k) ? `${k}=${q.get(k)}` : ''))
        .filter(Boolean)
      return parts.length ? ` (${parts.join(', ')})` : ''
    } catch {
      return ''
    }
  }
  return [
    '\nОткуда:',
    source.first_url ? `Первая страница: ${source.first_url}${utm(source.first_url)}` : '',
    source.first_referrer ? `Пришёл с: ${source.first_referrer}` : '',
    source.first_at ? `Первый заход: ${source.first_at}` : '',
    source.page ? `Страница формы: ${source.page}${utm(source.page)}` : '',
    source.referrer && source.referrer !== source.first_referrer ? `Реферер формы: ${source.referrer}` : '',
  ].filter(Boolean)
}
