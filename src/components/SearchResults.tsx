'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { loadSearchIndex, searchPersons, type SearchDoc } from '@/lib/search'

import { SearchBar } from './SearchBar'
import styles from './SearchResults.module.css'

/**
 * Выдача поиска. Работает на том же статическом индексе, что и саджест в шапке
 * (`src/lib/search.ts`) — при переезде на Meilisearch меняется только этот модуль.
 */
export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [docs, setDocs] = useState<SearchDoc[] | null>(null)

  useEffect(() => {
    void loadSearchIndex().then(setDocs)
  }, [])

  useEffect(() => {
    // Запросы во внутреннем поиске — сырьё для индекса внимания (§6.2, §13).
    if (query.trim().length >= 2) {
      // TODO: заменить на отправку события `search_query` в аналитику,
      // когда будет подключён сбор событий §13.
    }
  }, [query])

  const results = docs ? searchPersons(docs, query, 50) : []
  const loading = docs === null && query.length >= 2

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <SearchBar defaultValue={query} />
      </div>

      {query.trim().length < 2 ? (
        <p className={styles.hint}>Введите не менее двух символов.</p>
      ) : loading ? (
        <p className={styles.hint}>Ищем…</p>
      ) : results.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>По запросу «{query}» ничего не найдено</p>
          <p className={styles.hint}>
            Проверьте написание или откройте <Link href="/katalog/">каталог персон</Link>. Если
            нужной биографии ещё нет, её можно{' '}
            <Link href="/razmestit/">предложить редакции</Link>.
          </p>
        </div>
      ) : (
        <>
          <p className={styles.count}>Найдено: {results.length}</p>
          <ul className={styles.list}>
            {results.map((doc) => (
              <li key={doc.slug} className={styles.item}>
                <Link href={`/${doc.slug}/`} className={styles.name}>
                  {doc.name}
                </Link>
                <span className={styles.tagline}>{doc.tagline}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
