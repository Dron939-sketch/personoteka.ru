import type { Metadata } from 'next'

import { EmptyState, PageHeader } from '@/components/PageHeader'
import { TicketStateSwitch } from '@/components/TicketState'
import { REMOVAL_SLA } from '@/lib/consent'
import { formatDate } from '@/lib/format'
import { SITE } from '@/lib/site'
import { TICKET_STATE_LABEL, type TicketState } from '@/lib/ticket-types'
import {
  dataDir,
  readLeads,
  readRemovals,
  storageIsPersistent,
  ticketStates,
} from '@/lib/tickets'

import styles from './page.module.css'

/**
 * Заявки с лендинга и запросы на удаление данных (§8.4, §11.3).
 *
 * Раздел появился вместе с реестром: до него обе формы писали принятое в лог,
 * и «кабинет» показывать было нечего. Здесь нет ни одной вычисленной метрики —
 * только то, что действительно пришло через формы.
 *
 * Сроки §11.3 считаются от момента получения и подсвечиваются, когда истекли:
 * просроченный запрос — это нарушение регламента, и увидеть его нужно раньше,
 * чем о нём напомнит заявитель.
 */

export const metadata: Metadata = {
  title: 'Заявки и запросы',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/zayavki/` },
}

export const dynamic = 'force-dynamic'

export default function TicketsPage() {
  const states = ticketStates()
  const stateOf = (id: string): TicketState => states.get(id)?.state ?? 'open'

  // Новые сверху: реагировать нужно на свежее, а не на то, что уже разобрано.
  const byDate = <T extends { created_at: string }>(a: T, b: T) =>
    b.created_at.localeCompare(a.created_at)

  const removals = readRemovals().sort(byDate)
  const leads = readLeads().sort(byDate)
  const now = Date.now()

  const openRemovals = removals.filter((t) => ['open', 'in_work'].includes(stateOf(t.id)))
  const overdue = openRemovals.filter((t) => Date.parse(t.acknowledge_by) < now)

  return (
    <>
      <PageHeader
        title="Заявки и запросы"
        lead="Всё, что пришло через форму заявки и форму удаления данных."
        meta={`Запросов на удаление: ${removals.length} · заявок: ${leads.length}`}
      />

      {!storageIsPersistent() && (
        <p className={styles.alarm} role="alert">
          Реестр пишется в <code>{dataDir()}</code> — этот каталог не переживёт пересборку
          контейнера. Задайте <code>DATA_DIR</code> на постоянный том, иначе заявки
          и журнал согласий будут теряться при каждом деплое.
        </p>
      )}

      {overdue.length > 0 && (
        <p className={styles.alarm} role="alert">
          Просрочен срок подтверждения по {overdue.length}{' '}
          {plural(overdue.length, 'запросу', 'запросам', 'запросам')}: по §11.3 на
          подтверждение получения есть {REMOVAL_SLA.acknowledge_business_days} рабочих дня.
        </p>
      )}

      <section className={styles.block}>
        <h2 className="ruled">Запросы на удаление и исправление</h2>
        <p className={styles.note}>
          Регламент §11.3: подтверждение — {REMOVAL_SLA.acknowledge_business_days} рабочих
          дня, мотивированное решение — {REMOVAL_SLA.decide_business_days} рабочих дней.
          Праздничные переносы в расчёте не учитываются, поэтому внутренний срок строже
          календарного.
        </p>

        {removals.length === 0 ? (
          <EmptyState title="Запросов не поступало" />
        ) : (
          <ul className={styles.list}>
            {removals.map((ticket) => {
              const state = stateOf(ticket.id)
              const open = state === 'open' || state === 'in_work'
              const late = open && Date.parse(ticket.acknowledge_by) < now
              return (
                <li key={ticket.id} className={`${styles.card} ${late ? styles.late : ''}`}>
                  <div className={styles.head}>
                    <p className={styles.who}>
                      {ticket.name}
                      <a href={`mailto:${ticket.email}`} className={styles.email}>
                        {ticket.email}
                      </a>
                    </p>
                    <span className={`${styles.state} ${styles[state]}`}>
                      {TICKET_STATE_LABEL[state]}
                    </span>
                  </div>

                  <p className={styles.target}>
                    <a href={ticket.page_url} rel="noreferrer">
                      {ticket.page_url}
                    </a>
                  </p>
                  <p className={styles.message}>{ticket.message}</p>

                  <dl className={styles.meta}>
                    <div>
                      <dt>Поступил</dt>
                      <dd className="tabular">{formatDate(ticket.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Подтвердить до</dt>
                      <dd className={`tabular ${late ? styles.lateDate : ''}`}>
                        {formatDate(ticket.acknowledge_by)}
                      </dd>
                    </div>
                    <div>
                      <dt>Решение до</dt>
                      <dd className="tabular">{formatDate(ticket.decide_by)}</dd>
                    </div>
                  </dl>

                  <TicketStateSwitch ticket={ticket.id} kind="removal" state={state} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={styles.block}>
        <h2 className="ruled">Заявки на размещение</h2>

        {leads.length === 0 ? (
          <EmptyState title="Заявок не поступало" />
        ) : (
          <ul className={styles.list}>
            {leads.map((ticket) => {
              const state = stateOf(ticket.id)
              return (
                <li key={ticket.id} className={styles.card}>
                  <div className={styles.head}>
                    <p className={styles.who}>
                      {ticket.name}
                      <a href={`mailto:${ticket.email}`} className={styles.email}>
                        {ticket.email}
                      </a>
                    </p>
                    <span className={`${styles.state} ${styles[state]}`}>
                      {TICKET_STATE_LABEL[state]}
                    </span>
                  </div>

                  {ticket.message && <p className={styles.message}>{ticket.message}</p>}

                  <dl className={styles.meta}>
                    <div>
                      <dt>Поступила</dt>
                      <dd className="tabular">{formatDate(ticket.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Сфера</dt>
                      <dd>{ticket.sphere}</dd>
                    </div>
                    {ticket.contact && (
                      <div>
                        <dt>Ещё контакт</dt>
                        <dd>{ticket.contact}</dd>
                      </div>
                    )}
                  </dl>

                  <TicketStateSwitch ticket={ticket.id} kind="lead" state={state} />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={`${styles.block} ${styles.legal}`}>
        <h2 className="ruled">Где лежат данные</h2>
        <div className="prose">
          <p>
            Реестр — файлы <code>zayavki.jsonl</code>, <code>udalenie.jsonl</code> и{' '}
            <code>sobytiya.jsonl</code> в каталоге <code>{dataDir()}</code>. Рядом, в тех
            же записях, лежит журнал согласий: версия текста, дата, IP и адрес заявителя
            (§11.1). Выгрузка и удаление делаются на файлах — отдельной админки для этого
            пока нет.
          </p>
        </div>
      </section>
    </>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
