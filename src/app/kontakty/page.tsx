import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Контакты',
  description: 'Как связаться с редакцией «Персонотеки»: почта, порядок обращений, реквизиты.',
  alternates: { canonical: `${SITE.url}/kontakty/` },
}

export default function ContactsPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Контакты' }]} />

      <PageHeader title="Контакты" lead="Редакция отвечает в рабочие дни." />

      <div className="prose" style={{ paddingBottom: 'var(--sp-16)' }}>
        <h2>Почта</h2>
        <p>
          Общие вопросы и обращения: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>

        <h2>По темам</h2>
        <ul>
          <li>
            Разместить биографию — <Link href="/razmestit/">форма заявки</Link>.
          </li>
          <li>
            Исправить или удалить данные — <Link href="/udalenie-dannyh/">форма запроса</Link>{' '}
            (это единственный способ, который фиксирует срок реакции).
          </li>
          <li>
            Сообщить об ошибке в биографии — та же форма, с указанием ссылки на страницу.
          </li>
          <li>
            Реклама и партнёрские материалы — <Link href="/reklama/">условия</Link>.
          </li>
        </ul>

        <h2>Реквизиты</h2>
        <p>
          {SITE.legal.entity || 'Реквизиты юридического лица будут опубликованы после регистрации.'}
          {SITE.legal.inn ? ` ИНН ${SITE.legal.inn}.` : ''}
        </p>
        <p>
          Договор-оферта на размещение публикуется здесь же вместе с реквизитами. До этого
          момента договор высылается редактором в ответ на заявку.
        </p>
      </div>
    </div>
  )
}
