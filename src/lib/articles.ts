import type { Article } from './types'

/**
 * Рубрики редакционных материалов: адрес раздела и подписи к нему.
 *
 * Раскладка «рубрика → адрес» жила в трёх местах сразу — в карточке материала,
 * в карте сайта и в RSS, — и в каждом была своя тернарная развилка. Пока рубрик
 * было две, это сходило с рук; на третьей такая развилка молча отправила бы
 * новый раздел по чужому адресу. Здесь единственный источник правды.
 */
export const ARTICLE_KINDS = {
  news: {
    segment: 'novosti',
    title: 'Новости',
    one: 'Новость',
  },
  interview: {
    segment: 'interv-yu',
    title: 'Интервью',
    one: 'Интервью',
  },
  how: {
    segment: 'kak-eto-rabotaet',
    title: 'Как это работает',
    one: 'Разбор',
  },
} as const satisfies Record<Article['kind'], { segment: string; title: string; one: string }>

export function articlePath(article: Pick<Article, 'kind' | 'slug'>): string {
  return `/${ARTICLE_KINDS[article.kind].segment}/${article.slug}/`
}
