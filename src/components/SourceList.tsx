import { SITE } from '@/lib/site'
import styles from './PersonSections.module.css'

/**
 * Блок «Источники» (§5.3) — обязателен для расширенного тарифа.
 * Ссылки наружу закрыты `nofollow`: портал не торгует ссылочным весом.
 */
/** Свои площадки — без `nofollow`: ссылка на собственный первоисточник ничего не продаёт. */
function ownDomain(href: string): boolean {
  return SITE.ownDomains.some((d) => href.includes(`//${d}`) || href.includes(`//www.${d}`))
}

export function SourceList({
  sources,
}: {
  sources: { title: string; url?: string; note?: string }[]
}) {
  if (!sources.length) return null

  return (
    <ol className={styles.sources}>
      {sources.map((s, i) => (
        <li key={`${s.title}-${i}`}>
          {s.url ? (
            <a href={s.url} rel={ownDomain(s.url) ? 'noopener' : 'nofollow noopener'} target="_blank">
              {s.title}
            </a>
          ) : (
            s.title
          )}
          {s.note && <span className={styles.sourceNote}> — {s.note}</span>}
        </li>
      ))}
    </ol>
  )
}
