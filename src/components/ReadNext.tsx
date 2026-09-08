import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import type { Article } from '@/lib/types'

import styles from './ReadNext.module.css'

/**
 * «Что читать дальше» в конце материала.
 *
 * До этого блока гайд заканчивался призывом разместить биографию — и всё:
 * человек, который ещё ничего не решил, упирался в тупик. Средняя глубина
 * визита на сайте была 1,2 страницы при 632 биографиях и 15 гайдах: люди
 * не отказывались ходить дальше, им было некуда.
 *
 * Ссылка в каталог стоит рядом с материалами намеренно: библиотека —
 * главное доказательство, что справочник живой, и увидеть её стоит до
 * того, как человек решает, нужна ли ему своя страница.
 */
export function ReadNext({
  articles,
  title = 'Что читать дальше',
  catalogue = true,
}: {
  articles: Article[]
  title?: string
  catalogue?: boolean
}) {
  if (!articles.length) return null

  return (
    <section className={styles.block}>
      <h2 className="ruled">{title}</h2>
      <div className={styles.grid}>
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
      {catalogue && (
        <p className={styles.more}>
          <Link href="/katalog/">Каталог персон</Link> — биографии по редакционным
          правилам, со сферами, городами и источниками.
        </p>
      )}
    </section>
  )
}
