'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

import styles from './FilterPanel.module.css'

interface Option {
  slug: string
  name: string
}

export interface Filters {
  sfera?: string
  gorod?: string
  desyatiletie?: string
  proverennye?: string
  sort?: string
  vid?: string
}

/**
 * Фильтры каталога (§8.3). Обычная GET-форма: состояние живёт в URL
 * (`/katalog/?sfera=medicina&gorod=moskva`), страница работает и без JS,
 * а JS лишь отправляет форму сразу при выборе значения.
 */
export function FilterPanel({
  spheres,
  cities,
  decades,
  filters,
}: {
  spheres: Option[]
  cities: Option[]
  decades: string[]
  filters: Filters
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const submit = () => formRef.current?.requestSubmit()

  /**
   * Нативная отправка формы кладёт в URL и пустые поля (`?gorod=&desyatiletie=`).
   * Такой адрес попадает в закладки и в отчёты аналитики, поэтому при включённом JS
   * собираем строку запроса сами и оставляем только выбранные значения.
   * Без JS работает обычная отправка — с лишними пустыми параметрами, но работает.
   */
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new URLSearchParams()
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === 'string' && value) query.set(key, value)
    }
    const qs = query.toString()
    router.push(qs ? `/katalog/?${qs}` : '/katalog/')
  }

  return (
    <form ref={formRef} className={styles.panel} action="/katalog/" method="get" onSubmit={onSubmit}>
      <h2 className={`caption ${styles.title}`}>Фильтры</h2>

      {/* Сортировка и вид переносятся в новый URL, чтобы выбор не сбрасывался. */}
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
      {filters.vid && <input type="hidden" name="vid" value={filters.vid} />}

      <label className={styles.field}>
        <span className={styles.label}>Сфера</span>
        <select name="sfera" defaultValue={filters.sfera ?? ''} onChange={submit}>
          <option value="">Все сферы</option>
          {spheres.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Город</span>
        <select name="gorod" defaultValue={filters.gorod ?? ''} onChange={submit}>
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Десятилетие рождения</span>
        <select name="desyatiletie" defaultValue={filters.desyatiletie ?? ''} onChange={submit}>
          <option value="">Любое</option>
          {decades.map((d) => (
            <option key={d} value={d}>
              {d}-е
            </option>
          ))}
        </select>
      </label>

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="proverennye"
          value="1"
          defaultChecked={filters.proverennye === '1'}
          onChange={submit}
        />
        <span>Только проверенные редакцией</span>
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.apply}>
          Применить
        </button>
        <a href="/katalog/" className={styles.reset}>
          Сбросить
        </a>
      </div>
    </form>
  )
}
