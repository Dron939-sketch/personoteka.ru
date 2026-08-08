/**
 * Контент-модель портала — §5 ТЗ.
 * Типы описывают форму данных как в файловом источнике (`content/`),
 * так и в будущей headless CMS: слой доступа (`content.ts`) меняется, типы — нет.
 */

/**
 * Тарифы из §5.1 плюс `editorial` — материал, подготовленный редакцией по своей
 * инициативе, а не купленный. Отличие принципиальное: объёмы в §5.3 — это
 * обязательства перед плательщиком, и мерить ими редакционный материал нельзя.
 * Рекламы на таких страницах нет, как и на платных.
 */
export type PersonPlan = 'editorial' | 'base' | 'agency' | 'dossier'
export type PersonStatus = 'draft' | 'review' | 'published' | 'hidden'

export interface EducationBlock {
  institution: string
  years?: string
  speciality?: string
}

export interface CareerBlock {
  organization: string
  position: string
  years?: string
}

export interface TimelineEvent {
  year: string
  title: string
  description?: string
  /** Ссылка на первоисточник — §5.3: проверяемое утверждение подкрепляется источником. */
  source?: string
}

export interface Quote {
  text: string
  context?: string
}

export interface Achievement {
  title: string
  year?: string
  issuer?: string
  source?: string
}

export interface Publication {
  title: string
  outlet: string
  date?: string
  url?: string
}

export type LinkKind = 'site' | 'vk' | 'tg' | 'yt' | 'rutube' | 'ok' | 'dzen' | 'other'

export interface PersonLink {
  kind: LinkKind
  url: string
  label?: string
}

export interface Photo {
  src: string
  /** Портрет 4:5 — обязателен минимум один (§5.1, §7.5). */
  portrait?: boolean
  width: number
  height: number
  alt?: string
  caption?: string
  /**
   * Происхождение снимка. Права на фотографию принадлежат фотографу, поэтому без
   * основания публиковать её нельзя, а свободные лицензии (CC BY, CC BY-SA)
   * требуют указывать автора рядом с изображением.
   *
   * `license` — короткое обозначение: «CC BY 4.0», «фотобанк», «предоставлено героем».
   */
  author?: string
  license?: string
  source_url?: string
}

export interface VideoEmbed {
  provider: 'vk' | 'rutube' | 'youtube'
  id: string
  title: string
  poster?: string
}

/** Раздел биографии. `body` в ТЗ — rich text; в файловом источнике это массив секций. */
export interface BodySection {
  /** H2 раздела; используется для оглавления (§8.1). */
  heading: string
  /** Абзацы. Поддерживаются подзаголовки через `subsections`. */
  paragraphs: string[]
  subsections?: { heading: string; paragraphs: string[] }[]
}

export interface Person {
  slug: string
  full_name: string
  display_name: string
  name_latin: string
  tagline: string
  lead: string
  birth_date?: string
  birth_date_public?: boolean
  /** Скрыть год рождения, оставив число и месяц (§5.1). */
  birth_year_public?: boolean
  /**
   * Дата смерти. В ТЗ поля нет, но каталог биографий без него неполон:
   * умершего человека нельзя показывать так же, как живого, — возраст «на
   * сегодня» превращается в бессмыслицу, а schema.org ждёт `deathDate`.
   * Наличие даты — единственный признак, по которому страница переключается
   * в посмертный вид; отдельного флага не нужно.
   */
  death_date?: string
  birth_place?: string
  city?: string
  spheres: string[]
  occupations: string[]
  education?: EducationBlock[]
  career?: CareerBlock[]
  timeline?: TimelineEvent[]
  body: BodySection[]
  facts?: string[]
  quotes?: Quote[]
  achievements?: Achievement[]
  publications?: Publication[]
  media_mentions?: Publication[]
  links?: PersonLink[]
  photos: Photo[]
  video?: VideoEmbed[]
  sources?: { title: string; url?: string; note?: string }[]
  verified?: boolean
  verified_scope?: ('identity' | 'position' | 'education' | 'awards')[]
  verified_at?: string
  plan: PersonPlan
  /**
   * Кто опубликовал материал, если это агентство по подписке. Проверка редакции
   * здесь постфактум, поэтому происхождение материала указывается на странице —
   * читатель должен видеть, что текст пришёл от представителя героя.
   */
  agency?: { slug: string; name: string }
  status: PersonStatus
  editor: string
  published_at: string
  updated_at: string
  /** Вычисляемое, см. §6.2. Хранится в снапшоте рейтинга, здесь — кэш последнего значения. */
  attention_index?: number
  noindex?: boolean
  /** Токен маркировки рекламы (§11.4). При наличии выводится плашка «Реклама». */
  erid?: string
  advertiser?: string
  /**
   * Обязательная маркировка материалов о лицах, включённых в реестр иностранных
   * агентов (255-ФЗ). В ТЗ этого требования нет, но оно есть в законе, а список
   * персон к публикации такие имена содержит: без пометки материал публиковать нельзя.
   *
   * Ставится редакцией ТОЛЬКО после сверки с актуальным реестром Минюста —
   * ошибочная пометка так же недопустима, как её отсутствие. Дата сверки
   * обязательна: реестр меняется.
   */
  foreign_agent?: {
    checked_at: string
    listed: boolean
    /** Ссылка на запись в реестре — если `listed`. */
    registry_url?: string
  }
}

export interface Sphere {
  slug: string
  name: string
  /** Родительный падеж для заголовков вида «Персоны в сфере …». */
  name_genitive: string
  description: string
  icon: string
  seo_text?: string
}

export interface City {
  slug: string
  name: string
  name_prepositional: string
  region?: string
}

export interface Editor {
  slug: string
  name: string
  role: string
  bio?: string
}

/**
 * Новости, интервью и объясняющие статьи (§5.2). Привязка к персонам через
 * `mentions[]` — это она даёт перелинковку «страница персоны ↔ материал»
 * и заполняет `/interv-yu/`.
 *
 * `guide` — третий вид: разбор одного механизма («на чём зарабатывают
 * блогеры», «что такое цифровой след»). Не новость и не интервью: у него нет
 * повода и нет собеседника, зато есть поисковый спрос, которого нет у имени
 * персоны, — см. `content/KONTENT-STRATEGIYA.md`.
 */
export interface Article {
  slug: string
  kind: 'news' | 'interview' | 'guide'
  title: string
  lead: string
  body: BodySection[]
  /** Слаги персон, о которых материал. */
  mentions: string[]
  cover?: Photo
  author: string
  published_at: string
  updated_at: string
  status: PersonStatus
  /** Партнёрский материал помечается явно — §2.2. */
  sponsored?: boolean
  erid?: string
}

/** Снапшот рейтинга — результат ночного пересчёта (§6.2). */
export interface RatingEntry {
  slug: string
  sphere: string
  attention_index: number
  rank_overall: number
  rank_in_sphere: number
  /** Изменение места по сравнению с предыдущим пересчётом. */
  delta: number
}

export interface RatingSnapshot {
  computed_at: string
  entries: RatingEntry[]
}
