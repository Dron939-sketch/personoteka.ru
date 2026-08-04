import { getArticles } from '@/lib/content'
import { SITE } from '@/lib/site'
import { XML_HEADERS, urlset } from '@/lib/sitemap'

/** Карта редакционных материалов (§10.1). */

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const urls = getArticles().map((article) => ({
    loc: `${SITE.url}/${article.kind === 'interview' ? 'interv-yu' : 'novosti'}/${article.slug}/`,
    lastmod: article.updated_at,
    changefreq: 'monthly' as const,
    priority: 0.6,
  }))

  return new Response(urlset(urls), { headers: XML_HEADERS })
}
