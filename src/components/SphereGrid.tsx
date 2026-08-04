import Link from 'next/link'

import { personsCount } from '@/lib/format'
import type { Person, Sphere } from '@/lib/types'

import styles from './SphereGrid.module.css'

/** Плитка сфер (§8.2, блок 5) — вторая после алфавита витрина «объективности». */
export function SphereGrid({ spheres, persons }: { spheres: Sphere[]; persons: Person[] }) {
  const counts = new Map<string, number>()
  for (const person of persons) {
    for (const slug of person.spheres) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }

  return (
    <ul className={styles.grid}>
      {spheres.map((sphere) => {
        const count = counts.get(sphere.slug) ?? 0
        return (
          <li key={sphere.slug} className={styles.item}>
            <Link href={`/sfera/${sphere.slug}/`} className={styles.link}>
              <span className={styles.name}>{sphere.name}</span>
              <span className={styles.count}>{count ? personsCount(count) : 'скоро'}</span>
            </Link>
            <p className={styles.description}>{sphere.description}</p>
          </li>
        )
      })}
    </ul>
  )
}
