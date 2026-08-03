import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { getCity, getPersonsByCity, getPopulatedCities, getSpheres } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/** География — вторая ось рубрикации (§4.1). */

export const dynamicParams = false

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

  return {
    title: `Биографии: ${city.name}`,
    description: `Персоны, живущие и работающие в ${city.name_prepositional}: биографии с проверяемыми фактами и датой обновления.`,
    alternates: { canonical: `${SITE.url}/gorod/${city.slug}/` },
  }
}

export default async function CityPage({ params }: { params: Promise<{ gorod: string }> }) {
  const { gorod } = await params
  const city = getCity(gorod)
  if (!city) notFound()

  const persons = getPersonsByCity(city.slug)
  const spheres = getSpheres().filter((sphere) =>
    persons.some((p) => p.spheres.includes(sphere.slug)),
  )

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(persons, `Персоны: ${city.name}`)} />

      <Breadcrumbs items={[{ href: '/katalog/', label: 'Каталог' }, { label: city.name }]} />

      <PageHeader
        title={`Персоны в ${city.name_prepositional}`}
        lead={
          city.region && city.region !== city.name
            ? `${city.name}, ${city.region}. Биографии людей, чья работа связана с городом.`
            : 'Биографии людей, чья работа связана с городом.'
        }
        meta={personsCount(persons.length)}
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
          {persons.map((person, i) => (
            <PersonCard key={person.slug} person={person} size="m" priority={i < 4} />
          ))}
        </div>
      )}
    </div>
  )
}
