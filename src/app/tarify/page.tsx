import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { PricingTable } from '@/components/PricingTable'
import { PLANS } from '@/lib/plans'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Тарифы',
  description:
    'Тарифы на размещение биографии: базовая биография — 7 500 ₽, расширенная биография, досье под ключ.',
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
