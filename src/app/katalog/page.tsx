import type { Metadata } from 'next'
import Link from 'next/link'

import { AlphabetIndex } from '@/components/AlphabetIndex'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { FilterPanel, type Filters } from '@/components/FilterPanel'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { getCities, getPersons, getShowcasePersons, getSpheres, personLetter } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'
import type { Person } from '@/lib/types'

import styles from './page.module.css'

/**
 * Каталог персон (§8.3): фильтры слева, сетка справа, алфавитный указатель сверху.
 * Состояние фильтров живёт в URL. Страница с любыми фильтрами закрыта от индексации
 * (§10.1): индексируются подготовленные SEO-страницы `/sfera/…/` и `/gorod/…/`.
 */

export const metadata: Metadata = {
  title: 'Каталог персон',
  description:
    'Каталог биографий: фильтры по сфере деятельности, городу и десятилетию рождения, алфавитный указатель.',
  alternates: { canonical: `${SITE.url}/katalog/` },
}

const SORTS = [
  { id: 'index', label: 'По индексу внимания' },
  { id: 'novye', label: 'По дате публикации' },
  { id: 'alfavit', label: 'По алфавиту' },
] as const

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters: Filters = {
    sfera: str(params.sfera),
    gorod: str(params.gorod),
    desyatiletie: str(params.desyatiletie),
    proverennye: str(params.proverennye),
    sort: str(params.sort) ?? 'index',
    vid: str(params.vid) ?? 'setka',
  }

  const all = getPersons()
  const spheres = getSpheres()
  const cities = getCities()

  const decades = [
    ...new Set(
      all
        .map((p) => p.birth_date?.slice(0, 3))
        .filter((d): d is string => Boolean(d))
        .map((d) => `${d}0`),
    ),
  ].sort()

  const filtered = applyFilters(all, filters)
  const sorted = applySort(filtered, filters.sort ?? 'index')

  const counts: Record<string, number> = {}
  for (const person of all) {
    const letter = personLetter(person)
    counts[letter] = (counts[letter] ?? 0) + 1
  }

  const hasFilters = Boolean(
    filters.sfera || filters.gorod || filters.desyatiletie || filters.proverennye,
  )
  const isList = filters.vid === 'spisok'

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(sorted.slice(0, 50), 'Каталог персон')} />

      <Breadcrumbs items={[{ label: 'Каталог' }]} />

      <PageHeader
        title="Каталог персон"
        lead="Биографии, опубликованные редакцией: с указанием источников, датой обновления и подписью редактора."
        meta={`Найдено: ${personsCount(sorted.length)}`}
      />

      <AlphabetIndex counts={counts} />

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <FilterPanel spheres={spheres} cities={cities} decades={decades} filters={filters} />
        </aside>

        <div className={styles.results}>
          <div className={styles.toolbar}>
            <nav className={styles.sorts} aria-label="Сортировка">
              {SORTS.map((sort) => (
                <Link
                  key={sort.id}
                  href={buildHref({ ...filters, sort: sort.id })}
                  className={filters.sort === sort.id ? styles.sortActive : styles.sort}
                  aria-current={filters.sort === sort.id ? 'true' : undefined}
                >
                  {sort.label}
                </Link>
              ))}
            </nav>
            <Link
              href={buildHref({ ...filters, vid: isList ? 'setka' : 'spisok' })}
              className={styles.viewToggle}
            >
              {isList ? 'Показать сеткой' : 'Показать списком'}
            </Link>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              title="По этим условиям никого нет"
              hint={<Link href="/katalog/">Сбросить фильтры</Link>}
            />
          ) : (
            <div className={isList ? styles.list : styles.grid}>
              {sorted.map((person, i) => (
                <PersonCard
                  key={person.slug}
                  person={person}
                  size={isList ? 's' : 'm'}
                  priority={i < 4 && !isList}
                />
              ))}
            </div>
          )}

          {hasFilters && (
            <p className={styles.seoHint}>
              Готовые страницы рубрик:{' '}
              {spheres.slice(0, 5).map((s, i) => (
                <span key={s.slug}>
                  {i > 0 && ', '}
                  <Link href={`/sfera/${s.slug}/`}>{s.name}</Link>
                </span>
              ))}
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function str(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value || undefined
}

function applyFilters(persons: Person[], filters: Filters): Person[] {
  return persons.filter((person) => {
    if (filters.sfera && !person.spheres.includes(filters.sfera)) return false
    if (filters.gorod && person.city !== filters.gorod) return false
    if (filters.proverennye === '1' && !person.verified) return false
    if (filters.desyatiletie) {
      const decade = person.birth_date ? `${person.birth_date.slice(0, 3)}0` : undefined
      if (decade !== filters.desyatiletie) return false
    }
    return true
  })
}

function applySort(persons: Person[], sort: string): Person[] {
  const copy = [...persons]
  if (sort === 'novye') {
    return copy.sort((a, b) => b.published_at.localeCompare(a.published_at))
  }
  if (sort === 'alfavit') {
    return copy.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'))
  }
  // Сортировка по умолчанию — «по индексу внимания». Пока аналитика не набрана,
  // индекс у всех нулевой, и порядок вырождается в случайный: первыми оказываются
  // те, кто просто раньше в алфавите. Поэтому голову списка задаёт редакция —
  // тем же файлом content/home-vitrina.txt, что и витрину главной, чтобы порядок
  // не пришлось держать в двух местах. Как только индекс начнёт считаться,
  // хвост списка выстроится сам, а голова останется за редакцией.
  const priority = new Map(getShowcasePersons(100).map((p, i) => [p.slug, i]))
  return copy.sort((a, b) => {
    const ai = priority.get(a.slug) ?? Number.POSITIVE_INFINITY
    const bi = priority.get(b.slug) ?? Number.POSITIVE_INFINITY
    if (ai !== bi) return ai - bi
    return (b.attention_index ?? 0) - (a.attention_index ?? 0)
  })
}

/** Фильтры пишутся в URL (§8.3), поэтому ссылку собираем из текущего состояния. */
function buildHref(filters: Filters): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value)
  }
  const qs = query.toString()
  return qs ? `/katalog/?${qs}` : '/katalog/'
}
