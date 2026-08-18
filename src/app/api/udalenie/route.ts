import { buildConsentRecords } from '@/lib/consent'
import { notify } from '@/lib/mail'
import { clientIp, looksAutomated, rateLimit, verifyCaptcha } from '@/lib/request'
import { addRemoval } from '@/lib/tickets'

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
  // Тихий отсев роботов, когда капча не подключена (§9.4). Отвечаем как при
  // успехе и ничего не записываем: робот, получивший внятную ошибку, подберёт
  // обход, а получивший «спасибо» — уйдёт довольным. В лог пишем, чтобы
  // отличать тишину «никто не пишет» от тишины «всех отсеяли».
  if (looksAutomated(payload)) {
    console.info('[udalenie] отсеяна как автоматическая', ip)
    return Response.json({ ok: true })
  }

  const consents = buildConsentRecords({
    kinds: ['processing'],
    ip,
    userAgent: request.headers.get('user-agent') ?? '',
    email,
    source: 'removal',
  })

  const removal = {
    name,
    email,
    page_url: pageUrl,
    message: message.slice(0, 2000),
    ip,
    consents,
  }

  try {
    const ticket = addRemoval(removal)
    // Сроки §11.3 проставлены при записи; кабинет подсвечивает просроченное.
    console.warn('[udalenie] требуется реакция', ticket.id, 'до', ticket.acknowledge_by)
    // §11.3: ответственный за обработку ПДн уведомляется о запросе, а не
    // обнаруживает его при следующем заходе в кабинет.
    void notify(`Запрос на удаление данных: ${name}`, [
      `Заявитель: ${name}`,
      `Почта: ${email}`,
      `Страница: ${pageUrl}`,
      `\nСуть запроса:\n${removal.message}`,
      `\nПодтвердить получение до: ${ticket.acknowledge_by.slice(0, 10)}`,
      `Мотивированное решение до: ${ticket.decide_by.slice(0, 10)}`,
      `\nЗапрос в кабинете: /lk/zayavki/`,
    ])
  } catch (error) {
    // Здесь молчаливая потеря хуже всего: срок реакции идёт от момента
    // получения, а получения, которого никто не увидел, юридически не было.
    console.error('[udalenie] НЕ ЗАПИСАН', error, removal)
    return Response.json(
      { error: 'Не удалось зарегистрировать запрос. Напишите, пожалуйста, на почту редакции.' },
      { status: 500 },
    )
  }

  return Response.json({ ok: true })
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
