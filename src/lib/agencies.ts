import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { dataDir } from './data-dir'

/**
 * Учётные записи агентств — тариф «Доступ для агентств».
 *
 * Это не «база пользователей» из §8.5, а её узкая часть: ровно то, что нужно,
 * чтобы агентство вошло в свой кабинет и публиковало под своим именем. Ролей
 * две — редакция и агентство; регистрации нет, запись заводит редакция командой
 * `npm run agentstvo`. Так и задумано: доступ продаётся, а не раздаётся формой.
 *
 * Пароль хранится как scrypt-хеш с индивидуальной солью. Восстановления пароля
 * нет — редакция задаёт новый той же командой.
 *
 * Без пометки `server-only`: модуль читает и приложение, и CLI-скрипт заведения
 * агентств. В клиентские сборки он не попадает — импортируют его только
 * серверные модули и обработчики маршрутов.
 */

export interface Agency {
  slug: string
  name: string
  login: string
  salt: string
  hash: string
  /** Сколько биографий в месяц включено в подписку. */
  limit_per_month: number
  created_at: string
  /** Подписка приостановлена: вход остаётся, публикация запрещена. */
  disabled?: boolean
}

const FILE = 'agentstva.json'

function file(): string {
  return path.join(dataDir(), FILE)
}

export function listAgencies(): Agency[] {
  const target = file()
  if (!fs.existsSync(target)) return []
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8')) as Agency[]
  } catch {
    return []
  }
}

export function getAgency(slug: string): Agency | undefined {
  return listAgencies().find((a) => a.slug === slug)
}

export function findAgencyByLogin(login: string): Agency | undefined {
  const needle = login.trim().toLowerCase()
  return listAgencies().find((a) => a.login.toLowerCase() === needle)
}

export function saveAgency(agency: Agency): void {
  const all = listAgencies().filter((a) => a.slug !== agency.slug)
  all.push(agency)
  all.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 })
  fs.writeFileSync(file(), `${JSON.stringify(all, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
}

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex')
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

export function agencyPasswordOk(agency: Agency, password: string): boolean {
  const attempt = scryptSync(password, agency.salt, 64)
  const stored = Buffer.from(agency.hash, 'hex')
  if (attempt.length !== stored.length) return false
  return timingSafeEqual(attempt, stored)
}
