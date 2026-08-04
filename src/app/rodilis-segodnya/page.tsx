import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { getBornOn } from '@/lib/content'
import { calcAge, formatDate, personsCount } from '@/lib/format'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * «Родились сегодня» (§4.1) — динамическая витрина.
 * Дата считается по московскому времени: витрина должна меняться в полночь по Москве,
 * а не по часовому поясу сервера.
 */

export const metadata: Metadata = {
  title: 'Родились сегодня',
  description:
    'Персоны, у которых сегодня день рождения: биографии, карьера, достижения.',
  alternates: { canonical: `${SITE.url}/rodilis-segodnya/` },
}

export const revalidate = 3600

function moscowToday(): { month: number; day: number; label: string } {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date())
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const month = get('month')
  const day = get('day')
  const year = get('year')
  return {
    month,
    day,
    label: formatDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, {
      withYear: false,
    }),
  }
}

export default function BornTodayPage() {
  const { month, day, label } = moscowToday()
  const persons = getBornOn(month, day)

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Родились сегодня' }]} />

      <PageHeader
        title="Родились сегодня"
        lead={`${label} — дни рождения персон «Персонотеки».`}
        meta={persons.length ? personsCount(persons.length) : undefined}
      />

      {persons.length === 0 ? (
        <EmptyState
          title="Сегодня именинников в базе нет"
          hint={<Link href="/katalog/">Открыть каталог персон</Link>}
        />
      ) : (
        <div className={styles.grid}>
          {persons.map((person, i) => {
            const age = person.birth_date ? calcAge(person.birth_date) : null
            return (
              <div key={person.slug}>
                <PersonCard person={person} size="m" priority={i < 4} />
                {age !== null && person.birth_year_public !== false && (
                  <p className={styles.age}>Исполняется {age}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
