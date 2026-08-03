import styles from './PersonSections.module.css'

/**
 * Блок «Факты» (§3.2) — короткие карточки, самый цитируемый и переносимый элемент
 * страницы. По контент-модели их 3–8 (§5.1).
 */
export function FactCards({ facts }: { facts: string[] }) {
  if (!facts.length) return null

  return (
    <ul className={styles.facts}>
      {facts.map((fact) => (
        <li className={styles.fact} key={fact}>
          {fact}
        </li>
      ))}
    </ul>
  )
}
