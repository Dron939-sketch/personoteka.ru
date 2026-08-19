/**
 * Постраничный вывод списков персон.
 *
 * Каталог отдавал все биографии одной страницей: к 606 персонам это 1,9 МБ
 * разметки и 548 изображений на один запрос, у `/gorod/moskva/` — 1,6 МБ.
 * Страдают обе стороны. Читатель на телефоне выкачивает мегабайты ради первого
 * экрана; поисковый робот тратит на один адрес обход, которого хватило бы на
 * десятки, и рискует не дочитать разметку до конца. Причём рост линейный:
 * каждая новая биография утяжеляет все списки, где она появляется.
 *
 * Страницы адресуются путём (`/katalog/stranica/2/`), а не параметром запроса:
 * в `robots.txt` весь `/katalog/?…` закрыт от обхода, и нумерация через `?page=`
 * увела бы половину каталога из индекса.
 */

/**
 * Размер страницы. Кратен трём и четырём — при любой ширины сетке последний
 * ряд остаётся заполненным, без «хвоста» из одной карточки.
 */
export const PAGE_SIZE = 48

export interface Paged<T> {
  items: T[]
  page: number
  pages: number
  total: number
}

/** Разбирает номер страницы из адреса. Мусор и единица считаются первой страницей. */
export function parsePage(raw: string | undefined): number {
  if (!raw) return 1
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 0 // 0 — признак негодного номера
}

export function paginate<T>(items: T[], page: number): Paged<T> {
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(Math.max(page, 1), pages)
  const start = (current - 1) * PAGE_SIZE
  return { items: items.slice(start, start + PAGE_SIZE), page: current, pages, total }
}

/**
 * Адрес страницы списка. Первая страница живёт на самом разделе, без `/stranica/1/`:
 * иначе у одного и того же содержимого оказалось бы два адреса.
 */
export function pageHref(base: string, page: number): string {
  const root = base.endsWith('/') ? base : `${base}/`
  return page <= 1 ? root : `${root}stranica/${page}/`
}

/** Номера страниц для `generateStaticParams` — со второй, первая лежит на разделе. */
export function pageParams(total: number): { page: string }[] {
  const pages = Math.ceil(total / PAGE_SIZE)
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ page: String(i + 2) }))
}

/**
 * Приписка к заголовку и описанию на второй и дальше страницах. Без неё все
 * страницы списка несут одинаковые title и description, и поисковик считает их
 * дублями — при том что содержимое у них разное.
 */
export function pageSuffix(page: number, pages: number): string {
  return page > 1 ? ` — страница ${page} из ${pages}` : ''
}
