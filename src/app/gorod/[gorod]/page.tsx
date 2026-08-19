import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { PersonCard } from '@/components/PersonCard'
import { getCity, getPersonsByCity, getPopulatedCities, getSpheres } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { paginate } from '@/lib/pagination'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/** География — вторая ось рубрикации (§4.1). */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

export function generateStaticParams() {
  return getPopulatedCities().map((city) => ({ gorod: city.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gorod: string }>
}): Promise<Metadata> {
  const { gorod } = await params
  const city = getCity(gorod)
  if (!city) return {}

  // Города заведены в справочник заранее, и часть из них пока пуста. Из карты
  // сайта такие уже исключены, но страница остаётся доступной по прямому адресу
  // и по фильтру. Пустой список — не то, что стоит предлагать поиску: это
  // страница без содержимого, и от неё в выдаче один вред. Как только в городе
  // появляется первая персона, запрет снимается сам.
  const empty = getPersonsByCity(city.slug).length === 0

  return {
    title: `Биографии: ${city.name}`,
    description: `Персоны, живущие и работающие в ${city.name_prepositional}: биографии с проверяемыми фактами и датой обновления.`,
    alternates: { canonical: `${SITE.url}/gorod/${city.slug}/` },
    robots: empty ? { index: false, follow: true } : undefined,
  }
}

export async function CityView({
  params,
  page = 1,
}: {
  params: Promise<{ gorod: string }>
  page?: number
}) {
  const { gorod } = await params
  const city = getCity(gorod)
  if (!city) notFound()

  const persons = getPersonsByCity(city.slug)

  // Список режется на страницы: цельный вывод давал до 1,6 МБ разметки

  // на один адрес. Номер вне диапазона — 404, а не пустая страница.

  const paged = paginate(persons, page)

  if (page < 1 || page > paged.pages) notFound()
  const spheres = getSpheres().filter((sphere) =>
    persons.some((p) => p.spheres.includes(sphere.slug)),
  )

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(paged.items, `Персоны: ${city.name}`)} />

      <Breadcrumbs items={[{ href: '/katalog/', label: 'Каталог' }, { label: city.name }]} />

      <PageHeader
        title={`Персоны в ${city.name_prepositional}`}
        lead={
          city.region && city.region !== city.name
            ? `${city.name}, ${city.region}. Биографии людей, чья работа связана с городом.`
            : 'Биографии людей, чья работа связана с городом.'
        }
        meta={personsCount(paged.total)}
      />

      {spheres.length > 0 && (
        <nav className={styles.sphereNav} aria-label="Сферы в этом городе">
          <span className="caption">По сферам:</span>
          {spheres.map((sphere) => (
            <Link key={sphere.slug} href={`/sfera/${sphere.slug}/${city.slug}/`}>
              {sphere.name}
            </Link>
          ))}
        </nav>
      )}

      {persons.length === 0 ? (
        <EmptyState title="В этом городе пока нет опубликованных биографий" />
      ) : (
        <div className={styles.grid}>
          {paged.items.map((person, i) => (
            <PersonCard key={person.slug} person={person} size="m" priority={i < 4} />
          ))}
        </div>
      )}

    <Pagination
      base={`/gorod/${city.slug}/`}
      page={paged.page}
      pages={paged.pages}
      total={paged.total}
    />
    </div>
  )
}

/** Первая страница раздела; остальные — на `stranica/N/`, тем же видом. */
export default function CityPage({ params }: { params: Promise<{ gorod: string }> }) {
  return <CityView params={params} page={1} />
}
