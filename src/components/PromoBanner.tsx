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
 * В ротацию попадают только креативы с отрисованным фоном — отбор делает
 * `lib/banners.ts`. Пока нарисован один фон из восьми, на сайте показывается
 * ровно то же, что и раньше; ротация расширится сама, когда появятся картинки.
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

  const pack = (campaign: (typeof pick)['campaign']) => ({
    campaignId: campaign.id,
    creatives: campaign.creatives.map((creative) => ({
      id: creative.id,
      title: creative.title,
      slogan: creative.slogan,
      text: creative.text,
      action: creative.action,
      image: creative.image,
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
