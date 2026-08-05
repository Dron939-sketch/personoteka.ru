import Link from 'next/link'

import { LkLogout } from '@/components/LkLogout'

import styles from './layout.module.css'

/** Общая обвязка кабинета: навигация по разделам и выход. */
export default function LkLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <div className={styles.bar}>
        <nav className={styles.nav} aria-label="Разделы кабинета">
          <Link href="/lk/">Обзор</Link>
          <Link href="/lk/zayavki/">Заявки и запросы</Link>
          <Link href="/lk/ochered/">Очередь</Link>
          <Link href="/lk/kachestvo/">Качество карточек</Link>
        </nav>
        <LkLogout />
      </div>
      {children}
    </div>
  )
}
