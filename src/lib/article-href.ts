import type { Article } from './types'

/**
 * Адрес материала. Раздел определяется видом: у каждого вида свой корень,
 * потому что запросы к ним разные — новость ищут по поводу, интервью по имени
 * собеседника, объясняющую статью по самому вопросу (§5.2).
 */
export function articleHref(article: Pick<Article, 'kind' | 'slug'>): string {
  return `${ARTICLE_ROOT[article.kind]}${article.slug}/`
}

export const ARTICLE_ROOT: Record<Article['kind'], string> = {
  interview: '/interv-yu/',
  news: '/novosti/',
  guide: '/kak-eto-rabotaet/',
}
