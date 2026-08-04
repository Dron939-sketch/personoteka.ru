'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { SearchBar } from './SearchBar'
import { ThemeToggle } from './ThemeToggle'
import styles from './Header.module.css'

interface Taxon {
  slug: string
  name: string
}

interface Props {
  nav: readonly { href: string; label: string }[]
  spheres: Taxon[]
  cities: Taxon[]
}

type Panel = 'none' | 'mega' | 'search' | 'mobile'

export function HeaderClient({ nav, spheres, cities }: Props) {
  const [panel, setPanel] = useState<Panel>('none')
  const pathname = usePathname()
  const megaId = useId()
  const mobileId = useId()
  const megaRef = useRef<HTMLDivElement>(null)
  const megaButtonRef = useRef<HTMLButtonElement>(null)

  // Переход на другую страницу закрывает любое открытое меню.
  useEffect(() => {
    setPanel('none')
  }, [pathname])

  // Esc закрывает панель и возвращает фокус на кнопку, которая её открыла (§9.3).
  useEffect(() => {
    if (panel === 'none') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (panel === 'mega') megaButtonRef.current?.focus()
      setPanel('none')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [panel])

  // Клик вне мега-меню закрывает его; кнопка обрабатывает свой клик сама.
  useEffect(() => {
    if (panel !== 'mega') return
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (megaRef.current?.contains(target) || megaButtonRef.current?.contains(target)) return
      setPanel('none')
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [panel])

  // Полноэкранное мобильное меню блокирует прокрутку страницы под ним.
  useEffect(() => {
    document.body.style.overflow = panel === 'mobile' ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [panel])

  const toggle = (next: Panel) => setPanel((current) => (current === next ? 'none' : next))
  const isActive = (href: string) => pathname === href || pathname.startsWith(href)

  return (
    <>
      <nav className={styles.desktopNav} aria-label="Основная навигация">
        <ul className={styles.navList}>
          <li>
            <Link
              href="/katalog/"
              className={styles.navLink}
              aria-current={isActive('/katalog/') ? 'page' : undefined}
            >
              Каталог
            </Link>
          </li>
          <li className={styles.megaHost}>
            <button
              ref={megaButtonRef}
              type="button"
              className={styles.navLink}
              aria-expanded={panel === 'mega'}
              aria-controls={megaId}
              onClick={() => toggle('mega')}
            >
              Рубрики
              <svg
                className={styles.chevron}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </li>
          {nav
            .filter((item) => item.href !== '/katalog/')
            .map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={styles.navLink}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          aria-expanded={panel === 'search'}
          onClick={() => toggle('search')}
        >
          <SearchIcon />
          <span className="visually-hidden">Поиск по порталу</span>
        </button>
        <ThemeToggle />
        <Link href="/lk/" className={`${styles.navLink} ${styles.lkLink}`}>
          Кабинет
        </Link>
        <Link href="/razmestit/" className={styles.cta}>
          Разместить биографию
        </Link>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.burger}`}
          aria-expanded={panel === 'mobile'}
          aria-controls={mobileId}
          onClick={() => toggle('mobile')}
        >
          <BurgerIcon open={panel === 'mobile'} />
          <span className="visually-hidden">{panel === 'mobile' ? 'Закрыть меню' : 'Меню'}</span>
        </button>
      </div>

      {panel === 'search' && (
        <div className={styles.searchRow}>
          <SearchBar autoFocus onSubmitted={() => setPanel('none')} />
        </div>
      )}

      {panel === 'mega' && (
        <div id={megaId} ref={megaRef} className={styles.mega}>
          <div className={`container container-wide ${styles.megaGrid}`}>
            <section>
              <h2 className={`caption ${styles.megaTitle}`}>Сферы деятельности</h2>
              <ul className={styles.megaList}>
                {spheres.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/sfera/${s.slug}/`}>{s.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className={`caption ${styles.megaTitle}`}>Города</h2>
              <ul className={styles.megaList}>
                {cities.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/gorod/${c.slug}/`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {panel === 'mobile' && (
        <div id={mobileId} className={styles.mobile}>
          <div className={styles.mobileScroll}>
            <SearchBar onSubmitted={() => setPanel('none')} />
            <ul className={styles.mobileNav}>
              {[{ href: '/katalog/', label: 'Каталог' }, ...nav.filter((n) => n.href !== '/katalog/')].map(
                (item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ),
              )}
              <li>
                <Link href="/lk/">Личный кабинет</Link>
              </li>
            </ul>

            <details className={styles.accordion}>
              <summary>Сферы деятельности</summary>
              <ul className={styles.megaList}>
                {spheres.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/sfera/${s.slug}/`}>{s.name}</Link>
                  </li>
                ))}
              </ul>
            </details>

            <details className={styles.accordion}>
              <summary>Города</summary>
              <ul className={styles.megaList}>
                {cities.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/gorod/${c.slug}/`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          </div>
          <div className={styles.mobileFooter}>
            <Link href="/razmestit/" className={styles.cta}>
              Разместить биографию
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="12" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {open ? (
        <>
          <line x1="3" y1="3" x2="15" y2="15" stroke="currentColor" strokeWidth="1.6" />
          <line x1="15" y1="3" x2="3" y2="15" stroke="currentColor" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.6" />
          <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.6" />
          <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  )
}
