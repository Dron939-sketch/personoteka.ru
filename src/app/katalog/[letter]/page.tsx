import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlphabetIndex } from '@/components/AlphabetIndex'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { RU_ALPHABET, getPersons, getPersonsByLetter, personLetter } from '@/lib/content'
import { personsCount } from '@/lib/format'
import { itemListJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'
import { translit } from '@/lib/translit'

import styles from './page.module.css'

/** Алфавитный указатель — `/katalog/a/` … `/katalog/ya/` (§4.1). */

export const dynamicParams = false

export function generateStaticParams() {
  const used = new Set(getPersons().map(personLetter))
  return RU_ALPHABET.filter((letter) => used.has(letter)).map((letter) => ({
    letter: translit(letter),
  }))
}

/** Слаг буквы — её транслитерация: «Я» → `ya`, «Ш» → `sh`. */
function letterFromSlug(slug: string): string | undefined {
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

export default async function LetterPage({ params }: { params: Promise<{ letter: string }> }) {
  const { letter: slug } = await params
  const letter = letterFromSlug(slug)
  if (!letter) notFound()

  const persons = getPersonsByLetter(letter)

  const counts: Record<string, number> = {}
  for (const person of getPersons()) {
    const l = personLetter(person)
    counts[l] = (counts[l] ?? 0) + 1
  }

  return (
    <div className="container">
      <JsonLd data={itemListJsonLd(persons, `Персоны на букву «${letter}»`)} />

      <Breadcrumbs
        items={[{ href: '/katalog/', label: 'Каталог' }, { label: `Буква «${letter}»` }]}
      />

      <PageHeader
        title={`Персоны на букву «${letter}»`}
        lead="Указатель по первой букве фамилии."
        meta={personsCount(persons.length)}
      />

      <AlphabetIndex counts={counts} current={letter} />

      {persons.length === 0 ? (
        <EmptyState title="На эту букву пока никого нет" />
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
