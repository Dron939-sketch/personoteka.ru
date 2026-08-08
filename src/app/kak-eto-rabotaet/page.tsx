import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Раздел объясняющих статей (§5.2). Отдельно от новостей и интервью: у этих
 * материалов нет повода и нет собеседника — они отвечают на вопрос, который
 * человек задаёт поиску сам, — см. `content/KONTENT-STRATEGIYA.md`.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Как это работает',
    description:
      'Разборы того, как устроены публичность, репутация и цифровой след: что видно о человеке в интернете, кто это решает и что с этим можно сделать.',
    alternates: { canonical: `${SITE.url}/kak-eto-rabotaet/` },
    // Пустой раздел в индексе не нужен — та же логика, что в /novosti/.
    robots: getArticles('guide').length ? undefined : { index: false, follow: true },
  }
}

export default function GuidesPage() {
  const articles = getArticles('guide')

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Как это работает' }]} />

      <PageHeader
        title="Как это работает"
        lead="Разборы механизмов, которые определяют, что о человеке знают: поисковая выдача, цифровой след, редакционные правила, деньги медиа."
      />

      {articles.length === 0 ? (
        <EmptyState
          title="Раздел готовится"
          hint={
            <>
              Пока актуальное — в <Link href="/katalog/">каталоге</Link> и{' '}
              <Link href="/rejting/">рейтинге</Link>.
            </>
          }
        />
      ) : (
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
