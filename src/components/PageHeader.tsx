import styles from './PageHeader.module.css'

/** Заголовок раздела: H1, подзаголовок и счётчик. Общий для каталога, рубрик и рейтинга. */
export function PageHeader({
  title,
  lead,
  meta,
  children,
}: {
  title: string
  lead?: string
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {meta && <p className={styles.meta}>{meta}</p>}
      {children}
    </header>
  )
}

/** Пустое состояние выдачи (§7.6) — всегда с подсказкой, что делать дальше. */
export function EmptyState({ title, hint }: { title: string; hint?: React.ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  )
}
