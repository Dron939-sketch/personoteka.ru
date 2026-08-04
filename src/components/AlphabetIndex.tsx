import Link from 'next/link'

import { RU_ALPHABET } from '@/lib/content'
import { translit } from '@/lib/translit'

import styles from './AlphabetIndex.module.css'

/**
 * Алфавитный указатель (§2.1.5, §8.3) — витрина «объективности» и источник органики.
 * Буквы без персон не кликаются, но остаются видимы: указатель должен выглядеть полным.
 */
export function AlphabetIndex({
  counts,
  current,
}: {
  counts: Record<string, number>
  current?: string
}) {
  return (
    <nav className={styles.wrap} aria-label="Алфавитный указатель">
      <ul className={styles.list}>
        {RU_ALPHABET.map((letter) => {
          const count = counts[letter] ?? 0
          const isCurrent = current?.toUpperCase() === letter
          return (
            <li key={letter}>
              {count ? (
                <Link
                  // Слаг буквы — её транслитерация: маршрут `/katalog/ya/`, а не `/katalog/я/`.
                  href={`/katalog/${translit(letter)}/`}
                  className={`${styles.letter} ${isCurrent ? styles.current : ''}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  title={`${count} на «${letter}»`}
                >
                  {letter}
                </Link>
              ) : (
                <span className={`${styles.letter} ${styles.empty}`} aria-disabled="true">
                  {letter}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
