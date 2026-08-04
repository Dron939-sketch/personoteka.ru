import styles from './AdSlot.module.css'

/**
 * Рекламное место. По §2.2 показывается ТОЛЬКО на бесплатных профилях:
 * клиент платного тарифа не должен видеть на своей странице чужую рекламу.
 * Компонент сам проверяет тариф — вызывающему коду не нужно об этом помнить.
 */
export function AdSlot({ plan }: { plan: string }) {
  if (plan !== 'free') return null

  return (
    <aside className={styles.slot} aria-label="Рекламный блок">
      <p className={`caption ${styles.mark}`}>Реклама</p>
      <div className={styles.placeholder}>
        {/* Место под рекламный код. Плашка «Реклама» и данные рекламодателя
            выводятся всегда — требование маркировки (§11.4). */}
        <span>Рекламное место на бесплатных профилях</span>
      </div>
    </aside>
  )
}

/**
 * Плашка маркировки для платного размещения (§11.4).
 * Выводится, когда у персоны заполнен `erid`: квалификацию тарифа как рекламы
 * подтверждает юрист, техника только показывает то, что проставила редакция.
 */
export function AdDisclosure({ erid, advertiser }: { erid?: string; advertiser?: string }) {
  if (!erid) return null

  return (
    <p className={styles.disclosure}>
      <span className={styles.disclosureLabel}>Реклама</span>
      {advertiser ? ` · Рекламодатель: ${advertiser}` : ''}
      <span className="tabular"> · erid: {erid}</span>
    </p>
  )
}
