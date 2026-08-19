import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlphabetIndex } from '@/components/AlphabetIndex'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { PersonCard } from '@/components/PersonCard'
import { RU_ALPHABET, getPersons, getPersonsByLetter, personLetter } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { paginate } from '@/lib/pagination'
import { SITE } from '@/lib/site'
import { translit } from '@/lib/translit'

import styles from './page.module.css'

/** Алфавитный указатель — `/katalog/a/` … `/katalog/ya/` (§4.1). */

// Неизвестный параметр рендерится по запросу и упирается в notFound() ниже — это
// честная 404. С `false` Next вместо неё пишет в лог NoFallbackError на каждый
// битый адрес: страница всё равно отдаётся, но лог засоряется, а причину не видно.
export const dynamicParams = true

export function generateStaticParams() {
  const used = new Set(getPersons().map(personLetter))
  return RU_ALPHABET.filter((letter) => used.has(letter)).map((letter) => ({
    letter: translit(letter),
  }))
}

/** Слаг буквы — её транслитерация: «Я» → `ya`, «Ш» → `sh`. */
export function letterFromSlug(slug: string): string | undefined {
  return RU_ALPHABET.find((letter) => translit(letter) === slug.toLowerCase())
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ letter: string }>
}): Promise<Metadata> {
  const { letter: slug } = await params
  const letter = letterFromSlug(slug)
  if (!letter) return {}

  return {
    title: `Персоны на букву «${letter}»`,
    description: `Биографии людей, чья фамилия начинается на «${letter}»: алфавитный указатель «Персонотеки».`,
    alternates: { canonical: `${SITE.url}/katalog/${slug}/` },
  }
}

export async function LetterView({
  params,
  page = 1,
}: {
  params: Promise<{ letter: string }>
  page?: number
}) {
  const { letter: slug } = await params
  const letter = letterFromSlug(slug)
  if (!letter) notFound()

  const persons = getPersonsByLetter(letter)

  // Список режется на страницы: цельный вывод давал до 1,6 МБ разметки

  // на один адрес. Номер вне диапазона — 404, а не пустая страница.

  const paged = paginate(persons, page)

  if (page < 1 || page > paged.pages) notFound()

  const counts: Record<string, number> = {}
  for (const person of getPersons()) {
    const l = personLetter(person)
    counts[l] = (counts[l] ?? 0) + 1
  }

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(paged.items, `Персоны на букву «${letter}»`)} />

      <Breadcrumbs
        items={[{ href: '/katalog/', label: 'Каталог' }, { label: `Буква «${letter}»` }]}
      />

      <PageHeader
        title={`Персоны на букву «${letter}»`}
        lead="Указатель по первой букве фамилии."
        meta={personsCount(paged.total)}
      />

      <AlphabetIndex counts={counts} current={letter} />

      {persons.length === 0 ? (
        <EmptyState title="На эту букву пока никого нет" />
      ) : (
        <div className={styles.grid}>
          {paged.items.map((person, i) => (
            <PersonCard key={person.slug} person={person} size="m" priority={i < 4} />
          ))}
        </div>
      )}

    <Pagination
      base={`/katalog/${slug}/`}
      page={paged.page}
      pages={paged.pages}
      total={paged.total}
    />
    </div>
  )
}

/** Первая страница раздела; остальные — на `stranica/N/`, тем же видом. */
export default function LetterPage({ params }: { params: Promise<{ letter: string }> }) {
  return <LetterView params={params} page={1} />
}
