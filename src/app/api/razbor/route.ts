import { buildConsentRecords } from '@/lib/consent'
import { notify, sendTo } from '@/lib/mail'
import { clientIp, looksAutomated, rateLimit } from '@/lib/request'
import { QUESTIONS, STATE_LABEL, verdict } from '@/lib/sled'
import { SITE } from '@/lib/site'
import { addLead, type LeadSource } from '@/lib/tickets'

/**
 * «Прислать разбор на почту» со страницы проверки цифрового следа.
 *
 * Зачем. Проверка — самая посещаемая страница портала (Метрика, 30 дней до
 * 13.09.2026: 41 визит из 150 видимых), и до сих пор она заканчивалась
 * ссылкой на статью. Человек, который только что увидел, где у него рвётся
 * цепочка, уходил без следа — ни адреса, ни повода написать ему через день.
 *
 * Что здесь. Человек по желанию оставляет почту и получает тот же разбор
 * письмом, с действиями по звеньям. Заявка ложится в реестр со сферой
 * «Разбор цифрового следа» и источником — редактор видит её в кабинете и
 * может написать через день. Про размещение биографии в письме — один
 * абзац и только если рвётся пятое звено: инструмент, который любой ответ
 * сводит к «закажите биографию», перестаёт быть проверкой (см. lib/sled.ts).
 *
 * Согласие одно — на обработку: ничего не публикуется, распространения нет.
 */

export const dynamic = 'force-dynamic'

const SPHERE = 'Разбор цифрового следа'

export async function POST(request: Request) {
  const ip = clientIp(request)

  if (!rateLimit(`razbor:${ip}`)) {
    return Response.json({ error: 'Слишком много попыток. Попробуйте позже.' }, { status: 429 })
  }

  let payload: Record<string, unknown>
  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const email = str(payload.email)
  if (!email || !isEmail(email)) {
    return Response.json({ error: 'Проверьте адрес электронной почты' }, { status: 400 })
  }
  if (payload.consent_processing !== '1') {
    return Response.json({ error: 'Нужно согласие на обработку данных' }, { status: 400 })
  }
  if (looksAutomated(payload)) {
    console.info('[razbor] отсеян как автоматический', ip)
    return Response.json({ ok: true })
  }

  const answers = pickAnswers(payload.answers)
  if (Object.keys(answers).length === 0) {
    return Response.json({ error: 'Сначала ответьте хотя бы на один вопрос' }, { status: 400 })
  }

  const results = verdict(answers)
  const query = new URLSearchParams(answers).toString()
  const link = `${SITE.url}/proverka-cifrovogo-sleda/?${query}#razbor`
  const name = str(payload.name)?.slice(0, 120)

  const consents = buildConsentRecords({
    kinds: ['processing'],
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    email,
    source: 'lead',
  })
  const source = leadSource(payload.source)

  const lines = results.map(
    (r) => `${r.title}: ${STATE_LABEL[r.state]}. ${r.meaning}${r.action ? ` ${r.action}` : ''}`,
  )

  try {
    const ticket = addLead({
      name: name ?? email,
      email,
      sphere: SPHERE,
      message: [`Разбор: ${link}`, ...lines].join('\n').slice(0, 2000),
      ip,
      consents,
      source,
    })
    console.info('[razbor] принят', ticket.id)
  } catch (error) {
    console.error('[razbor] не записан', error)
    return Response.json(
      { error: 'Не удалось сохранить запрос. Напишите, пожалуйста, на почту редакции.' },
      { status: 500 },
    )
  }

  const fifthBroken = results.some((r) => r.link === 5 && r.state !== 'ok')
  const text = [
    name ? `${name}, здравствуйте.` : 'Здравствуйте.',
    '',
    'Это разбор вашего цифрового следа с personoteka.ru — по тем ответам, которые вы дали.',
    '',
    ...lines.map((l) => `— ${l}`),
    '',
    `Ссылка на разбор, её можно сохранить или переслать: ${link}`,
    '',
    'Четыре звена из пяти чинятся вниманием и одним письмом организатору события — не деньгами.',
    ...(fifthBroken
      ? [
          '',
          'Пятое звено — страница с проверенными фактами, на которую можно сослаться, — единственное, что закрывает редакция. ' +
            `Что это и сколько стоит: ${SITE.url}/razmestit/ (7 500 ₽ разово, страница выходит за 9–16 рабочих дней).`,
        ]
      : []),
    '',
    `Если появятся вопросы, ответьте на это письмо или напишите на ${SITE.email}.`,
    '',
    'Редакция «Персонотеки»',
  ].join('\n')

  void sendTo(email, 'Разбор вашего цифрового следа', text)
  void notify(`Разбор цифрового следа: ${name ?? email}`, [
    `Почта: ${email}`,
    name ? `Имя: ${name}` : '',
    `Разбор: ${link}`,
    ...lines,
    ...sourceLines(source),
    `\nЗаявка в кабинете: /lk/zayavki/`,
  ].filter(Boolean))

  return Response.json({ ok: true })
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

/** Только известные вопросы и только допустимые ответы. */
function pickAnswers(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const q of QUESTIONS) {
    const v = (raw as Record<string, unknown>)[q.key]
    if (typeof v === 'string' && q.answers.some((a) => a.value === v)) out[q.key] = v
  }
  return out
}

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
  if (!source) return ['\nОткуда: не определено']
  return [
    '\nОткуда:',
    source.first_url ? `Первая страница: ${source.first_url}` : '',
    source.first_referrer ? `Пришёл с: ${source.first_referrer}` : '',
    source.page ? `Страница формы: ${source.page}` : '',
  ].filter(Boolean)
}
