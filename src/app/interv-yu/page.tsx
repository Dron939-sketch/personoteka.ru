import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Интервью',
  description: 'Интервью с героями «Персонотеки»: разговоры о работе, решениях и профессии.',
  alternates: { canonical: `${SITE.url}/interv-yu/` },
}

export default function InterviewsPage() {
  const articles = getArticles('interview')

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Интервью' }]} />

      <PageHeader
        title="Интервью"
        lead="Разговоры с героями справочника. Партнёрские материалы помечаются явно."
      />

      {articles.length === 0 ? (
        <EmptyState
          title="Раздел готовится"
          hint={
            <>
              Первые интервью выйдут вместе с запуском редакционной ленты. Правила работы с
              героями — в <Link href="/redpolitika/">редакционной политике</Link>.
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
