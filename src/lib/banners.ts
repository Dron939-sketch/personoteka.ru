/**
 * Ротация промо-блоков двух собственных проектов — «Фреди» и «Лекторий».
 *
 * Главное ограничение, из которого вырос весь алгоритм: портал собирается
 * статически. `Math.random()` на сервере отработает один раз во время сборки,
 * и выбранный тогда баннер прилипнет к странице до следующего деплоя — то есть
 * «случайная» ротация превратится в намертво зашитый выбор. Поэтому выбор здесь
 * детерминированный: он считается от адреса страницы.
 *
 * У детерминированного выбора есть и прямая польза, помимо совместимости с SSG:
 *
 *   - по каталогу из пятисот страниц креативы распределяются равномерно,
 *     а показы делятся между кампаниями в заданной пропорции;
 *   - страница всегда показывает один и тот же баннер, поэтому нет мигания
 *     при возврате назад и нет сдвига вёрстки;
 *   - результат воспроизводим: по слагу всегда можно сказать, что там показано.
 *
 * Разнообразие для повторных визитов даёт клиентский слой (`PromoBanner`):
 * он смотрит в localStorage и подменяет креатив, если этот уже показывали
 * без клика. Серверная разметка при этом остаётся валидной — блок один
 * и тот же по размеру, меняются только текст и фон.
 */
import fs from 'node:fs'
import path from 'node:path'

export interface BannerCreative {
  id: string
  title: string
  slogan: string
  text: string
  action: string
  /** Путь от корня `public`. Файла может ещё не быть — блок переживёт. */
  image: string
}

export interface BannerCampaign {
  id: string
  name: string
  url: string
  weight: number
  affinity: Record<string, number>
  creatives: BannerCreative[]
}

interface BannersFile {
  campaigns: BannerCampaign[]
}

let cache: BannersFile | null = null

function load(): BannersFile {
  if (!cache) {
    const file = path.join(process.cwd(), 'content/banners.json')
    cache = JSON.parse(fs.readFileSync(file, 'utf8')) as BannersFile
  }
  return cache
}

/**
 * FNV-1a. Нужна не криптография, а равномерность и одинаковый результат
 * на сервере и в браузере: клиентский слой пересчитывает тот же хеш,
 * чтобы понять, какой креатив уже был показан.
 */
export function hash(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface BannerContext {
  /** Адрес страницы или её слаг — единственный источник случайности. */
  slug: string
  /** Сферы персоны или рубрика статьи: по ним считается близость кампании. */
  spheres?: string[]
}

export interface BannerPick {
  campaign: BannerCampaign
  creative: BannerCreative
  /** Индекс креатива — клиентскому слою он нужен, чтобы сдвинуться на следующий. */
  index: number
  href: string
}

/**
 * Тематическая близость кампании к странице: сумма надбавок по её сферам.
 * Надбавки складываются — персона с двумя релевантными сферами тянет кампанию
 * сильнее, чем с одной, и это правильно: близость там действительно выше.
 */
function affinityFor(campaign: BannerCampaign, spheres: string[]): number {
  let bonus = 0
  for (const sphere of spheres) bonus += campaign.affinity[sphere] ?? 0
  return bonus
}

/** UTM для сквозной аналитики: по ним видно и место, и конкретный креатив. */
export function bannerHref(campaign: BannerCampaign, creative: BannerCreative, placement: string): string {
  const url = new URL(campaign.url)
  url.searchParams.set('utm_source', 'personoteka.ru')
  url.searchParams.set('utm_medium', 'banner')
  url.searchParams.set('utm_campaign', campaign.id)
  url.searchParams.set('utm_content', `${creative.id}-${placement}`)
  return url.toString()
}

/**
 * Выбор баннера для страницы. Два режима, и это принципиально.
 *
 * **Тема побеждает случайность.** Если по сферам страницы одна кампания
 * набрала строго больше близости — показывается она, без всякой рулетки.
 * Первая версия складывала надбавки с базовым весом и крутила рулетку от
 * суммы; на бумаге это выглядело гибко, а на деле означало, что на рубрике
 * «Психология» Лекторий выпадал примерно в четырёх случаях из десяти —
 * при том, что рядом лежит профильный проект. Смешивать таргетинг
 * со случайностью нельзя: либо страница тематическая и тогда выбор очевиден,
 * либо она нейтральная и тогда решает жребий.
 *
 * **Жребий — только для нейтральных страниц.** Где надбавок нет или они
 * равны, кампания выбирается взвешенной рулеткой по базовым весам, и вместо
 * случайного числа в ней хеш слага.
 *
 * Креатив внутри кампании — вторым независимым хешем, иначе все страницы
 * одной кампании показывали бы один и тот же креатив.
 */
export function pickBanner(context: BannerContext, placement = 'inline'): BannerPick | null {
  const { campaigns } = load()
  if (campaigns.length === 0) return null

  const spheres = context.spheres ?? []
  const bonuses = campaigns.map((c) => affinityFor(c, spheres))
  const best = Math.max(...bonuses)
  const leaders = bonuses.filter((b) => b === best).length

  let campaign: BannerCampaign
  if (best > 0 && leaders === 1) {
    campaign = campaigns[bonuses.indexOf(best)]
  } else {
    const weights = campaigns.map((c) => c.weight)
    const total = weights.reduce((a, b) => a + b, 0)
    if (total <= 0) return null

    let point = hash(context.slug) % total
    campaign = campaigns[campaigns.length - 1]
    for (let i = 0; i < campaigns.length; i += 1) {
      if (point < weights[i]) {
        campaign = campaigns[i]
        break
      }
      point -= weights[i]
    }
  }

  const index = hash(`${context.slug}:${campaign.id}`) % campaign.creatives.length
  const creative = campaign.creatives[index]

  return { campaign, creative, index, href: bannerHref(campaign, creative, placement) }
}

/** Весь конфиг — для клиентского слоя и для страницы предпросмотра. */
export function getCampaigns(): BannerCampaign[] {
  return load().campaigns
}
