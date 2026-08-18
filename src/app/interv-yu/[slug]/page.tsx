import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticlePage } from '@/components/ArticlePage'
import { articleMetadata, articleParams, findArticle } from '@/lib/article-route'

/** Материал рубрики. Вёрстка общая — см. `ArticlePage`. */

export const dynamic = 'force-static'

export function generateStaticParams() {
  return articleParams('interview')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  return articleMetadata('interview', (await params).slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const article = findArticle('interview', (await params).slug)
  if (!article) notFound()
  return <ArticlePage article={article} />
}
