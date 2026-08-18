import type { Metadata } from 'next'

import { ArticlePage } from '@/components/ArticlePage'
import { getArticle, getArticles } from '@/lib/content'
import { truncateForMeta } from '@/lib/format'
import { SITE } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return getArticles('guide').map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: truncateForMeta(article.lead),
    alternates: { canonical: `${SITE.url}/kak-eto-rabotaet/${article.slug}/` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: truncateForMeta(article.lead),
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      // Явный блок `openGraph` перекрывает картинку, унаследованную от корня,
      // поэтому её приходится называть здесь: без этой строки все разборы
      // расходились по мессенджерам без превью.
      images: [
        {
          url: `/kak-eto-rabotaet/${article.slug}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function GuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <ArticlePage slug={slug} kind="guide" />
}
