import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { PricingTable } from '@/components/PricingTable'
import { PLANS } from '@/lib/plans'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Сколько стоит разместить биографию — тарифы',
  description:
    'Сколько стоит разместить биографию в «Персонотеке»: страница о себе — 7 500 ₽ бессрочно, доступ для агентств — 25 000 ₽ в месяц, досье под ключ по расчёту.',
  alternates: { canonical: `${SITE.url}/tarify/` },
}

export default function PricingPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Тарифы' }]} />

      <PageHeader
        title="Тарифы"
        lead="Размещение бессрочное: страница остаётся в каталоге и не снимается при отсутствии продлений."
      />

      <PricingTable plans={PLANS} />

      <section className="section">
        <h2 className="ruled">Как считается лимит агентства</h2>
        <div className="prose">
          <ul>
            <li>
              Десять биографий — на календарный месяц подписки. Неиспользованные места
              не переносятся на следующий месяц: подписка оплачивает доступ, а не пакет
              страниц.
            </li>
            <li>
              Правки уже опубликованных страниц лимит не тратят — сколько угодно и когда
              угодно.
            </li>
            <li>
              Страница, снятая по редполитике, лимит возвращает. Отказ — это наша оценка
              материала, платить за неё агентство не должно.
            </li>
            <li>
              Одиннадцатая и последующие биографии в том же месяце — по цене базового
              размещения.
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <h2 className="ruled">Что не входит ни в один тариф</h2>
        <div className="prose">
          <ul>
            <li>
              Значок «Проверено» отдельно от проверки. Он ставится только после сверки
              документов — иначе теряет смысл.
            </li>
            <li>
              Место в рейтинге. Индекс внимания считается по{' '}
              <Link href="/rejting/">открытой методике</Link> и не продаётся.
            </li>
            <li>
              Публикация сведений, которые редакция не может подтвердить. Непроверяемые
              регалии — основание для отказа (см.{' '}
              <Link href="/redpolitika/">редполитику</Link>).
            </li>
          </ul>
          <p>
            Платное размещение оформляется договором. Если по итогам юридической
            квалификации тариф признаётся рекламой, материал маркируется соответствующим
            образом, а данные передаются в ОРД.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="ruled">Готовы начать</h2>
        <p className="prose">
          Оставьте заявку на странице <Link href="/razmestit/">«Разместить биографию»</Link> —
          редактор ответит в течение рабочего дня.
        </p>
      </section>
    </div>
  )
}
