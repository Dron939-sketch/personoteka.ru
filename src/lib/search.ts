/**
 * Клиентский поиск по статическому индексу.
 *
 * MVP: индекс собирается на билде (`scripts/build-search-index.ts`), дополняется
 * опубликованным после сборки (`/api/poisk-index/`) и грузится лениво.
 * В продакшене (§9.1) запросы уходят в Meilisearch/Typesense — морфология и опечатки;
 * тогда меняются только функции этого модуля, компоненты остаются прежними.
 *
 * Все запросы логируются: это сырьё для индекса внимания (§6.2, §13).
 */

export interface SearchDoc {
  slug: string
  name: string
  /** Латиница — чтобы находилось при вводе с некириллической раскладки. */
  latin: string
  tagline: string
  spheres: string[]
  city?: string
  /** Индекс внимания: при равной релевантности выше идёт более заметная персона. */
  score: number
}

let cache: Promise<SearchDoc[]> | null = null

export function loadSearchIndex(): Promise<SearchDoc[]> {
  if (!cache) {
    // Не сам файл, а обработчик: он добавляет к собранному индексу страницы,
    // опубликованные агентствами уже после сборки.
    cache = fetch('/api/poisk-index/')
      .then((r) => (r.ok ? (r.json() as Promise<SearchDoc[]>) : []))
      .catch(() => [])
  }
  return cache
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim()
}

/**
 * Ранжирование: точное начало имени > начало любого слова > вхождение в имя >
 * вхождение в должность. Внутри одного уровня — по индексу внимания.
 */
export function searchPersons(docs: SearchDoc[], query: string, limit = 20): SearchDoc[] {
  const q = normalize(query)
  if (q.length < 2) return []

  const scored = docs
    .map((doc) => {
      const name = normalize(doc.name)
      const latin = normalize(doc.latin)
      const words = name.split(/\s+/)

      let rank = 0
      if (name.startsWith(q) || latin.startsWith(q)) rank = 4
      else if (words.some((w) => w.startsWith(q))) rank = 3
      else if (name.includes(q) || latin.includes(q)) rank = 2
      else if (normalize(doc.tagline).includes(q)) rank = 1

      return { doc, rank }
    })
    .filter((x) => x.rank > 0)

  scored.sort(
    (a, b) =>
      b.rank - a.rank ||
      b.doc.score - a.doc.score ||
      a.doc.name.localeCompare(b.doc.name, 'ru'),
  )

  return scored.slice(0, limit).map((x) => x.doc)
}
