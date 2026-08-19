import { INDEXNOW_KEY, SITE } from './site'

/**
 * IndexNow — уведомление поисковиков о новых и изменившихся адресах (§10.1).
 *
 * Зачем это нужно новому сайту: обход по расписанию у Яндекса и Bing доходит
 * до молодого домена неделями, а IndexNow ставит адрес в очередь сразу.
 * Google протокол не поддерживает — для него работают карта сайта и Search
 * Console. Ping карты сайта через `/ping?sitemap=` Google отключил в 2023-м,
 * поэтому здесь его нет: он бы просто возвращал 404.
 *
 * Ключ — произвольная строка 8–128 символов из букв и цифр. Он должен лежать
 * в открытом доступе на том же домене; у нас это `/indexnow.txt`, а адрес
 * файла передаётся в `keyLocation` — протокол это разрешает, и так ключ
 * не занимает слаг в корне, где живут персоны.
 *
 * Раньше ключ жил только в переменной окружения, чтобы «чужой не слал заявки
 * от имени домена». Защиты в этом нет: протокол требует выложить ключ в
 * открытый доступ, и прочитать его может кто угодно — на то и `keyLocation`.
 * Секретность здесь недостижима в принципе, а цена попытки была высокой:
 * переменную никто не задал, и протокол просто не работал. Ключ лежит в
 * `site.ts` рядом с прочими публичными идентификаторами; переопределение
 * переменной окружения сохранено.
 */

const ENDPOINT = 'https://api.indexnow.org/IndexNow'

/** Максимум адресов в одном запросе по спецификации протокола. */
const BATCH = 10_000

export function indexNowKey(): string | undefined {
  const key = INDEXNOW_KEY.trim()
  if (!key) return undefined
  // Некорректный ключ поисковик молча отвергает, а мы бы считали отправку
  // успешной. Лучше вести себя так, будто ключа нет вовсе.
  return /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : undefined
}

/**
 * Отправляет адреса в IndexNow. Никогда не бросает: индексация — не та задача,
 * ради которой стоит ронять публикацию биографии.
 *
 * Возвращает число отправленных адресов, 0 — если отправка не состоялась.
 */
export async function submitUrls(urls: string[]): Promise<number> {
  const key = indexNowKey()
  if (!key || urls.length === 0) return 0

  const host = new URL(SITE.url).host
  // Чужие хосты протокол отбрасывает целиком вместе с остальным списком.
  const own = [...new Set(urls)].filter((u) => {
    try {
      return new URL(u).host === host
    } catch {
      return false
    }
  })
  if (own.length === 0) return 0

  let sent = 0
  for (let i = 0; i < own.length; i += BATCH) {
    const chunk = own.slice(i, i + BATCH)
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key,
          keyLocation: `${SITE.url}/indexnow.txt`,
          urlList: chunk,
        }),
      })
      // 200 и 202 — приняты; 422 — ключ не совпал с файлом, 403 — ключ неверен.
      if (response.ok) sent += chunk.length
      else console.warn(`IndexNow: ${response.status} на ${chunk.length} адресах`)
    } catch (error) {
      console.warn('IndexNow недоступен:', error instanceof Error ? error.message : error)
    }
  }
  return sent
}

/** Адрес страницы персоны — единственная форма, которую мы отправляем. */
export function personUrl(slug: string): string {
  return `${SITE.url}/${slug}/`
}
