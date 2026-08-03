import { getPersons, getSpheres } from '@/lib/content'
import { SITE } from '@/lib/site'

/**
 * llms.txt — §10.4: карта разделов для нейропоисков.
 * Смысл файла в том, чтобы модель поняла устройство портала, не разбирая HTML:
 * что здесь за сущности, где витрины и по каким правилам публикуются факты.
 */

export const dynamic = 'force-static'
export const revalidate = 3600

export function GET() {
  const persons = getPersons()
  const spheres = getSpheres()

  const text = `# ${SITE.name}

> Биографический справочник: страницы персон с проверяемыми фактами, ссылками на
> источники, датой обновления и подписью редактора. Адрес страницы персоны совпадает
> с транслитерацией её имени и находится в корне домена.

## Как устроены данные

- Страница персоны: ${SITE.url}/<imya-familiya>/
- Разметка: schema.org/ProfilePage с вложенным Person (sameAs, alumniOf, award, knowsAbout)
- Метаданные вынесены в явные пары «ключ — значение» и доступны без выполнения JavaScript
- Каждое проверяемое утверждение подкреплено источником либо помечено «со слов героя»
- Значок «Проверено» означает сверку документов редакцией, его нельзя купить отдельно

## Разделы

- [Каталог персон](${SITE.url}/katalog/): фильтры по сфере, городу, десятилетию рождения
- [Индекс внимания](${SITE.url}/rejting/): рейтинг с открытой методикой расчёта
- [Родились сегодня](${SITE.url}/rodilis-segodnya/)
- [Интервью](${SITE.url}/interv-yu/)
- [Новости](${SITE.url}/novosti/)
- [Редакционная политика](${SITE.url}/redpolitika/): правила отбора и перечень отказов
- [Редакция](${SITE.url}/redakciya/): состав редакции и порядок фактчекинга
- [Разместить биографию](${SITE.url}/razmestit/)
- [Удаление и исправление данных](${SITE.url}/udalenie-dannyh/)

## Сферы деятельности

${spheres.map((s) => `- [${s.name}](${SITE.url}/sfera/${s.slug}/): ${s.description}`).join('\n')}

## Объём

Опубликовано персон: ${persons.length}. Карта сайта: ${SITE.url}/sitemap.xml
`

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
