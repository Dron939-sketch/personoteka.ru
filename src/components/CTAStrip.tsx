import Link from 'next/link'

import styles from './CTAStrip.module.css'

/**
 * Сдержанная полоса с призывом (§8.1, §8.2). На странице персоны показывается
 * внизу, не перекрывая контент, и не использует коммерческий язык:
 * слова «пиар», «продвижение», «раскрутка» в публичной части запрещены (§1.3).
 */
export function CTAStrip({
  title = 'Своя страница в «Персонотеке»',
  text = 'Биография по редакционным правилам, с проверкой фактов и указанием источников. Публикация — бессрочная.',
  href = '/razmestit/',
  action = 'Как разместить биографию',
}: {
  title?: string
  text?: string
  href?: string
  action?: string
}) {
  return (
    <aside className={styles.strip}>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{text}</p>
      </div>
      <Link href={href} className={styles.action}>
        {action}
      </Link>
    </aside>
  )
}
