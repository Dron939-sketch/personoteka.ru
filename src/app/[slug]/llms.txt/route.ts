import { getPerson, getPersons } from '@/lib/content'
import { personMarkdown } from '@/lib/person-markdown'

/**
 * `/<slug>/llms.txt` — та же биография в Markdown, без разметки и навигации (§10.4).
 *
 * Адрес указан в `<link rel="alternate" type="text/markdown">` на самой странице
 * и перечислен в корневом llms.txt, поэтому ассистент находит его сам.
 */

export const dynamic = 'force-static'
// Как и на самой странице: персона, добавленная в рантайме, не должна упираться
// в NoFallbackError — она рендерится по запросу, а несуществующая даёт 404.
export const dynamicParams = true
export const revalidate = 3600

export function generateStaticParams() {
  return getPersons().map((person) => ({ slug: person.slug }))
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = getPerson(slug)
  if (!person) return new Response('Not found', { status: 404 })

  return new Response(personMarkdown(person), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
