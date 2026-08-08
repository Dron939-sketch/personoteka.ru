import { notFound } from 'next/navigation'

import { AdDisclosure } from '@/components/AdSlot'
import { ArticleBody, ArticleMentions } from '@/components/ArticleBody'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CTAStrip } from '@/components/CTAStrip'
import { JsonLd } from '@/components/JsonLd'
import { PageHeader } from '@/components/PageHeader'
import { ARTICLE_ROOT, articleHref } from '@/lib/article-href'
import { getArticle, getEditor } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { articleJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'
import type { Article } from '@/lib/types'

export const SECTION_LABEL: Record<Article['kind'], string> = {
  interview: 'Интервью',
  news: 'Новости',
  guide: 'Как это работает',
}

/**
 * Страница редакционного материала. Одна на все три вида: различаются только
 * корень адреса и подпись раздела, всё остальное — общая верстка и разметка.
 */
export function ArticlePage({ slug, kind }: { slug: string; kind: Article['kind'] }) {
  const article = getArticle(slug)
  // Материал другого вида по этому адресу — не наша страница: у него свой
  // канонический адрес, и отдавать его копию в чужом разделе значит плодить
  // дубли (§4.1).
  if (!article || article.kind !== kind) notFound()

  const url = `${SITE.url}${articleHref(article)}`
  const author = getEditor(article.author)
  const authorName = author?.name ?? 'Редакция «Персонотеки»'

  return (
    <div className="container">
      <JsonLd data={articleJsonLd(article, url, authorName)} />

      <Breadcrumbs
        items={[
          { href: ARTICLE_ROOT[kind], label: SECTION_LABEL[kind] },
          { label: article.title },
        ]}
      />

      <PageHeader
        title={article.title}
        lead={article.lead}
        meta={
          <>
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            {' · '}
            {authorName}
          </>
        }
      />

      {article.sponsored && <AdDisclosure erid={article.erid} />}

      <ArticleBody body={article.body} />
      <ArticleMentions slugs={article.mentions} />

      <CTAStrip />
    </div>
  )
}
