import type { Metadata } from 'next'

import { ARTICLE_KINDS } from './articles'
import { getArticles } from './content'
import { truncateForMeta } from './format'
import { SITE } from './site'
import type { Article } from './types'

/**
 * Общая начинка маршрутов отдельного материала.
 *
 * Рубрики различаются только адресом, поэтому три файла маршрутов сведены к
 * трём вызовам отсюда: правка метаданных или списка адресов делается один раз
 * и сразу для всех рубрик.
 */

export function articleParams(kind: Article['kind']) {
  return getArticles(kind).map((article) => ({ slug: article.slug }))
}

export function findArticle(kind: Article['kind'], slug: string): Article | undefined {
  return getArticles(kind).find((article) => article.slug === slug)
}

export function articleMetadata(kind: Article['kind'], slug: string): Metadata {
  const article = findArticle(kind, slug)
  if (!article) return {}

  const url = `${SITE.url}/${ARTICLE_KINDS[kind].segment}/${article.slug}/`
  const description = truncateForMeta(article.lead)

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: article.title,
      description,
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      ...(article.cover ? { images: [{ url: article.cover.src }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  }
}
