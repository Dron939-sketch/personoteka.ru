import { foreignAgentNoticeText } from '@/lib/foreign-agent'
import type { Person } from '@/lib/types'

import styles from './ForeignAgentNotice.module.css'

/**
 * Маркировка материала о лице, включённом в реестр иностранных агентов (255-ФЗ).
 *
 * Требования к оформлению: текст на русском языке, заглавными буквами, размещён
 * перед основным содержанием материала и заметно выделен. Сама формулировка —
 * в `lib/foreign-agent`: её же несёт PDF-досье.
 *
 * В ТЗ этого требования нет; оно добавлено, потому что без него материал о таком
 * лице публиковать нельзя. Пометка выставляется редакцией по актуальному реестру
 * Минюста, см. поле `foreign_agent` в контент-модели.
 */
export function ForeignAgentNotice({ person }: { person: Person }) {
  const text = foreignAgentNoticeText(person)
  if (!text) return null

  return (
    <p className={styles.notice} role="note">
      {text}
    </p>
  )
}
