import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Личный кабинет (§8.5) — этап 6 дорожной карты (§15).
 * Пока раздел не реализован, страница объясняет, что будет доступно, и не даёт
 * ложного входа. Раздел закрыт от индексации в robots.txt (§10.1).
 */

export const metadata: Metadata = {
  title: 'Личный кабинет',
  description: 'Личный кабинет владельца профиля и кабинет агентства «Персонотеки».',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/` },
}

const ROLES = [
  {
    title: 'Владелец профиля',
    items: [
      'Статистика просмотров и поисковых запросов к профилю',
      'Динамика индекса внимания',
      'Заявка на правку биографии',
      'Скачивание PDF-досье',
      'Продление и подключение дополнений',
    ],
  },
  {
    title: 'Агентство',
    items: [
      'Список подопечных персон',
      'Массовое создание заявок',
      'Счета и закрывающие документы',
      'Отчёт для клиента в PDF',
    ],
  },
  {
    title: 'Редактор и модератор',
    items: [
      'Очередь на модерацию',
      'Чек-лист проверки документов',
      'История правок с указанием автора',
    ],
  },
]

export default function AccountPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Личный кабинет' }]} />

      <PageHeader
        title="Личный кабинет"
        lead="Раздел в разработке. Ниже — что в нём будет и для кого."
      />

      <div className={styles.grid}>
        {ROLES.map((role) => (
          <section key={role.title} className={styles.card}>
            <h2 className={styles.cardTitle}>{role.title}</h2>
            <ul className={styles.list}>
              {role.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className={styles.note}>
        Пока кабинет не запущен, статистику и правки запрашивайте у редактора: заявка — на
        странице <Link href="/razmestit/">размещения</Link>, исправления —{' '}
        <Link href="/udalenie-dannyh/">через форму</Link>.
      </p>
    </div>
  )
}
