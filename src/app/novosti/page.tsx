import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Новости',
  description: 'Редакционная лента «Персонотеки»: обновления справочника и материалы редакции.',
  alternates: {
    canonical: `${SITE.url}/novosti/`,
    types: { 'application/rss+xml': `${SITE.url}/feed.xml` },
  },
}

export default function NewsPage() {
  const articles = getArticles('news')

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Новости' }]} />

      <PageHeader
        title="Новости"
        lead="Что происходит в справочнике: пополнения базы, изменения правил, итоги рейтинга."
        meta={
          <a href="/feed.xml">RSS-лента</a>
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          title="Лента пока пуста"
          hint={
            <>
              Публикации появятся вместе с запуском редакционной ленты. Пока актуальное — в{' '}
              <Link href="/rejting/">рейтинге</Link> и{' '}
              <Link href="/katalog/">каталоге</Link>.
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
