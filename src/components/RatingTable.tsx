import Link from 'next/link'

import type { Person, RatingEntry, Sphere } from '@/lib/types'

import { VerifiedBadge } from './VerifiedBadge'
import styles from './RatingTable.module.css'

interface Row {
  entry: RatingEntry
  person: Person
}

/**
 * Таблица индекса внимания (§6.2). Настоящая таблица с `<caption>` и `scope` —
 * требование доступности §9.3.
 */
export function RatingTable({
  rows,
  spheres,
  caption,
  inSphere,
}: {
  rows: Row[]
  spheres: Sphere[]
  caption: string
  /** В рейтинге одной сферы место показывается внутри когорты, а не общее. */
  inSphere?: boolean
}) {
  const sphereName = (slug: string) => spheres.find((s) => s.slug === slug)?.name ?? slug

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.rank}>
              №
            </th>
            <th scope="col">Персона</th>
            <th scope="col" className={styles.sphereCol}>
              Сфера
            </th>
            <th scope="col" className={styles.num}>
              Индекс
            </th>
            <th scope="col" className={styles.num}>
              Динамика
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ entry, person }) => (
            <tr key={entry.slug}>
              <td className={`tabular ${styles.rank}`}>
                {inSphere ? entry.rank_in_sphere : entry.rank_overall}
              </td>
              <th scope="row" className={styles.person}>
                <Link href={`/${person.slug}/`}>{person.display_name}</Link>
                {person.verified && <VerifiedBadge person={person} compact />}
                <span className={styles.tagline}>{person.tagline}</span>
              </th>
              <td className={styles.sphereCol}>{sphereName(entry.sphere)}</td>
              <td className={`tabular ${styles.num} ${styles.index}`}>
                {entry.attention_index.toFixed(1)}
              </td>
              <td className={`tabular ${styles.num}`}>
                <Delta value={entry.delta} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Направление дублируется знаком и текстом: цвет не единственный носитель смысла (§7.2). */
function Delta({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className={styles.flat}>
        —<span className="visually-hidden"> без изменений</span>
      </span>
    )
  }
  const up = value > 0
  return (
    <span className={up ? styles.up : styles.down}>
      {up ? '↑' : '↓'}
      {Math.abs(value)}
      <span className="visually-hidden">
        {up ? ' позиций вверх' : ' позиций вниз'}
      </span>
    </span>
  )
}
