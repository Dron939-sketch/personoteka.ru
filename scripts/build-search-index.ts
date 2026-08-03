/**
 * Сборка статического индекса поиска (`public/search-index.json`).
 *
 *   npx tsx scripts/build-search-index.ts
 *
 * Запускается автоматически перед `next build` (см. скрипт `prebuild`).
 * Индекс намеренно узкий — только то, что нужно саджесту по имени: имя, латиница,
 * должность, сфера, город и индекс внимания для сортировки при равной релевантности.
 * В продакшене его заменяет Meilisearch (§9.1), контракт полей остаётся тем же.
 */
import fs from 'node:fs'
import path from 'node:path'

import type { Person, RatingSnapshot } from '../src/lib/types'

const root = process.cwd()
const personsDir = path.join(root, 'content/persons')
const ratingPath = path.join(root, 'content/rating.json')
const outPath = path.join(root, 'public/search-index.json')

const rating: RatingSnapshot = fs.existsSync(ratingPath)
  ? (JSON.parse(fs.readFileSync(ratingPath, 'utf8')) as RatingSnapshot)
  : { computed_at: '', entries: [] }

const scores = new Map(rating.entries.map((e) => [e.slug, e.attention_index]))

const docs = fs
  .readdirSync(personsDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(personsDir, file), 'utf8')) as Person)
  .filter((person) => person.status === 'published' && !person.noindex)
  .map((person) => ({
    slug: person.slug,
    name: person.display_name,
    latin: person.name_latin,
    tagline: person.tagline,
    spheres: person.spheres,
    city: person.city,
    score: scores.get(person.slug) ?? 0,
  }))
  .sort((a, b) => b.score - a.score)

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(docs)}\n`, 'utf8')

const kb = (fs.statSync(outPath).size / 1024).toFixed(1)
console.log(`Индекс поиска собран: ${docs.length} записей, ${kb} КБ`)
