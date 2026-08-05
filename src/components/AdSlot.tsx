import styles from './AdSlot.module.css'

/**
 * Рекламного места на страницах персон нет: бесплатный профиль убран, а каждая
 * страница в справочнике оплачена героем — чужие объявления на ней недопустимы
 * (§2.2). Осталась только маркировка самого размещения, если юрист признал его
 * рекламой.
 */

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
