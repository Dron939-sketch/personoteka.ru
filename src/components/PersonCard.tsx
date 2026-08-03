import Link from 'next/link'

import { getSpheres } from '@/lib/content'
import type { Person } from '@/lib/types'

import { Portrait } from './Portrait'
import { VerifiedBadge } from './VerifiedBadge'
import styles from './PersonCard.module.css'

type Size = 'xl' | 'm' | 's'

interface Props {
  person: Person
  /** XL — витрина главной, M — сетка каталога, S — компактный список (§7.6). */
  size?: Size
  /** Позиция в выдаче: первые карточки грузят портрет с приоритетом. */
  priority?: boolean
}

const PORTRAIT_WIDTH: Record<Size, number> = { xl: 480, m: 320, s: 64 }
const PORTRAIT_SIZES: Record<Size, string> = {
  xl: '(min-width: 1024px) 420px, (min-width: 768px) 40vw, 90vw',
  m: '(min-width: 1024px) 280px, (min-width: 768px) 30vw, 45vw',
  s: '64px',
}

export function PersonCard({ person, size = 'm', priority }: Props) {
  const sphereNames = getSpheres()
    .filter((s) => person.spheres.includes(s.slug))
    .map((s) => s.name)

  return (
    <article className={`${styles.card} ${styles[size]}`}>
      <Link href={`/${person.slug}/`} className={styles.media} tabIndex={-1} aria-hidden="true">
        <Portrait
          person={person}
          width={PORTRAIT_WIDTH[size]}
          sizes={PORTRAIT_SIZES[size]}
          priority={priority}
        />
      </Link>
      <div className={styles.body}>
        <p className={`caption ${styles.sphere}`}>{sphereNames.join(' · ')}</p>
        <h3 className={styles.name}>
          {/* Ссылка растянута на карточку, но кликабельный текст — только имя (§9.3). */}
          <Link href={`/${person.slug}/`} className={styles.link}>
            {person.display_name}
          </Link>
        </h3>
        <p className={styles.tagline}>{person.tagline}</p>
        {size === 'xl' && <p className={styles.lead}>{person.lead}</p>}
        <p className={styles.meta}>
          {person.verified && <VerifiedBadge person={person} compact={size === 's'} />}
          {typeof person.attention_index === 'number' && (
            <span className={`tabular ${styles.index}`}>
              Индекс {Math.round(person.attention_index)}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}
