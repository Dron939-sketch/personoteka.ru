import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

export function generateMetadata(): Metadata {
  return {
    title: 'Интервью',
    description: 'Интервью с героями «Персонотеки»: разговоры о работе, решениях и профессии.',
    alternates: { canonical: `${SITE.url}/interv-yu/` },
    // Пустой раздел закрыт от индекса — §10.1. Страница со списком, в котором
    // ничего нет, для поисковика неотличима от ошибки: на молодом домене такие
    // адреса портят оценку качества всего сайта. `follow` оставлен: ссылки
    // отсюда на каталог и рейтинг обходить нужно. Как только выйдет первый
    // материал, запрет снимется сам.
    robots: getArticles('interview').length ? undefined : { index: false, follow: true },
  }
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
