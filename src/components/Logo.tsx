import styles from './Logo.module.css'

/**
 * Знак — каталожная карточка с латунной линейкой (§7.1).
 * Векторный, наследует currentColor, не требует загрузки шрифта.
 */
export function Logo() {
  return (
    <span className={styles.logo}>
      <svg
        className={styles.mark}
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2.5" y="4.5" width="23" height="19" rx="2" fill="none" stroke="currentColor" />
        <line x1="2.5" y1="10.5" x2="25.5" y2="10.5" stroke="currentColor" />
        <line x1="10.5" y1="16" x2="20.5" y2="16" stroke="var(--accent-500)" strokeWidth="2" />
        <line x1="10.5" y1="19.5" x2="17" y2="19.5" stroke="var(--accent-500)" strokeWidth="2" />
        <circle cx="7" cy="17.5" r="2.5" fill="none" stroke="currentColor" />
      </svg>
      <span className={styles.word}>Персонотека</span>
    </span>
  )
}
