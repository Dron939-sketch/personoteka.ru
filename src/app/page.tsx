import type { Metadata } from 'next'
import Link from 'next/link'

import { ArticleCard } from '@/components/ArticleCard'
import { CTAStrip } from '@/components/CTAStrip'
import { JsonLd } from '@/components/JsonLd'
import { PersonCard } from '@/components/PersonCard'
import { PromoBanner } from '@/components/PromoBanner'
import { RatingTable } from '@/components/RatingTable'
import { SearchBar } from '@/components/SearchBar'
import { SphereGrid } from '@/components/SphereGrid'
import {
  getArticles,
  getBornOn,
  getNewestPersons,
  getPerson,
  getPersons,
  getShowcasePersons,
  getRating,
  getSpheres,
} from '@/lib/content'
import { formatDate, personsCount } from '@/lib/format'
import { siteJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'

import styles from './page.module.css'

/**
 * Главная — §8.2. Порядок блоков задан ТЗ и менять его нельзя без пересогласования:
 * герой → персона недели → новые → топ индекса → сферы → родились сегодня →
 * интервью → полоса доверия → CTA.
 */

// Витрины «Родились сегодня» и «Персона недели» зависят от даты,
// поэтому страница пересобирается раз в час, а не замораживается на билде.
export const revalidate = 3600

/** Канонический адрес главной. Без него в индекс попадают `/?utm_…` и `/?from=…`
 *  как отдельные документы: у главной больше всего входящих ссылок с метками. */
export const metadata: Metadata = {
  alternates: { canonical: `${SITE.url}/` },
}

export default function HomePage() {
  const persons = getPersons()
  const rating = getRating()
  const spheres = getSpheres()

  // «Персона недели» — верх рейтинга: витрина строится на собственных данных (§2.1.6).
  // Пока рейтинг пуст (аналитика не набрана), показываем самую свежую биографию —
  // блок не должен исчезать с главной из-за отсутствия статистики.
  const featuredEntry = rating.entries[0]
  const featured = featuredEntry ? getPerson(featuredEntry.slug) : getNewestPersons(1)[0]

  // Витрина — ручной порядок из content/home-vitrina.txt. Пока рейтинг пуст,
  // любая автосортировка вырождается в алфавит, а главной нужны чередование
  // сфер и узнаваемые лица подряд. Если файла нет, показываем свежие, как раньше.
  const showcase = getShowcasePersons(8)
  const newest = showcase.length > 0 ? showcase : getNewestPersons(8).filter((p) => p.slug !== featured?.slug)

  const topRows = rating.entries.slice(0, 10).flatMap((entry) => {
    const person = getPerson(entry.slug)
    return person ? [{ entry, person }] : []
  })

  const today = new Date()
  const bornToday = getBornOn(today.getMonth() + 1, today.getDate())
  const interviews = getArticles('interview').slice(0, 3)

  const verifiedCount = persons.filter((p) => p.verified).length
  const lastUpdate = persons
    .map((p) => p.updated_at)
    .sort()
    .at(-1)

  return (
    <>
      <JsonLd data={siteJsonLd()} />

      {/* 1. Герой: миссия и поиск по имени */}
      <section className={styles.hero}>
        <div className="container">
          <p className={`caption ${styles.heroKicker}`}>{SITE.tagline}</p>
          <h1 className={styles.heroTitle}>{SITE.promise}</h1>
          <p className={`lead ${styles.heroLead}`}>
            «Персонотека» — справочник биографий. Каждая страница составлена редакцией,
            содержит проверяемые факты, ссылки на источники и дату обновления.
          </p>
          <div className={styles.heroSearch}>
            <SearchBar />
          </div>
          <p className={styles.heroHint}>
            Например: <Link href="/sergej-lavrov/">Сергей Лавров</Link> ·{' '}
            <Link href="/katalog/">весь каталог</Link>
          </p>
        </div>
      </section>

      {/* 2. Персона недели */}
      {featured && (
        <section className="container section">
          <h2 className="ruled">Персона недели</h2>
          <PersonCard person={featured} size="xl" priority />
        </section>
      )}

      {/* 3. Новые в Персонотеке */}
      {newest.length > 0 && (
        <section className="container section">
          <div className={styles.sectionHead}>
            <h2 className="ruled">{showcase.length > 0 ? 'Выбор редакции' : 'Новые в «Персонотеке»'}</h2>
            <Link href="/katalog/?sort=novye" className={styles.more}>
              Все новые
            </Link>
          </div>
          <div className={styles.grid}>
            {newest.map((person) => (
              <PersonCard key={person.slug} person={person} size="m" />
            ))}
          </div>
        </section>
      )}

      {/* 4. Индекс внимания: топ-10 */}
      {topRows.length > 0 && (
        <section className="section section-data deferred">
          <div className="container">
            <div className={styles.sectionHead}>
              <h2 className="ruled">Индекс внимания: топ-10</h2>
              <Link href="/rejting/" className={styles.more}>
                Весь рейтинг
              </Link>
            </div>
            <RatingTable
              rows={topRows}
              spheres={spheres}
              caption={`Пересчёт от ${formatDate(rating.computed_at)}. Нормализация — внутри когорты сферы.`}
            />
          </div>
        </section>
      )}

      {/* 5. Сферы */}
      <section className="container section deferred">
        <h2 className="ruled">Сферы деятельности</h2>
        <SphereGrid spheres={spheres} persons={persons} />
      </section>

      {/* 5а. Собственные проекты издателя — не реклама, см. PromoBanner. */}
      <div className="container deferred">
        <PromoBanner context={{ slug: 'home' }} placement="home" />
      </div>

      {/* 6. Родились сегодня */}
      <section className="container section deferred">
        <div className={styles.sectionHead}>
          <h2 className="ruled">Родились сегодня</h2>
          <Link href="/rodilis-segodnya/" className={styles.more}>
            Открыть витрину
          </Link>
        </div>
        {bornToday.length > 0 ? (
          <div className={styles.strip}>
            {bornToday.map((person) => (
              <div className={styles.stripItem} key={person.slug}>
                <PersonCard person={person} size="m" />
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.muted}>
            Сегодня в базе нет именинников. Загляните{' '}
            <Link href="/rodilis-segodnya/">на витрину</Link> завтра.
          </p>
        )}
      </section>

      {/* 7. Свежие интервью */}
      <section className="container section deferred">
        <div className={styles.sectionHead}>
          <h2 className="ruled">Интервью</h2>
          <Link href="/interv-yu/" className={styles.more}>
            Все интервью
          </Link>
        </div>
        {interviews.length > 0 ? (
          <div className={styles.grid}>
            {interviews.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <p className={styles.muted}>
            Первые интервью выйдут вместе с запуском редакционной ленты. Правила, по которым
            редакция работает с героями, описаны в{' '}
            <Link href="/redpolitika/">редакционной политике</Link>.
          </p>
        )}
      </section>

      {/* 8. Полоса доверия — числовая витрина, поэтому холодная секция */}
      <section className="section section-data deferred">
        <div className="container">
          <dl className={styles.trust}>
            <div>
              <dt>Персон в справочнике</dt>
              <dd className="tabular">{persons.length}</dd>
            </div>
            <div>
              <dt>Проверено по документам</dt>
              <dd className="tabular">{verifiedCount}</dd>
            </div>
            <div>
              <dt>База обновлена</dt>
              <dd>{lastUpdate ? formatDate(lastUpdate) : '—'}</dd>
            </div>
            <div>
              <dt>Правила публикации</dt>
              <dd>
                <Link href="/redpolitika/">Редакционная политика</Link>
              </dd>
            </div>
          </dl>
          <p className={styles.trustNote}>
            {personsCount(persons.length)} опубликовано по редакционным правилам. Сведения
            публикуются с согласия героев либо на основании общедоступных источников;
            исправить или удалить данные можно{' '}
            <Link href="/udalenie-dannyh/">через форму</Link>.
          </p>
        </div>
      </section>

      {/* 9. CTA */}
      <section className="container section">
        <CTAStrip />
      </section>
    </>
  )
}
