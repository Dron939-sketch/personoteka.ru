import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Как это работает',
  description:
    'Разборы механизмов, которыми на человека действуют деньги, влияние, отношения и собственные эмоции. Без новостного повода — материалы, которые не устаревают.',
  alternates: {
    canonical: `${SITE.url}/kak-eto-rabotaet/`,
    types: { 'application/rss+xml': `${SITE.url}/feed.xml` },
  },
}

export default function HowItWorksPage() {
  const articles = getArticles('how')

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Как это работает' }]} />

      <PageHeader
        title="Как это работает"
        lead="Разборы устройства: деньги, влияние, отношения, решения. Не новости и не советы — механика того, что происходит с человеком каждый день."
        meta={<a href="/feed.xml">RSS-лента</a>}
      />

      {articles.length === 0 ? (
        <EmptyState
          title="Разборов пока нет"
          hint={
            <>
              Первые материалы появятся вместе с редакционной лентой. Пока актуальное — в{' '}
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
