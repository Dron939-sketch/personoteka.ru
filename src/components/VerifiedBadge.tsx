import { formatDate } from '@/lib/format'
import type { Person } from '@/lib/types'

import styles from './VerifiedBadge.module.css'

const SCOPE_LABELS: Record<string, string> = {
  identity: 'личность',
  position: 'должность',
  education: 'образование',
  awards: 'награды',
}

/**
 * Значок «Проверено» (§6.4). Ставится только после сверки документов;
 * купить его отдельно от проверки нельзя.
 *
 * Тултип объясняет, что именно проверялось. Цвет не единственный носитель смысла:
 * рядом иконка и подпись (§7.2).
 */
export function VerifiedBadge({ person, compact }: { person: Person; compact?: boolean }) {
  if (!person.verified) return null

  const scope = (person.verified_scope ?? []).map((s) => SCOPE_LABELS[s]).filter(Boolean)
  const title = scope.length
    ? `Редакция проверила по документам: ${scope.join(', ')}` +
      (person.verified_at ? `. Дата проверки: ${formatDate(person.verified_at)}` : '')
    : 'Сведения проверены редакцией по документам'

  return (
    <span className={`${styles.badge} ${compact ? styles.compact : ''}`} title={title}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
        <path
          d="M2.5 7.3 5.6 10.4 11.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Проверено</span>
      <span className="visually-hidden">. {title}</span>
    </span>
  )
}
