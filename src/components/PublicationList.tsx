import { formatDate } from '@/lib/format'
import type { Achievement, Publication } from '@/lib/types'

import styles from './PersonSections.module.css'

/** Награды, премии, звания. Каждая строка при наличии несёт ссылку на источник (§5.3). */
export function AchievementList({ items }: { items: Achievement[] }) {
  if (!items.length) return null

  return (
    <ul className={styles.rows}>
      {items.map((item, i) => (
        <li className={styles.row} key={`${item.title}-${i}`}>
          <span className={`tabular ${styles.rowYear}`}>{item.year ?? '—'}</span>
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>{item.title}</span>
            {(item.issuer || item.source) && (
              <span className={styles.rowMeta}>
                {item.issuer}
                {item.issuer && item.source ? ' · ' : ''}
                {item.source ? `источник: ${item.source}` : ''}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Публикации автора и упоминания в СМИ — то, что отличает справочник от рекламы (§3.2). */
export function PublicationList({ items }: { items: Publication[] }) {
  if (!items.length) return null

  return (
    <ul className={styles.rows}>
      {items.map((item, i) => (
        <li className={styles.row} key={`${item.title}-${i}`}>
          <span className={`tabular ${styles.rowYear}`}>
            {item.date ? item.date.slice(0, 4) : '—'}
          </span>
          <span className={styles.rowMain}>
            <span className={styles.rowTitle}>
              {item.url ? (
                <a href={item.url} rel="nofollow noopener" target="_blank">
                  {item.title}
                </a>
              ) : (
                item.title
              )}
            </span>
            <span className={styles.rowMeta}>
              {item.outlet}
              {item.date ? ` · ${formatDate(item.date)}` : ''}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
