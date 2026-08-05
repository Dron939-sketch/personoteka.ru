import Link from 'next/link'

import { LkLogout } from '@/components/LkLogout'
import { lkSession } from '@/lib/lk-session'

import styles from './layout.module.css'

/**
 * Общая обвязка кабинета. Навигация зависит от роли: агентство не должно видеть
 * ссылок на редакционные разделы, куда его всё равно не пустит middleware —
 * ссылка в никуда хуже, чем её отсутствие.
 */
export default async function LkLayout({ children }: { children: React.ReactNode }) {
  const session = await lkSession()
  const agency = session?.role === 'agency'

  return (
    <div className="container">
      <div className={styles.bar}>
        <nav className={styles.nav} aria-label="Разделы кабинета">
          {agency ? (
            <>
              <Link href="/lk/agentstvo/">Мои страницы</Link>
              <Link href="/lk/agentstvo/novaya/">Новая биография</Link>
            </>
          ) : (
            <>
              <Link href="/lk/">Обзор</Link>
              <Link href="/lk/zayavki/">Заявки и запросы</Link>
              <Link href="/lk/agentskie/">Материалы агентств</Link>
              <Link href="/lk/ochered/">Очередь</Link>
              <Link href="/lk/kachestvo/">Качество карточек</Link>
            </>
          )}
        </nav>
        <LkLogout />
      </div>
      {children}
    </div>
  )
}
