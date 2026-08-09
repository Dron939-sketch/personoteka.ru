import fs from 'node:fs'
import path from 'node:path'

import { bannerHref, getCampaigns, pickBanner, type BannerContext } from '@/lib/banners'

import { PromoBannerView } from './PromoBannerView'

/**
 * Промо-полоса собственных проектов издателя — «Лекторий» и «Фреди».
 *
 * Это не рекламный блок. Сторонней рекламы на страницах персон нет вовсе,
 * а здесь другое: собственные проекты издателя на собственном сайте. По части 2
 * статьи 2 закона о рекламе такая информация рекламой не считается, поэтому ни
 * плашки «Реклама», ни токена erid не требуется — достаточно честной подписи
 * «Проект редакции». Позиция та же, что была принята для одиночной полосы
 * Лектория, из которой этот компонент и вырос.
 *
 * Что добавилось по сравнению с одиночной полосой: вторая кампания, четыре
 * креатива у каждой и ротация между ними. Серверная половина выбирает, что
 * показать (детерминированно — см. `lib/banners.ts`), и заранее считает ссылки
 * для всех креативов, чтобы клиентский слой мог переключиться без пересчёта.
 *
 * Текст лежит в разметке, а не в картинке: заголовок читается поисковиком
 * и экранным диктором, переводится на тёмную тему и не ломается на узком
 * экране. Изображение — только фон, поэтому у него пустое `alt`. Фон
 * необязателен: пока файла нет, полоса выводится на сплошной тёмной подложке
 * и остаётся рабочей.
 */
export function PromoBanner({
  context,
  placement = 'inline',
}: {
  context: BannerContext
  placement?: string
}) {
  const pick = pickBanner(context, placement)
  if (!pick) return null

  const exists = (image: string) => fs.existsSync(path.join(process.cwd(), 'public', image))

  const pack = (campaign: (typeof pick)['campaign']) => ({
    campaignId: campaign.id,
    creatives: campaign.creatives.map((creative) => ({
      id: creative.id,
      title: creative.title,
      slogan: creative.slogan,
      text: creative.text,
      action: creative.action,
      image: exists(creative.image) ? creative.image : null,
      href: bannerHref(campaign, creative, placement),
    })),
  })

  // Вторая кампания нужна клиенту на случай, когда первую пользователь уже
  // открывал: показать другой проект лучше, чем не показать ничего.
  const other = getCampaigns().find((c) => c.id !== pick.campaign.id)

  return (
    <PromoBannerView
      {...pack(pick.campaign)}
      index={pick.index}
      fallback={other ? pack(other) : null}
    />
  )
}
