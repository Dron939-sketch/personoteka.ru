import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeader } from '@/components/PageHeader'
import { SITE } from '@/lib/site'

/** Условия размещения рекламы. Правила маркировки — §11.4. */

export const metadata: Metadata = {
  title: 'Реклама',
  description:
    'Где на «Персонотеке» размещается реклама, как она маркируется и чего мы не делаем.',
  alternates: { canonical: `${SITE.url}/reklama/` },
}

export default function AdvertisingPage() {
  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Реклама' }]} />

      <PageHeader
        title="Реклама"
        lead="Правила простые: реклама помечена как реклама, а страницы персон от неё свободны."
      />

      <div className="prose" style={{ paddingBottom: 'var(--sp-16)' }}>
        <h2>Где показывается реклама</h2>
        <ul>
          <li>В редакционных разделах — партнёрские материалы с явной пометкой.</li>
        </ul>
        <p>
          На страницах персон сторонней рекламы нет. Клиент платит за свою страницу и не
          должен видеть на ней чужие объявления.
        </p>

        <h2>Маркировка</h2>
        <p>
          Рекламные материалы сопровождаются пометкой «Реклама», указанием рекламодателя и
          идентификатором <span className="tabular">erid</span>. Сведения передаются
          оператору рекламных данных в порядке, предусмотренном законодательством.
        </p>

        <h2>Чего мы не делаем</h2>
        <ul>
          <li>Не публикуем рекламные материалы без пометки.</li>
          <li>Не продаём место в <Link href="/rejting/">рейтинге</Link>.</li>
          <li>
            Не размещаем рекламу, противоречащую{' '}
            <Link href="/redpolitika/">редакционной политике</Link>.
          </li>
        </ul>

        <h2>Связаться</h2>
        <p>
          Предложения по размещению — на <a href={`mailto:${SITE.email}`}>{SITE.email}</a> с
          пометкой «Реклама».
        </p>
      </div>
    </div>
  )
}
