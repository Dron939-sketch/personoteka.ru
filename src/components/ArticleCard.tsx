import Link from 'next/link'

import { formatDate } from '@/lib/format'
import type { Article } from '@/lib/types'

import styles from './ArticleCard.module.css'

const KIND_LABEL: Record<Article['kind'], string> = {
  interview: 'Интервью',
  news: 'Новость',
}

/**
 * Карточка материала редакционной ленты.
 * Партнёрский материал помечается явно — без пометки такие тексты не публикуются (§2.2).
 */
export function ArticleCard({ article }: { article: Article }) {
  const href = article.kind === 'interview' ? `/interv-yu/${article.slug}/` : `/novosti/${article.slug}/`

  return (
    <article className={styles.card}>
      <p className={`caption ${styles.kind}`}>
        {KIND_LABEL[article.kind]}
        {article.sponsored ? ' · Партнёрский материал' : ''}
      </p>
      <h3 className={styles.title}>
        <Link href={href}>{article.title}</Link>
      </h3>
      <p className={styles.lead}>{article.lead}</p>
      <p className={styles.meta}>
        <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
      </p>
    </article>
  )
}
