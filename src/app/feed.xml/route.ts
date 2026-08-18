import { articlePath } from '@/lib/articles'
import { getArticles, getNewestPersons } from '@/lib/content'
import { SITE } from '@/lib/site'

/**
 * RSS-лента новостей и интервью (§10.1).
 * Пока редакционная лента пуста, в ленту отдаются свежие биографии: пустой RSS
 * агрегаторы отбрасывают, а обновления справочника — законный повод для подписки.
 */

export const dynamic = 'force-static'
export const revalidate = 3600

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function GET() {
  const articles = getArticles()

  const items = articles.length
    ? articles.map((article) => ({
        title: article.title,
        link: `${SITE.url}${articlePath(article)}`,
        description: article.lead,
        pubDate: new Date(article.published_at).toUTCString(),
      }))
    : getNewestPersons(20).map((person) => ({
        title: `${person.display_name} — ${person.tagline}`,
        link: `${SITE.url}/${person.slug}/`,
        description: person.lead,
        pubDate: new Date(person.published_at).toUTCString(),
      }))

  const body = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>
    </item>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.name}</title>
    <link>${SITE.url}/</link>
    <description>${escapeXml(`${SITE.tagline}. ${SITE.promise}.`)}</description>
    <language>ru</language>
    <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
