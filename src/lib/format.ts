/** Форматирование дат и числительных на русском. Общее для сервера и клиента. */

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

/** `1978-03-12` → «12 марта 1978». С `withYear: false` — «12 марта» (скрытый год, §5.1). */
export function formatDate(iso: string, options?: { withYear?: boolean }): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  if (!y || !m) return iso
  const withYear = options?.withYear !== false
  if (!d) return withYear ? String(y) : ''
  const base = `${d} ${MONTHS_GENITIVE[m - 1]}`
  return withYear ? `${base} ${y}` : base
}

/** Полная дата с годом для `<time datetime>` и подвала страницы. */
export function formatDateTime(iso: string): string {
  return formatDate(iso)
}

/**
 * Возраст на сегодня — для метаданных персоны.
 * Для умершего человека вторым аргументом передаётся дата смерти: возраст
 * должен остановиться на ней, а не расти дальше.
 */
export function calcAge(birthIso: string, today = new Date()): number | null {
  const [y, m, d] = birthIso.split('-').map(Number)
  if (!y || !m || !d) return null
  let age = today.getFullYear() - y
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
}

/** Сколько человек прожил. Возвращает null, если одной из дат нет. */
export function calcLifespan(birthIso?: string, deathIso?: string): number | null {
  if (!birthIso || !deathIso) return null
  const death = new Date(deathIso)
  return Number.isNaN(death.getTime()) ? null : calcAge(birthIso, death)
}

/** «5 персон» / «1 персона» / «22 персоны». */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function personsCount(n: number): string {
  return `${n} ${plural(n, 'персона', 'персоны', 'персон')}`
}

/**
 * Строчная первая буква, остальное как есть.
 * Нужна, чтобы должность вставала в середину заголовка, не теряя имён
 * собственных и аббревиатур: «Губернатор Санкт-Петербурга» → «губернатор
 * Санкт-Петербурга», а не «губернатор санкт-петербурга».
 */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/** Обрезка лида до `description` без разрыва слова — §10.1 (150–160 знаков). */
export function truncateForMeta(text: string, limit = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).replace(/[.,;:—-]$/, '')}…`
}
