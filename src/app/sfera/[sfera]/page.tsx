import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { PromoBanner } from '@/components/PromoBanner'
import { getCities, getPersonsBySphere, getSphere, getSpheres } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Рубрика по сфере деятельности (§4.1). Это первый уровень фильтра каталога,
 * вынесенный в статическую SEO-страницу (§8.3).
 */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

/** Рубрики, где промо-полоса Лектория уместна по теме. */
const PROMO_SPHERES = new Set(['obrazovanie', 'psihologiya', 'nauka'])

export function generateStaticParams() {
  return getSpheres().map((sphere) => ({ sfera: sphere.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sfera: string }>
}): Promise<Metadata> {
  const { sfera } = await params
  const sphere = getSphere(sfera)
  if (!sphere) return {}

  return {
    title: `${sphere.name} — биографии специалистов`,
    description: sphere.description,
    alternates: { canonical: `${SITE.url}/sfera/${sphere.slug}/` },
  }
}

export default async function SpherePage({ params }: { params: Promise<{ sfera: string }> }) {
  const { sfera } = await params
  const sphere = getSphere(sfera)
  if (!sphere) notFound()

  const persons = getPersonsBySphere(sphere.slug)

  // Города, где в этой сфере есть персоны, — второй уровень фильтра
  // и одновременно набор статических страниц `/sfera/<sfera>/<gorod>/`.
  const cityCounts = new Map<string, number>()
  for (const person of persons) {
    if (person.city) cityCounts.set(person.city, (cityCounts.get(person.city) ?? 0) + 1)
  }
  const cities = getCities().filter((c) => cityCounts.has(c.slug))

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(persons, `Персоны в сфере «${sphere.name}»`)} />

      <Breadcrumbs items={[{ href: '/katalog/', label: 'Каталог' }, { label: sphere.name }]} />

      <PageHeader
        title={`${sphere.name}: биографии`}
        lead={sphere.description}
        meta={personsCount(persons.length)}
      />

      {cities.length > 0 && (
        <nav className={styles.cityNav} aria-label="Города в этой сфере">
          <span className="caption">По городам:</span>
          {cities.map((city) => (
            <Link key={city.slug} href={`/sfera/${sphere.slug}/${city.slug}/`}>
              {city.name} <span className="tabular">({cityCounts.get(city.slug)})</span>
            </Link>
          ))}
        </nav>
      )}

      {persons.length === 0 ? (
        <EmptyState
          title="В этой сфере пока нет опубликованных биографий"
          hint={<Link href="/razmestit/">Как разместить биографию</Link>}
        />
      ) : (
        <div className={styles.grid}>
          {persons.map((person, i) => (
            <PersonCard key={person.slug} person={person} size="m" priority={i < 4} />
          ))}
        </div>
      )}

      {/* Полоса показывается там, где проекты по теме, а какой именно из двух —
          решает близость рубрики: на «Психологии» это почти всегда Фреди,
          на «Образовании» и «Науке» — Лекторий (веса в content/banners.json). */}
      {PROMO_SPHERES.has(sphere.slug) && (
        <PromoBanner
          context={{ slug: `sfera:${sphere.slug}`, spheres: [sphere.slug] }}
          placement="sfera"
        />
      )}

      {sphere.seo_text && (
        <section className={`${styles.seo} deferred`}>
          <h2 className="ruled">О разделе</h2>
          <p className="prose">{sphere.seo_text}</p>
        </section>
      )}
    </div>
  )
}
