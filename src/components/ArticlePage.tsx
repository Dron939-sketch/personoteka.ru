import Link from 'next/link'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { PersonCard } from '@/components/PersonCard'
import { RichText } from '@/components/RichText'
import { ARTICLE_KINDS } from '@/lib/articles'
import { getEditor, getPerson } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { articleJsonLd } from '@/lib/jsonld'
import { SITE } from '@/lib/site'
import type { Article } from '@/lib/types'

import styles from './ArticlePage.module.css'

/**
 * Страница редакционного материала.
 *
 * Одна на все рубрики: новость, интервью и разбор отличаются адресом и
 * хлебными крошками, но не вёрсткой. Три копии этой страницы разошлись бы
 * при первой же правке.
 */
export function ArticlePage({ article }: { article: Article }) {
  const kind = ARTICLE_KINDS[article.kind]
  const url = `${SITE.url}/${kind.segment}/${article.slug}/`
  const author = getEditor(article.author)
  const mentioned = article.mentions.map((slug) => getPerson(slug)).filter((p) => p !== undefined)

  return (
    <div className="container">
      <Breadcrumbs
        items={[{ label: kind.title, href: `/${kind.segment}/` }, { label: article.title }]}
      />

      <article className={styles.article}>
        <header className={styles.header}>
          <p className={styles.kind}>{kind.one}</p>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.lead}>{article.lead}</p>
          <p className={styles.meta}>
            {author ? (
              <>
                <Link href="/redakciya/">{author.name}</Link>
                {' · '}
              </>
            ) : null}
            <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          </p>
        </header>

        <div className={`prose ${styles.body}`}>
          {article.body.map((block) => (
            <section key={block.heading}>
              <h2>{block.heading}</h2>
              {block.paragraphs.map((p, i) => (
                <p key={i}>
                  <RichText text={p} />
                </p>
              ))}
              {block.subsections?.map((sub) => (
                <div key={sub.heading}>
                  <h3>{sub.heading}</h3>
                  {sub.paragraphs.map((p, i) => (
                    <p key={i}>
                      <RichText text={p} />
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>

        {article.sources?.length ? (
          <section className={styles.sources}>
            <h2>Источники</h2>
            <ul>
              {article.sources.map((source) => (
                <li key={source.title}>
                  {source.url ? (
                    <a href={source.url} rel="noopener" target="_blank">
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                  {source.note ? <span className={styles.note}> — {source.note}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {mentioned.length ? (
          <section className={styles.mentions}>
            <h2>Персоны в материале</h2>
            <div className={styles.mentionGrid}>
              {mentioned.map((person) => (
                <PersonCard key={person.slug} person={person} />
              ))}
            </div>
          </section>
        ) : null}
      </article>

      <JsonLd data={articleJsonLd(article, url, author)} />
    </div>
  )
}
