import Link from 'next/link'

import { getPopulatedCities, getSpheres } from '@/lib/content'
import { NAV } from '@/lib/site'

import { HeaderClient } from './HeaderClient'
import { Logo } from './Logo'
import styles from './Header.module.css'

/**
 * Шапка (§4.2): логотип, «Каталог», мега-меню рубрик на 2 колонки (сферы и города),
 * «Рейтинг», «Интервью», поиск, акцентная кнопка «Разместить биографию», вход в ЛК.
 *
 * Серверный компонент готовит данные рубрик; интерактив (мега-меню, бургер, поиск,
 * переключатель темы) живёт в HeaderClient.
 */
export function Header() {
  const spheres = getSpheres().map((s) => ({ slug: s.slug, name: s.name }))
  const cities = getPopulatedCities().map((c) => ({ slug: c.slug, name: c.name }))

  return (
    <header className={styles.header}>
      <div className={`container-wide container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label={`${'Персонотека'} — на главную`}>
          <Logo />
        </Link>
        <HeaderClient nav={NAV} spheres={spheres} cities={cities} />
      </div>
    </header>
  )
}
