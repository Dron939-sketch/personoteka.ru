import { getArticle, getArticles } from '@/lib/content'
import type { Article } from '@/lib/types'

/**
 * «Что читать дальше» — ручная карта продолжений между гайдами.
 *
 * Зачем руками. Гайдов пятнадцать, у них нет тегов и почти нет упоминаний
 * персон, так что автоматическая похожесть считалась бы по заголовкам и
 * выдавала бы случайные пары. На таком объёме связь «этот текст читают
 * после этого» человек проставляет точнее любой метрики, и пересматривать
 * её нужно раз в несколько статей, а не каждый день.
 *
 * Порядок в списке — порядок показа. Что не хватает до нужного числа,
 * добирается свежими гайдами: у нового материала связей ещё нет, но
 * тупиком он быть не должен.
 */
const NEXT: Record<string, string[]> = {
  'kak-napisat-biografiyu-o-sebe': [
    'gde-opublikovat-biografiyu-o-sebe',
    'zachem-ekspertu-publichnaya-biografiya',
    'biografiya-dlya-premii-i-granta',
  ],
  'gde-opublikovat-biografiyu-o-sebe': [
    'kak-napisat-biografiyu-o-sebe',
    'kak-popast-v-vikipediyu',
    'zachem-ekspertu-publichnaya-biografiya',
  ],
  'zachem-ekspertu-publichnaya-biografiya': [
    'kak-napisat-biografiyu-o-sebe',
    'lichnyj-brend-eksperta-s-chego-nachat',
    'precedent-kak-sdelat-chtoby-vas-iskali',
  ],
  'biografiya-dlya-premii-i-granta': [
    'kak-napisat-biografiyu-o-sebe',
    'zachem-ekspertu-publichnaya-biografiya',
    'gde-opublikovat-biografiyu-o-sebe',
  ],
  'kak-popast-v-vikipediyu': [
    'pochemu-nelzya-napisat-o-sebe-v-vikipedii',
    'gde-opublikovat-biografiyu-o-sebe',
    'precedent-kak-sdelat-chtoby-vas-iskali',
  ],
  'pochemu-nelzya-napisat-o-sebe-v-vikipedii': [
    'kak-popast-v-vikipediyu',
    'gde-opublikovat-biografiyu-o-sebe',
    'kak-napisat-biografiyu-o-sebe',
  ],
  'chto-takoe-cifrovoj-sled': [
    'chto-delat-esli-o-vas-pishut-nepravdu',
    'precedent-kak-sdelat-chtoby-vas-iskali',
    'gde-opublikovat-biografiyu-o-sebe',
  ],
  'chto-delat-esli-o-vas-pishut-nepravdu': [
    'chto-takoe-cifrovoj-sled',
    'kak-otlichit-nastoyashchij-rejting-ot-zakaznogo',
    'gde-opublikovat-biografiyu-o-sebe',
  ],
  'precedent-kak-sdelat-chtoby-vas-iskali': [
    'chto-takoe-cifrovoj-sled',
    'lichnyj-brend-eksperta-s-chego-nachat',
    'zachem-ekspertu-publichnaya-biografiya',
  ],
  'lichnyj-brend-eksperta-s-chego-nachat': [
    'sindrom-samozvanca-u-eksperta',
    'zachem-ekspertu-publichnaya-biografiya',
    'precedent-kak-sdelat-chtoby-vas-iskali',
  ],
  'sindrom-samozvanca-u-eksperta': [
    'lichnyj-brend-eksperta-s-chego-nachat',
    'zachem-ekspertu-publichnaya-biografiya',
    'kak-napisat-biografiyu-o-sebe',
  ],
  'kak-delayut-zvyozd': [
    'kak-otlichit-nastoyashchij-rejting-ot-zakaznogo',
    'na-chem-zarabatyvayut-blogery',
    'chto-takoe-cifrovoj-sled',
  ],
  'kak-otlichit-nastoyashchij-rejting-ot-zakaznogo': [
    'kak-delayut-zvyozd',
    'chto-delat-esli-o-vas-pishut-nepravdu',
    'na-chem-zarabatyvayut-blogery',
  ],
  'na-chem-zarabatyvayut-blogery': [
    'kak-delayut-zvyozd',
    'lichnyj-brend-eksperta-s-chego-nachat',
    'kak-otlichit-nastoyashchij-rejting-ot-zakaznogo',
  ],
  'proletarij-ili-intelligent': [
    'lichnyj-brend-eksperta-s-chego-nachat',
    'zachem-ekspertu-publichnaya-biografiya',
    'na-chem-zarabatyvayut-blogery',
  ],
}

/** Продолжения для гайда: сначала из карты, потом свежие — чтобы не было тупика. */
export function getReadNext(slug: string, limit = 3): Article[] {
  const picked: Article[] = []
  const seen = new Set<string>([slug])

  for (const next of NEXT[slug] ?? []) {
    if (picked.length >= limit || seen.has(next)) continue
    const article = getArticle(next)
    if (article) {
      picked.push(article)
      seen.add(next)
    }
  }
  if (picked.length >= limit) return picked

  const fresh = getArticles('guide')
    .filter((a) => !seen.has(a.slug))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
  return [...picked, ...fresh].slice(0, limit)
}

/** Подборка по списку адресов — для посадочных, у которых нет своего slug. */
export function getArticlesBySlugs(slugs: string[]): Article[] {
  return slugs.map((s) => getArticle(s)).filter((a): a is Article => Boolean(a))
}
