import styles from './MetaList.module.css'

export interface MetaItem {
  label: string
  value: React.ReactNode
}

/**
 * Компактный список «ключ — значение» (§3.2, §8.1).
 * Явные пары ключ-значение — одно из требований к видимости в AI-выдаче (§10.4),
 * поэтому это настоящий <dl>, а не таблица из div-ов.
 */
export function MetaList({ items }: { items: MetaItem[] }) {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== '')
  if (!visible.length) return null

  return (
    <dl className={styles.list}>
      {visible.map((item) => (
        <div className={styles.row} key={item.label}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
