import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LeadForm } from '@/components/LeadForm'
import { PageHeader } from '@/components/PageHeader'
import { REMOVAL_SLA } from '@/lib/consent'
import { SITE } from '@/lib/site'

/**
 * Форма запроса на удаление и исправление данных — §11.3 (ст. 10.3 149-ФЗ,
 * ст. 14 152-ФЗ). Регламент реакции публичный: 3 рабочих дня на подтверждение,
 * 10 — на мотивированное решение.
 */

export const metadata: Metadata = {
  title: 'Удаление и исправление данных',
  description:
    'Как потребовать исправить или удалить сведения о себе в «Персонотеке»: форма запроса и сроки реакции редакции.',
  alternates: { canonical: `${SITE.url}/udalenie-dannyh/` },
  robots: { index: true, follow: true },
}

export default function RemovalPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Удаление и исправление данных' }]} />

      <PageHeader
        title="Удаление и исправление данных"
        lead="Если на портале опубликованы неточные сведения о вас или вы отзываете согласие на публикацию — заполните форму. Запрос регистрируется и получает номер."
      />

      <div className="prose">
        <h2>Сроки</h2>
        <ul>
          <li>
            Подтверждение получения запроса — {REMOVAL_SLA.acknowledge_business_days}{' '}
            рабочих дня.
          </li>
          <li>
            Мотивированное решение — {REMOVAL_SLA.decide_business_days} рабочих дней.
          </li>
          <li>
            Отказ оформляется письменно с указанием причин; его можно обжаловать в
            Роскомнадзоре или в суде.
          </li>
        </ul>

        <h2>Что приложить</h2>
        <p>
          Укажите ссылку на страницу и конкретный фрагмент, который требуется исправить или
          удалить. Для запросов об удалении мы просим подтвердить, что вы — субъект данных:
          способ подтверждения редакция сообщит в ответном письме. Копии документов
          удостоверяющих личность через форму отправлять не нужно и не следует.
        </p>

        <h2>Отзыв согласия</h2>
        <p>
          Отзыв согласия на распространение персональных данных влечёт снятие страницы с
          публикации. Уже проиндексированные копии в поисковых системах исчезают не мгновенно
          — мы направляем запросы на переобход, но сроки зависят от поисковой системы.
        </p>
      </div>

      <section className="section">
        <LeadForm
          kind="removal"
          title="Запрос на исправление или удаление"
          submitLabel="Отправить запрос"
        />
      </section>

      <p style={{ paddingBottom: 'var(--sp-16)', fontSize: 'var(--small)', color: 'var(--ink-3)' }}>
        Тот же запрос можно направить письмом на {SITE.email}. Порядок обработки описан в{' '}
        <Link href="/politika-konfidencialnosti/">политике обработки персональных данных</Link>.
      </p>
    </div>
  )
}
