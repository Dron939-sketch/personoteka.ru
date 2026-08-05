import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LeadForm } from '@/components/LeadForm'
import { PageHeader } from '@/components/PageHeader'
import { PersonCard } from '@/components/PersonCard'
import { PricingTable } from '@/components/PricingTable'
import { getPersons } from '@/lib/content'
import { PLANS, WORKFLOW_STEPS } from '@/lib/plans'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Коммерческий лендинг (§8.4) — единственная страница, где допустим прямой
 * коммерческий язык. Даже здесь он сдержанный: слова «пиар», «раскрутка»,
 * «успешный успех» запрещены во всей публичной части (§1.3).
 */

export const metadata: Metadata = {
  title: 'Разместить биографию',
  description:
    'Как разместить официальную биографию в «Персонотеке»: этапы работы, тарифы, редакционные требования и форма заявки.',
  alternates: { canonical: `${SITE.url}/razmestit/` },
}

export default function PlacementPage() {
  const examples = getPersons()
    .filter((p) => p.plan === 'agency' || p.plan === 'base')
    .slice(0, 3)

  return (
    <div className="container">
      <Breadcrumbs items={[{ label: 'Разместить биографию' }]} />

      <PageHeader
        title="Разместить биографию"
        lead="Постоянная страница с вашей биографией на домене справочника: с проверяемыми фактами, источниками, датой обновления и подписью редактора."
      />

      {/* Проблема */}
      <section className="section">
        <h2 className="ruled">Зачем это нужно</h2>
        <div className="prose">
          <p>
            По запросу «Имя Фамилия» поисковая выдача обычно состоит из чужих ресурсов:
            соцсетей, агрегаторов отзывов, случайных упоминаний. Ни один из них вы не
            контролируете и ни один не выглядит как справка о человеке.
          </p>
          <p>
            Страница в «Персонотеке» решает узкую задачу: даёт версию биографии, на которую
            можно сослаться — в резюме, пресс-ките, заявке на премию, переговорном пакете.
          </p>
        </div>
      </section>

      {/* Что вы получаете */}
      <section className="section">
        <h2 className="ruled">Что входит</h2>
        <ul className={styles.benefits}>
          <li>
            <h3>Страница по редакционной структуре</h3>
            <p>
              Лид, ранние годы, карьера, хронология, факты, достижения, публикации,
              источники. Тон нейтральный, третье лицо, без превосходных степеней.
            </p>
          </li>
          <li>
            <h3>PDF-досье</h3>
            <p>
              Свёрстанный файл с портретом, ключевыми фактами, хронологией и QR-ссылкой —
              его можно отправить в редакцию или жюри премии.
            </p>
          </li>
          <li>
            <h3>Техническая обвязка под поиск</h3>
            <p>
              Разметка schema.org/Person, канонические адреса, карта сайта, отправка на
              индексацию, картинка для соцсетей.
            </p>
          </li>
          <li>
            <h3>Бессрочное размещение</h3>
            <p>
              Страница не снимается при отсутствии продлений. Изменить или удалить данные
              можно в любой момент — <Link href="/udalenie-dannyh/">через форму</Link>.
            </p>
          </li>
        </ul>
      </section>

      {/* Примеры */}
      {examples.length > 0 && (
        <section className="section">
          <h2 className="ruled">Примеры страниц</h2>
          <div className={styles.examples}>
            {examples.map((person) => (
              <PersonCard key={person.slug} person={person} size="m" />
            ))}
          </div>
        </section>
      )}

      {/* Тарифы */}
      <section className="section">
        <h2 className="ruled">Тарифы</h2>
        <PricingTable plans={PLANS} />
        <p className={styles.pricingNote}>
          Подробности — на странице <Link href="/tarify/">тарифов</Link>.
        </p>
      </section>

      {/* Как проходит работа */}
      <section className="section">
        <h2 className="ruled">Как проходит работа</h2>
        <ol className={styles.steps}>
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.title}>
              <span className={`tabular ${styles.stepNumber}`}>{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p className={styles.stepTime}>{step.time}</p>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Редполитика и отказы */}
      <section className="section">
        <h2 className="ruled">Кого мы не публикуем</h2>
        <div className="prose">
          <p>
            Барьер входа — часть продукта. Мы отказываем, если тема связана с призывами к
            инвестициям и финансовыми пирамидами, азартными играми, эзотерическими или
            медицинскими услугами без подтверждённой квалификации, деятельностью с
            признаками противоправной. Отказываем при недостоверных регалиях и при отказе
            подтвердить документы.
          </p>
          <p>
            Полный перечень оснований — в{' '}
            <Link href="/redpolitika/">редакционной политике</Link>. Он публичный
            намеренно: попадание на площадку должно что-то значить.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="ruled">Частые вопросы</h2>
        <div className={styles.faq}>
          <details>
            <summary>Можно ли купить значок «Проверено»?</summary>
            <p>
              Нет. Значок ставится только после сверки документов: личность, должность,
              образование, награды. Отдельно от проверки он не продаётся.
            </p>
          </details>
          <details>
            <summary>Мы агентство и ведём несколько клиентов. Как удобнее?</summary>
            <p>
              Подпиской: 25 000 ₽ в месяц, до десяти биографий, публикация из кабинета
              агентства по шаблону портала, общий счёт и закрывающие документы. Правки
              опубликованных страниц лимит не расходуют, а материал, снятый по
              редполитике, возвращает место в лимит. Условия — на странице{' '}
              <Link href="/tarify/">тарифов</Link>.
            </p>
          </details>
          <details>
            <summary>Вы гарантируете первое место в поиске?</summary>
            <p>
              Нет, и никто не может гарантировать позиции. Мы отвечаем за то, что зависит
              от нас: структуру страницы, разметку, скорость, индексацию и отчёт по
              фактическим позициям через 30 дней.
            </p>
          </details>
          <details>
            <summary>Это публикация в СМИ?</summary>
            <p>
              Пока нет. Регистрация сетевого издания — отдельная задача, и до её завершения
              мы не обещаем клиентам публикацию в СМИ.
            </p>
          </details>
          <details>
            <summary>Что будет с текстом, если данные изменятся?</summary>
            <p>
              Правки вносит редакция по запросу героя. Дата обновления на странице
              меняется, история правок сохраняется.
            </p>
          </details>
          <details>
            <summary>Можно ли удалить страницу?</summary>
            <p>
              Да. Согласие на распространение данных отзывается в любой момент через{' '}
              <Link href="/udalenie-dannyh/">форму</Link>: подтверждение — 3 рабочих дня,
              решение — 10 рабочих дней.
            </p>
          </details>
        </div>
      </section>

      {/* Форма */}
      <section className="section" id="zayavka">
        <h2 className="ruled">Заявка</h2>
        <LeadForm />
        <p className={styles.legalNote}>
          Отправляя заявку, вы соглашаетесь с <Link href="/pravila/">правилами</Link> и{' '}
          <Link href="/politika-konfidencialnosti/">политикой обработки персональных данных</Link>
          . Договор-оферта и реквизиты — на странице <Link href="/kontakty/">контактов</Link>.
        </p>
      </section>
    </div>
  )
}
