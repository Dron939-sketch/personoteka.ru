import 'server-only'

import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { REMOVAL_SLA, type ConsentRecord } from './consent'
import type { TicketKind, TicketState } from './ticket-types'

export { TICKET_STATE_LABEL } from './ticket-types'
export type { TicketKind, TicketState } from './ticket-types'

/**
 * Реестр заявок и запросов — §11.3, критерий приёмки §15.
 *
 * Раньше обе формы писали принятое в `console` и на этом заканчивали: заявка
 * жила до первой строчки лога, а запрос на удаление — до перезапуска контейнера.
 * Для §11.3 это не мелочь: срок реакции считается от момента получения, и
 * потерянный запрос означает нарушенный срок, а не потерянную строку.
 *
 * Хранилище нарочно простое — append-only JSONL на диске. Это не «БД на этапе 4»,
 * а то, что можно поставить сегодня и не потерять данные: файл переживает
 * перезапуск, дописывание атомарно в пределах строки, порядок сохраняется.
 * Когда появится настоящая база, реестр заменится целиком — интерфейс этого
 * модуля (`addLead`, `addRemoval`, `readLeads`, `readRemovals`, `setTicketState`)
 * и есть граница замены.
 *
 * ВАЖНО про диск. Каталог берётся из `DATA_DIR`, иначе `/data`, иначе `.data`
 * в корне проекта. Первые два — постоянные тома, третий живёт только до
 * пересборки контейнера. Кабинет показывает, какой путь используется и
 * постоянный ли он: администратор должен видеть, что данные могут пропасть,
 * а не узнавать об этом после пропажи.
 */

interface TicketBase {
  id: string
  created_at: string
  name: string
  email: string
  ip: string
  consents: ConsentRecord[]
}

export interface LeadTicket extends TicketBase {
  sphere: string
  contact?: string
  message?: string
}

export interface RemovalTicket extends TicketBase {
  page_url: string
  message: string
  /** Срок подтверждения получения — §11.3, 3 рабочих дня. */
  acknowledge_by: string
  /** Срок мотивированного решения — §11.3, 10 рабочих дней. */
  decide_by: string
}

/** Событие смены состояния. Тикеты не переписываются — состояние сворачивается из событий. */
export interface TicketEvent {
  ticket: string
  kind: TicketKind
  state: TicketState
  at: string
  note?: string
}

const LEADS = 'zayavki.jsonl'
const REMOVALS = 'udalenie.jsonl'
const EVENTS = 'sobytiya.jsonl'

/** Куда пишем. Порядок: явная переменная, постоянный том Amvera, локальный запасной путь. */
export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  if (fs.existsSync('/data')) return '/data'
  return path.join(process.cwd(), '.data')
}

/** Переживёт ли записанное пересборку контейнера. */
export function storageIsPersistent(): boolean {
  return Boolean(process.env.DATA_DIR) || fs.existsSync('/data')
}

function file(name: string): string {
  const dir = dataDir()
  // 0700: в файлах лежат ПДн и журнал согласий, соседям по хосту там делать нечего.
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  return path.join(dir, name)
}

function append(name: string, record: unknown): void {
  fs.appendFileSync(file(name), `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600 })
}

function read<T>(name: string): T[] {
  const target = path.join(dataDir(), name)
  if (!fs.existsSync(target)) return []
  return fs
    .readFileSync(target, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .flatMap((line) => {
      // Битая строка не должна ронять весь реестр: остальные записи важнее.
      try {
        return [JSON.parse(line) as T]
      } catch {
        return []
      }
    })
}

export function addLead(input: Omit<LeadTicket, 'id' | 'created_at'>, now = new Date()): LeadTicket {
  const ticket: LeadTicket = { id: randomUUID(), created_at: now.toISOString(), ...input }
  append(LEADS, ticket)
  return ticket
}

export function addRemoval(
  input: Omit<RemovalTicket, 'id' | 'created_at' | 'acknowledge_by' | 'decide_by'>,
  now = new Date(),
): RemovalTicket {
  const ticket: RemovalTicket = {
    id: randomUUID(),
    created_at: now.toISOString(),
    acknowledge_by: addBusinessDays(now, REMOVAL_SLA.acknowledge_business_days).toISOString(),
    decide_by: addBusinessDays(now, REMOVAL_SLA.decide_business_days).toISOString(),
    ...input,
  }
  append(REMOVALS, ticket)
  return ticket
}

export function readLeads(): LeadTicket[] {
  return read<LeadTicket>(LEADS)
}

export function readRemovals(): RemovalTicket[] {
  return read<RemovalTicket>(REMOVALS)
}

export function setTicketState(event: Omit<TicketEvent, 'at'>, now = new Date()): void {
  append(EVENTS, { ...event, at: now.toISOString() } satisfies TicketEvent)
}

/** Текущее состояние тикетов: последнее событие побеждает, без события — «новая». */
export function ticketStates(): Map<string, TicketEvent> {
  const states = new Map<string, TicketEvent>()
  for (const event of read<TicketEvent>(EVENTS)) states.set(event.ticket, event)
  return states
}

/**
 * Прибавление рабочих дней. Праздничные переносы не учитываются: их календарь
 * меняется каждый год, а ошибка здесь односторонняя — без праздников срок
 * получается СТРОЖЕ календарного, то есть в пользу заявителя.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from.getTime())
  let left = days
  while (left > 0) {
    date.setUTCDate(date.getUTCDate() + 1)
    const day = date.getUTCDay()
    if (day !== 0 && day !== 6) left -= 1
  }
  return date
}
