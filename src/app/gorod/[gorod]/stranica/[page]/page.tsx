import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getCity, getPersonsByCity, getPopulatedCities } from '@/lib/content'
import { PAGE_SIZE, pageParams, parsePage } from '@/lib/pagination'
import { SITE } from '@/lib/site'

import { CityView } from '../../page'

/**
 * Вторая и дальше страницы раздела. Первая живёт на самом разделе — отдельного
 * `stranica/1/` нет, иначе одно содержимое получило бы два адреса.
 *
 * Нумерация в пути, а не в параметре запроса: параметры у списков закрыты
 * в `robots.txt`, и `?page=2` увёл бы хвост раздела из индекса.
 */
export function generateStaticParams() {
  const out: { gorod: string; page: string }[] = []
  for (const city of getPopulatedCities()) {
    for (const { page } of pageParams(getPersonsByCity(city.slug).length)) {
      out.push({ gorod: city.slug, page })
    }
  }
  return out
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gorod: string } & { page: string }>
}): Promise<Metadata> {
  const p = await params
  const n = parsePage(p.page)
  const city = getCity(p.gorod)
  if (!city) notFound()

  const pages = Math.ceil(getPersonsByCity(city.slug).length / PAGE_SIZE)

  return {
    // Номер в заголовке: без него страницы списка выглядят дублями друг друга.
    title: `Персоны в ${city.name_prepositional} — страница ${n} из ${pages}`,
    description: `Биографии людей, чья работа связана с городом ${city.name}.`,
    alternates: { canonical: `${SITE.url}/gorod/${city.slug}/stranica/${n}/` },
  }
}

export default async function CityPagedPage({
  params,
}: {
  params: Promise<{ gorod: string } & { page: string }>
}) {
  const p = await params
  const n = parsePage(p.page)
  if (n <= 1) notFound()

  return <CityView params={Promise.resolve(p)} page={n} />
}
