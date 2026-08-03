'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { loadSearchIndex, searchPersons, type SearchDoc } from '@/lib/search'

import styles from './SearchBar.module.css'

interface Props {
  autoFocus?: boolean
  defaultValue?: string
  onSubmitted?: () => void
}

/**
 * Поиск по имени с саджестом (§4.2, §7.6).
 *
 * Индекс (`/search-index.json`) грузится лениво — при первом фокусе, а не при загрузке
 * страницы: это держит бюджет JS страницы персоны (§9.2). В продакшене саджест уходит
 * в Meilisearch/Typesense, меняется только `src/lib/search.ts`.
 *
 * Клавиатура: ↑/↓ — по подсказкам, Enter — переход, Esc — закрыть (комбобокс WAI-ARIA).
 */
export function SearchBar({ autoFocus, defaultValue = '', onSubmitted }: Props) {
  const [query, setQuery] = useState(defaultValue)
  const [docs, setDocs] = useState<SearchDoc[] | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const router = useRouter()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const ensureIndex = () => {
    if (docs === null) void loadSearchIndex().then(setDocs)
  }

  const results = docs && query.trim().length >= 2 ? searchPersons(docs, query, 6) : []

  useEffect(() => {
    setActive(-1)
  }, [query])

  const go = (href: string) => {
    setOpen(false)
    onSubmitted?.()
    router.push(href)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault()
      go(`/${results[active].slug}/`)
    }
  }

  return (
    <form
      className={styles.form}
      role="search"
      action="/poisk/"
      method="get"
      onSubmit={() => onSubmitted?.()}
    >
      <div className={styles.field}>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="12" y1="12" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          name="q"
          value={query}
          placeholder="Имя и фамилия"
          aria-label="Поиск персоны по имени"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onFocus={() => {
            ensureIndex()
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        />
        <button type="submit" className={styles.submit}>
          Найти
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className={styles.suggest} id={listId} role="listbox" aria-label="Подсказки">
          {results.map((doc, i) => (
            <li key={doc.slug} role="presentation">
              <Link
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`${styles.suggestItem} ${i === active ? styles.suggestActive : ''}`}
                href={`/${doc.slug}/`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  go(`/${doc.slug}/`)
                }}
              >
                <span className={styles.suggestName}>{doc.name}</span>
                <span className={styles.suggestTag}>{doc.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
