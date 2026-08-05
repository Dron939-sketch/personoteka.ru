import { revalidatePath } from 'next/cache'

import {
  buildPerson,
  setRuntimeStatus,
  validate,
  writePerson,
  type BiographyInput,
} from '@/lib/agency-publish'
import { currentAgency, lkSession } from '@/lib/lk-session'
import { clientIp, rateLimit } from '@/lib/request'

/**
 * Публикация биографии агентством и снятие её редакцией.
 *
 * POST — публикация: страница появляется на сайте сразу (тариф «без ожидания
 * очереди редакции»), проверка постфактум. PATCH — действие редакции: снять
 * материал с публикации или вернуть его.
 *
 * После записи сбрасывается кэш всего сайта. Это дорого, но правильно: новая
 * персона попадает не только на свою страницу, но и в каталог, рубрику, город,
 * карты сайта и поиск. Точечная ревалидация здесь означала бы список из десятка
 * адресов, который рассинхронизируется с первой же новой страницей раздела.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const agency = await currentAgency()
  if (!agency) return Response.json({ error: 'Нужен вход в кабинет агентства' }, { status: 401 })

  if (!rateLimit(`bio:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ error: 'Слишком много публикаций подряд' }, { status: 429 })
  }

  let input: BiographyInput
  try {
    input = (await request.json()) as BiographyInput
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const errors = validate(input, agency)
  if (errors.length) return Response.json({ errors }, { status: 400 })

  const person = buildPerson(input, agency)
  try {
    writePerson(person)
  } catch (error) {
    console.error('[biografiya] не записана', error)
    return Response.json({ error: 'Не удалось сохранить страницу' }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  console.info('[biografiya] опубликована', person.slug, 'агентством', agency.slug)

  return Response.json({ ok: true, slug: person.slug })
}

/** Снятие и возврат материала — действие редакции, не агентства. */
export async function PATCH(request: Request) {
  const session = await lkSession()
  if (session?.role !== 'editor') {
    return Response.json({ error: 'Нужен вход редакции' }, { status: 401 })
  }

  let payload: { slug?: unknown; status?: unknown; returnSlot?: unknown }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return Response.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const slug = typeof payload.slug === 'string' ? payload.slug : ''
  const status = payload.status === 'published' ? 'published' : 'hidden'
  if (!slug) return Response.json({ error: 'Не указана страница' }, { status: 400 })

  if (!setRuntimeStatus(slug, status)) {
    return Response.json({ error: 'Страница не найдена среди агентских' }, { status: 404 })
  }

  revalidatePath('/', 'layout')
  return Response.json({ ok: true })
}
