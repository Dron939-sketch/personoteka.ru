import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getPersons } from '@/lib/content'
import { PAGE_SIZE, pageParams, parsePage } from '@/lib/pagination'
import { SITE } from '@/lib/site'

import { CatalogView } from '../../CatalogView'

/**
 * Вторая и дальше страницы каталога.
 *
 * Нумерация вынесена в путь, а не в параметр запроса: в `robots.txt` закрыт
 * весь `/katalog/?…`, и `?page=2` увёл бы из индекса всё, кроме первых
 * сорока восьми биографий.
 *
 * Первой страницы здесь нет — она живёт на самом `/katalog/`. Адрес
 * `/katalog/stranica/1/` вёл бы к тому же содержимому под вторым адресом,
 * то есть к дублю, поэтому отдаёт 404.
 */
export function generateStaticParams() {
  return pageParams(getPersons().length)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>
}): Promise<Metadata> {
  const { page } = await params
  const n = parsePage(page)
  const pages = Math.ceil(getPersons().length / PAGE_SIZE)

  return {
    // Одинаковые title у всех страниц списка поисковик считает дублями,
    // хотя содержимое разное, — поэтому номер выносится в заголовок.
    title: `Каталог персон — страница ${n} из ${pages}`,
    description:
      'Каталог биографий: фильтры по сфере деятельности, городу и десятилетию рождения, алфавитный указатель.',
    alternates: { canonical: `${SITE.url}/katalog/stranica/${n}/` },
  }
}

export default async function CatalogPagedPage({
  params,
  searchParams,
}: {
  params: Promise<{ page: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { page } = await params
  const n = parsePage(page)
  // «1» сюда попадать не должна: у первой страницы свой адрес.
  if (n <= 1) notFound()

  return <CatalogView searchParams={searchParams} page={n} />
}
