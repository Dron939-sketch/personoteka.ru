import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { getCity, getPersons, getSphere, getSpheres } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Пересечение «сфера + город» — §8.3: первые два уровня фильтров вынесены
 * в статические SEO-страницы, всё, что глубже, закрыто от индексации.
 * Комбинации без персон не генерируются вовсе: тонкие страницы вредят выдаче.
 */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

export function generateStaticParams() {
  const params: { sfera: string; gorod: string }[] = []
  for (const sphere of getSpheres()) {
    const cities = new Set(
      getPersons()
        .filter((p) => p.spheres.includes(sphere.slug) && p.city)
        .map((p) => p.city as string),
    )
    for (const city of cities) {
      params.push({ sfera: sphere.slug, gorod: city })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sfera: string; gorod: string }>
}): Promise<Metadata> {
  const { sfera, gorod } = await params
  const sphere = getSphere(sfera)
  const city = getCity(gorod)
  if (!sphere || !city) return {}

  return {
    title: `${sphere.name} в ${city.name_prepositional}: биографии`,
    description: `Специалисты сферы «${sphere.name}» в ${city.name_prepositional}: биографии с проверяемыми фактами и ссылками на источники.`,
    alternates: { canonical: `${SITE.url}/sfera/${sphere.slug}/${city.slug}/` },
  }
}

export default async function SphereCityPage({
  params,
}: {
  params: Promise<{ sfera: string; gorod: string }>
}) {
  const { sfera, gorod } = await params
  const sphere = getSphere(sfera)
  const city = getCity(gorod)
  if (!sphere || !city) notFound()

  const persons = getPersons().filter(
    (p) => p.spheres.includes(sphere.slug) && p.city === city.slug,
  )
  if (persons.length === 0) notFound()

  return (
    <div className="container">
      <JsonLd
        data={itemListJsonLd(persons, `${sphere.name} в ${city.name_prepositional}`)}
      />

      <Breadcrumbs
        items={[
          { href: '/katalog/', label: 'Каталог' },
          { href: `/sfera/${sphere.slug}/`, label: sphere.name },
          { label: city.name },
        ]}
      />

      <PageHeader
        title={`${sphere.name} в ${city.name_prepositional}`}
        lead={`Биографии специалистов сферы «${sphere.name}», работающих в ${city.name_prepositional}.`}
        meta={personsCount(persons.length)}
      />

      <div className={styles.grid}>
        {persons.map((person, i) => (
          <PersonCard key={person.slug} person={person} size="m" priority={i < 4} />
        ))}
      </div>

      <p className={styles.links}>
        <Link href={`/sfera/${sphere.slug}/`}>Вся сфера «{sphere.name}»</Link>
        {' · '}
        <Link href={`/gorod/${city.slug}/`}>Все персоны в {city.name_prepositional}</Link>
      </p>
    </div>
  )
}
