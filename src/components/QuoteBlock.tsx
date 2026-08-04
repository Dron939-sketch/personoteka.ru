import type { Quote } from '@/lib/types'

import styles from './PersonSections.module.css'

export function QuoteBlock({ quote }: { quote: Quote }) {
  return (
    <figure className={styles.quote}>
      <blockquote className={styles.quoteText}>«{quote.text}»</blockquote>
      {quote.context && <figcaption className={styles.quoteContext}>{quote.context}</figcaption>}
    </figure>
  )
}
