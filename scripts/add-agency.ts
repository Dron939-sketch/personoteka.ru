/**
 * Учётная запись агентства.
 *
 *   npm run agentstvo -- --name "Агентство Пример" --login primer --password '…'
 *   npm run agentstvo -- --list
 *   npm run agentstvo -- --login primer --password 'новый'      # сменить пароль
 *   npm run agentstvo -- --login primer --disable               # приостановить
 *
 * Регистрации на сайте нет намеренно: доступ входит в подписку, и заводит его
 * тот, кто видел оплату. Пароль не хранится и не показывается второй раз —
 * забытый меняется этой же командой.
 *
 * Пишет в тот же каталог, что и реестр обращений (`DATA_DIR`), поэтому на
 * сервере команду нужно запускать с той же переменной окружения, что и само
 * приложение, — иначе запись ляжет мимо.
 */
import {
  agencyPasswordOk,
  findAgencyByLogin,
  hashPassword,
  listAgencies,
  saveAgency,
  type Agency,
} from '../src/lib/agencies'
import { dataDir } from '../src/lib/data-dir'
import { slugify } from '../src/lib/translit'

const args = process.argv.slice(2)

function flag(name: string): string | undefined {
  const at = args.indexOf(`--${name}`)
  return at >= 0 ? args[at + 1] : undefined
}
const has = (name: string) => args.includes(`--${name}`)

if (has('list')) {
  const all = listAgencies()
  console.log(`Каталог: ${dataDir()}`)
  if (!all.length) console.log('Агентств нет.')
  for (const a of all) {
    console.log(
      `${a.login.padEnd(16)} ${a.name} — до ${a.limit_per_month} в месяц${a.disabled ? ', приостановлено' : ''}`,
    )
  }
  process.exit(0)
}

const login = flag('login')
if (!login) {
  console.error('Нужен --login. Полный список ключей — в шапке scripts/add-agency.ts')
  process.exit(1)
}

const existing = findAgencyByLogin(login)

if (has('disable') || has('enable')) {
  if (!existing) {
    console.error(`Агентства с логином «${login}» нет.`)
    process.exit(1)
  }
  saveAgency({ ...existing, disabled: has('disable') })
  console.log(`«${existing.name}»: подписка ${has('disable') ? 'приостановлена' : 'возобновлена'}.`)
  process.exit(0)
}

const password = flag('password')
if (!password || password.length < 10) {
  console.error('Нужен --password не короче десяти знаков.')
  process.exit(1)
}

if (existing) {
  if (agencyPasswordOk(existing, password)) {
    console.log('Это тот же пароль — ничего не изменилось.')
    process.exit(0)
  }
  saveAgency({ ...existing, ...hashPassword(password) })
  console.log(`«${existing.name}»: пароль изменён.`)
  process.exit(0)
}

const name = flag('name')
if (!name) {
  console.error('Для новой записи нужен --name «Название агентства».')
  process.exit(1)
}

const limit = Number(flag('limit') ?? 10)
if (!Number.isInteger(limit) || limit < 1) {
  console.error('--limit должен быть целым числом больше нуля.')
  process.exit(1)
}

const slug = slugify(name)
if (listAgencies().some((a) => a.slug === slug)) {
  console.error(`Агентство со слагом «${slug}» уже есть — выберите другое название.`)
  process.exit(1)
}

const agency: Agency = {
  slug,
  name,
  login,
  ...hashPassword(password),
  limit_per_month: limit,
  created_at: new Date().toISOString(),
}
saveAgency(agency)

console.log(`Заведено агентство «${name}».`)
console.log(`  логин: ${login}`)
console.log(`  слаг:  ${slug}`)
console.log(`  лимит: ${limit} биографий в месяц`)
console.log(`  файл:  ${dataDir()}/agentstva.json`)
