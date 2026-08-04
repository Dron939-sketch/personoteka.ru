import type { RatingEntry, RatingSnapshot } from './types'

/**
 * Индекс внимания — §6.2 ТЗ.
 *
 * attention_index =
 *     0.35 * norm(внутренние поисковые запросы по персоне за 30 дней)
 *   + 0.25 * norm(уникальные просмотры страницы за 30 дней)
 *   + 0.15 * norm(глубина чтения: доля дочитавших до 75 %)
 *   + 0.15 * norm(переходы по внешним ссылкам персоны)
 *   + 0.10 * freshness(дней с последнего обновления, полураспад 90 дней)
 *
 * norm() — минимакс по когорте сферы: врачи не конкурируют с артистами.
 * Функция чистая и детерминированная — пересчёт воспроизводим на тестовых данных
 * (критерий приёмки §15).
 */

export const WEIGHTS = {
  searches: 0.35,
  views: 0.25,
  depth: 0.15,
  outbound: 0.15,
  freshness: 0.1,
} as const

export const FRESHNESS_HALF_LIFE_DAYS = 90

/** Сырые метрики персоны за окно 30 дней. Источник — лог внутреннего поиска и события §13. */
export interface PersonMetrics {
  slug: string
  /** Когорта нормализации — первая (основная) сфера персоны. */
  sphere: string
  /** Внутренние поисковые запросы по имени персоны за 30 дней. */
  searches: number
  /** Уникальные просмотры страницы за 30 дней (после отсечения ботов). */
  views: number
  /** Доля дочитавших до 75 %, 0..1. */
  read_depth: number
  /** Переходы по внешним ссылкам персоны. */
  outbound_clicks: number
  /** Дней с последнего обновления страницы. */
  days_since_update: number
  /** Персона снята с рейтинга за накрутку (§6.2, антифрод) — в выдачу не попадает. */
  excluded?: boolean
}

/** Минимакс внутри когорты. Если разброса нет, все получают 0.5 — не 0 и не 1. */
function minmax(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  if (max <= min) return 0.5
  return (value - min) / (max - min)
}

/** Экспоненциальное затухание свежести с полураспадом 90 дней. */
export function freshness(daysSinceUpdate: number, halfLife = FRESHNESS_HALF_LIFE_DAYS): number {
  if (daysSinceUpdate <= 0) return 1
  return Math.pow(0.5, daysSinceUpdate / halfLife)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Считает индекс и места. Возвращает значения 0..100.
 * `previous` — прошлый снапшот, нужен только для поля `delta` (изменение места).
 */
export function computeRating(
  metrics: PersonMetrics[],
  computedAt: string,
  previous?: RatingSnapshot,
): RatingSnapshot {
  // Персоны без единого сигнала в рейтинг не попадают. Иначе на старте, когда
  // аналитика ещё не набрана, минимакс присвоил бы всем одинаковые 0.5, и витрина
  // показывала бы одинаковый «индекс внимания» у всех — число, не значащее ничего.
  const active = metrics.filter(
    (m) =>
      !m.excluded && (m.searches > 0 || m.views > 0 || m.outbound_clicks > 0 || m.read_depth > 0),
  )

  const byCohort = new Map<string, PersonMetrics[]>()
  for (const m of active) {
    const cohort = byCohort.get(m.sphere) ?? []
    cohort.push(m)
    byCohort.set(m.sphere, cohort)
  }

  const scored: { slug: string; sphere: string; attention_index: number }[] = []

  for (const [sphere, cohort] of byCohort) {
    const bounds = (pick: (m: PersonMetrics) => number) => {
      const values = cohort.map(pick)
      return { min: Math.min(...values), max: Math.max(...values) }
    }
    const s = bounds((m) => m.searches)
    const v = bounds((m) => m.views)
    const d = bounds((m) => m.read_depth)
    const o = bounds((m) => m.outbound_clicks)

    for (const m of cohort) {
      const score =
        WEIGHTS.searches * minmax(m.searches, s.min, s.max) +
        WEIGHTS.views * minmax(m.views, v.min, v.max) +
        WEIGHTS.depth * minmax(m.read_depth, d.min, d.max) +
        WEIGHTS.outbound * minmax(m.outbound_clicks, o.min, o.max) +
        WEIGHTS.freshness * freshness(m.days_since_update)
      scored.push({ slug: m.slug, sphere, attention_index: round2(score * 100) })
    }
  }

  // Общий рейтинг: по индексу, при равенстве — по слагу, чтобы порядок был воспроизводим.
  scored.sort((a, b) => b.attention_index - a.attention_index || a.slug.localeCompare(b.slug))

  const prevRank = new Map(previous?.entries.map((e) => [e.slug, e.rank_overall]) ?? [])
  const sphereCounters = new Map<string, number>()

  const entries: RatingEntry[] = scored.map((item, i) => {
    const rankInSphere = (sphereCounters.get(item.sphere) ?? 0) + 1
    sphereCounters.set(item.sphere, rankInSphere)
    const before = prevRank.get(item.slug)
    return {
      slug: item.slug,
      sphere: item.sphere,
      attention_index: item.attention_index,
      rank_overall: i + 1,
      rank_in_sphere: rankInSphere,
      // Рост места = положительная дельта: было 14-е, стало 9-е → +5.
      delta: before === undefined ? 0 : before - (i + 1),
    }
  })

  return { computed_at: computedAt, entries }
}
