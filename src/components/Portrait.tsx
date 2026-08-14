import Image from 'next/image'

import { lowerFirst } from '@/lib/format'
import type { Person } from '@/lib/types'

import styles from './Portrait.module.css'

interface Props {
  person: Person
  /** Ширина отрисовки в CSS-пикселях — от неё считается srcset. */
  width: number
  /** Портрет героя — LCP-элемент страницы персоны, грузится с приоритетом (§9.2). */
  priority?: boolean
  sizes?: string
  className?: string
}

/**
 * Портрет 4:5 (§7.5). Если фото нет — монограмма из инициалов на --surface-alt;
 * «серый силуэт человека» запрещён дизайн-системой.
 *
 * alt по шаблону §9.3: «Портрет: Иван Иванов, врач-кардиолог».
 */
export function Portrait({ person, width, priority, sizes, className }: Props) {
  const height = Math.round((width * 5) / 4)
  const portrait = person.photos?.find((p) => p.portrait) ?? person.photos?.[0]
  const alt = `Портрет: ${person.display_name}, ${lowerFirst(person.tagline)}`

  if (!portrait) {
    return (
      <div
        className={`${styles.frame} ${styles.monogram} ${className ?? ''}`}
        style={{ aspectRatio: '4 / 5' }}
        role="img"
        aria-label={`${person.display_name} — фотография не предоставлена`}
      >
        <span className={styles.initials} aria-hidden="true">
          {initials(person.display_name)}
        </span>
      </div>
    )
  }

  return (
    <Image
      className={`${styles.frame} ${className ?? ''}`}
      src={portrait.src}
      alt={portrait.alt ?? alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      // Явные размеры + фиксированное соотношение сторон: нулевой сдвиг макета (§9.2).
      style={{ aspectRatio: '4 / 5', objectFit: 'cover' }}
    />
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}
