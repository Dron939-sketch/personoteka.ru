import type { TimelineEvent } from '@/lib/types'

import styles from './Timeline.module.css'

/**
 * Хронология достижений (§3.2) — самый узнаваемый элемент жанра.
 * Маркеры — латунь как декор (§7.2: accent-500 текстом не используется).
 */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return null

  return (
    <ol className={styles.timeline}>
      {events.map((event, i) => (
        <li className={styles.item} key={`${event.year}-${i}`}>
          <span className={`tabular ${styles.year}`}>{event.year}</span>
          <div className={styles.body}>
            <h3 className={styles.title}>{event.title}</h3>
            {event.description && <p className={styles.description}>{event.description}</p>}
            {event.source && <p className={styles.source}>Источник: {event.source}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
