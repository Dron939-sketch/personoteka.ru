import fs from 'node:fs'
import path from 'node:path'

/**
 * Где живут данные, появившиеся после сборки: реестр обращений, учётные записи
 * агентств, агентские страницы, портреты и счётчик просмотров.
 *
 * Модуль намеренно без `server-only`: его читает и приложение, и CLI-скрипт
 * заведения агентств, который запускается обычным Node. Опасного здесь ничего
 * нет — это вычисление пути, а не доступ к данным; сами данные лежат в модулях,
 * которые из клиента не импортируются.
 *
 * Порядок поиска: явная переменная `DATA_DIR`, затем постоянный том `/data`,
 * затем `.data` в корне проекта. Последний вариант годится для стенда и
 * теряется при пересборке контейнера — приложение сообщает об этом в кабинете.
 */

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  if (fs.existsSync('/data')) return '/data'
  return path.join(process.cwd(), '.data')
}

/** Переживёт ли записанное пересборку контейнера. */
export function storageIsPersistent(): boolean {
  return Boolean(process.env.DATA_DIR) || fs.existsSync('/data')
}
