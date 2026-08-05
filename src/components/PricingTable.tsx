import Link from 'next/link'

import styles from './PricingTable.module.css'

export interface Plan {
  id: string
  name: string
  price: string
  /** Условие оплаты под ценой — для подписки, где важна периодичность. */
  period?: string
  summary: string
  features: string[]
  /** Оговорка под списком: то, что клиент обязан узнать до покупки, а не после. */
  note?: string
  /** Выделенный тариф — ровно один, иначе выделение теряет смысл. */
  featured?: boolean
}

/**
 * Тарифы (§8.4). Формулировки сдержанные: обещание «публикации в СМИ» появится
 * только после регистрации сетевого издания (§11.5).
 */
export function PricingTable({ plans }: { plans: Plan[] }) {
  return (
    <div className={styles.grid}>
      {plans.map((plan) => (
        <article
          key={plan.id}
          className={`${styles.card} ${plan.featured ? styles.featured : ''}`}
        >
          <h3 className={styles.name}>{plan.name}</h3>
          <p className={styles.price}>{plan.price}</p>
          {plan.period && <p className={styles.period}>{plan.period}</p>}
          <p className={styles.summary}>{plan.summary}</p>
          <ul className={styles.features}>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          {plan.note && <p className={styles.note}>{plan.note}</p>}
          <Link href="/razmestit/#zayavka" className={styles.action}>
            Оставить заявку
          </Link>
        </article>
      ))}
    </div>
  )
}
