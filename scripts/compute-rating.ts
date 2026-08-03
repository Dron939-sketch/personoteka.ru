/**
 * Ночной пересчёт индекса внимания — §6.2 ТЗ.
 *
 *   npx tsx scripts/compute-rating.ts
 *
 * Читает сырые метрики (`content/metrics.json`), считает индекс чистой функцией
 * `computeRating` и перезаписывает снапшот `content/rating.json`.
 * Прошлый снапшот используется только для расчёта изменения места (`delta`).
 *
 * В продакшене метрики приходят из лога внутреннего поиска и событий §13,
 * а запуск вешается на крон; сама формула и её результат от источника не зависят —
 * поэтому пересчёт воспроизводим на тестовых данных (критерий приёмки §15).
 */
import fs from 'node:fs'
import path from 'node:path'

import { computeRating, type PersonMetrics } from '../src/lib/rating'
import type { RatingSnapshot } from '../src/lib/types'

const CONTENT = path.join(process.cwd(), 'content')
const metricsPath = path.join(CONTENT, 'metrics.json')
const ratingPath = path.join(CONTENT, 'rating.json')

const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8')) as PersonMetrics[]

const previous: RatingSnapshot | undefined = fs.existsSync(ratingPath)
  ? (JSON.parse(fs.readFileSync(ratingPath, 'utf8')) as RatingSnapshot)
  : undefined

// Время пересчёта берётся из аргумента, чтобы прогон на тестовых данных был детерминирован.
const computedAt = process.argv[2] ?? new Date().toISOString()

const snapshot = computeRating(metrics, computedAt, previous)

fs.writeFileSync(ratingPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

const excluded = metrics.filter((m) => m.excluded).length
console.log(
  `Индекс внимания пересчитан: ${snapshot.entries.length} персон` +
    (excluded ? `, исключено за накрутку: ${excluded}` : ''),
)
for (const e of snapshot.entries.slice(0, 5)) {
  console.log(`  ${e.rank_overall}. ${e.slug} — ${e.attention_index}`)
}
