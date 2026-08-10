import type { Metadata } from 'next'
import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { PageHeader } from '@/components/PageHeader'
import { QUESTIONS, STATE_LABEL, verdict } from '@/lib/sled'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

const URL = `${SITE.url}/proverka-cifrovogo-sleda/`

/**
 * Ответы живут в адресе — это делает разбор ссылкой, которую можно сохранить
 * или переслать. Обратная сторона: пять вопросов по три ответа дают 243
 * комбинации, и все они — одна и та же страница с разным итогом. Canonical
 * ведёт на чистый адрес, а версии с ответами закрыты от индексации: иначе
 * каталог получит две с половиной сотни почти одинаковых страниц.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const params = await searchParams
  const withAnswers = QUESTIONS.some((q) => params[q.key])

  return {
    title: 'Что находят по вашему имени: проверка цифрового следа',
    description:
      'Пять вопросов о себе — и разбор, на каком звене рвётся путь от события до прочитанной биографии. Без регистрации и без сбора почты.',
    alternates: { canonical: URL },
    robots: withAnswers ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      url: URL,
      title: 'Что находят по вашему имени: проверка цифрового следа',
      description: 'Пять вопросов о себе — и разбор, на каком звене рвётся ваш цифровой след.',
    },
  }
}

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function SledPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const answers: Record<string, string> = {}
  for (const q of QUESTIONS) {
    const v = str(params[q.key])
    if (v && q.answers.some((a) => a.value === v)) answers[q.key] = v
  }

  const answered = Object.keys(answers).length
  const results = answered ? verdict(answers) : []
  const broken = results.filter((r) => r.state === 'broken')
  const weak = results.filter((r) => r.state === 'weak')
  const problems = broken.length + weak.length

  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { href: '/kak-eto-rabotaet/', label: 'Как это работает' },
          { href: '/proverka-cifrovogo-sleda/', label: 'Проверка цифрового следа' },
        ]}
      />

      <PageHeader
        title="Что находят по вашему имени"
        lead="Биография отвечает на запрос — но сначала кто-то должен этот запрос набрать. Путь от события до прочитанной биографии состоит из пяти звеньев, и рвётся он обычно не там, где чинят. Ответьте на пять вопросов о себе, и мы покажем, где именно у вас обрыв."
      />

      <p className={styles.honest}>
        Проверка ничего о вас не ищет и никуда не отправляет: все ответы остаются в адресе этой
        страницы. Ни регистрации, ни почты не нужно.
      </p>

      <form className={styles.form} method="get" action="/proverka-cifrovogo-sleda/">
        {QUESTIONS.map((q, i) => (
          <fieldset key={q.key} className={styles.question}>
            <legend className={styles.legend}>
              <span className={styles.num}>{i + 1}</span>
              {q.question}
            </legend>
            <p className={styles.hint}>{q.hint}</p>
            <div className={styles.options}>
              {q.answers.map((a) => (
                <label key={a.value} className={styles.option}>
                  <input
                    type="radio"
                    name={q.key}
                    value={a.value}
                    defaultChecked={answers[q.key] === a.value}
                  />
                  <span>{a.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button type="submit" className={styles.submit}>
          {answered ? 'Пересчитать' : 'Показать разбор'}
        </button>
      </form>

      {answered > 0 && (
        <section className={styles.result} id="razbor">
          <h2>Разбор</h2>
          {answered < QUESTIONS.length && (
            <p className={styles.partial}>
              Отвечено {answered} из {QUESTIONS.length} — разбор показан по тому, что есть.
            </p>
          )}

          <ol className={styles.chain}>
            {results.map((r) => (
              <li key={r.link} className={styles[r.state]}>
                <div className={styles.chainHead}>
                  <h3>{r.title}</h3>
                  <span className={styles.state}>{STATE_LABEL[r.state]}</span>
                </div>
                <p>{r.meaning}</p>
                {r.action && <p className={styles.action}>{r.action}</p>}
              </li>
            ))}
          </ol>

          <div className={styles.summary}>
            {problems === 0 ? (
              <p>
                Все проверенные звенья держат — случай нечастый. Дальше работает только
                регулярность: пять поводов за год удерживают имя в обороте лучше, чем один
                громкий.
              </p>
            ) : (
              <>
                <p>
                  {broken.length > 0 && `Рвётся звеньев: ${broken.length} из ${results.length}. `}
                  {weak.length > 0 && `Слабых мест: ${weak.length}. `}
                  {[...broken, ...weak].some((r) => r.link !== 5)
                    ? 'Почти всё это чинится вниманием и одним письмом организатору, а не деньгами.'
                    : ''}
                </p>
                {[...broken, ...weak].some((r) => r.link === 5) && (
                  <p>
                    Последнее звено — единственное, которое закрывает страница с фактами. Это то,
                    что делает <Link href="/razmestit/">редакция</Link>; остальные вы закрываете
                    сами, и никакая биография за вас этого не сделает.
                  </p>
                )}
              </>
            )}
            <p className={styles.next}>
              Подробный разбор всех пяти звеньев и того, откуда берутся поводы, —{' '}
              <Link href="/kak-eto-rabotaet/precedent-kak-sdelat-chtoby-vas-iskali/">
                в статье «Прецедент»
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'Проверка цифрового следа',
          url: URL,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Any',
          browserRequirements: 'Работает без JavaScript',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
          description:
            'Проверка того, на каком звене рвётся путь от события до прочитанной биографии: пять вопросов и разбор.',
          publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        }}
      />
    </div>
  )
}
