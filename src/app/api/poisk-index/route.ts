import fs from 'node:fs'
import path from 'node:path'

import { getPersons, getRatingEntry } from '@/lib/content'
import type { SearchDoc } from '@/lib/search'

/**
 * Индекс поиска: собранный на сборке файл плюс то, что опубликовано после неё.
 *
 * Статический `public/search-index.json` знает только редакционные материалы —
 * он собирается перед `next build`. Агентская страница появляется на сайте
 * позже, и без этого обработчика она была бы недоступна поиску по порталу до
 * следующего деплоя: страница есть, в каталоге есть, а по имени не находится.
 *
 * Файл читается как есть, а не пересобирается: пересборка на каждый запрос
 * стоила бы чтения двух сотен карточек ради нескольких добавленных.
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  const file = path.join(process.cwd(), 'public/search-index.json')
  let docs: SearchDoc[] = []
  try {
    docs = JSON.parse(fs.readFileSync(file, 'utf8')) as SearchDoc[]
  } catch {
    // Файла нет — отдадим хотя бы то, что видно слою контента.
  }

  const known = new Set(docs.map((d) => d.slug))
  const extra: SearchDoc[] = getPersons()
    .filter((person) => !known.has(person.slug) && !person.noindex)
    .map((person) => ({
      slug: person.slug,
      name: person.display_name,
      latin: person.name_latin,
      tagline: person.tagline,
      spheres: person.spheres,
      city: person.city,
      score: getRatingEntry(person.slug)?.attention_index ?? 0,
    }))

  const all = [...docs, ...extra].sort((a, b) => b.score - a.score)

  return Response.json(all, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' },
  })
}
