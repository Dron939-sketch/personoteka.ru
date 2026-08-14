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

/** Возраст на сегодня — для метаданных персоны. */
export function calcAge(birthIso: string, today = new Date()): number | null {
  const [y, m, d] = birthIso.split('-').map(Number)
  if (!y || !m || !d) return null
  let age = today.getFullYear() - y
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
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

/** Обрезка лида до `description` без разрыва слова — §10.1 (150–160 знаков). */
/**
 * Строчная только первая буква — остальная строка не трогается.
 *
 * В заголовке страницы амплуа идёт после тире и с прописной читалось бы как
 * начало нового предложения. Приводить к нижнему регистру всю строку нельзя:
 * в амплуа живут имена собственные — «вДудь», «Вашингтон Кэпиталз», МГУ, НХЛ,
 * Российская Федерация. Заголовок — самая заметная строка в выдаче, и
 * «министр иностранных дел российской федерации» в ней выглядит опечаткой.
 */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Заголовок страницы персоны по §10.1: «Имя — амплуа: биография, карьера, достижения».
 *
 * Шаблон рассчитан на короткое амплуа. У руководителей оно длинное —
 * «председатель Государственной Думы Федерального Собрания Российской Федерации», —
 * и полный заголовок вырастал до 141 знака при том, что поисковая выдача
 * показывает около шестидесяти. Всё, что за обрезом, до читателя не доходит,
 * а имя и должность — ровно то, по чему человека ищут.
 *
 * Поэтому отбрасывается хвост «биография, карьера, достижения»: он одинаков
 * у всех страниц и в выдаче ничего не различает.
 *
 * Само амплуа при этом не обрезается, даже если заголовок остаётся длинным.
 * Обрыв по границе слова даёт «министр иностранных дел Российской» и
 * «председатель Центрального» — фразу, разрубленную посередине. Поисковик
 * длинный заголовок всего лишь сократит на экране, оставив себе весь текст
 * для оценки соответствия запросу; обрезка на сервере выбрасывает слова
 * насовсем, вместе с запросами, по которым страницу нашли бы.
 */
export function personTitle(name: string, tagline: string, suffix = '', limit = 65): string {
  const role = lowerFirst(tagline)
  const full = `${name} — ${role}: биография, карьера, достижения`

  return full.length + suffix.length <= limit ? full : `${name} — ${role}`
}

export function truncateForMeta(text: string, limit = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= limit) return clean
  const cut = clean.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).replace(/[.,;:—-]$/, '')}…`
}
