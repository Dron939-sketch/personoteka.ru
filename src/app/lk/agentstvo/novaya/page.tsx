import type { Metadata } from 'next'

import { AgencyBiographyForm } from '@/components/AgencyBiographyForm'
import { EmptyState, PageHeader } from '@/components/PageHeader'
import { BODY_MAX, BODY_MIN, publishedThisMonth } from '@/lib/agency-publish'
import { getCities, getSpheres } from '@/lib/content'
import { currentAgency } from '@/lib/lk-session'
import { SITE } from '@/lib/site'

/**
 * Публикация биографии агентством. Справочники рубрик и городов приходят с
 * сервера готовыми списками: свободный ввод рубрики создал бы карточку, которая
 * не попадёт ни в один раздел каталога.
 */

export const metadata: Metadata = {
  title: 'Новая биография',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/agentstvo/novaya/` },
}

export const dynamic = 'force-dynamic'

export default async function NewBiographyPage() {
  const agency = await currentAgency()
  if (!agency) return <EmptyState title="Учётная запись агентства не найдена" />

  const used = publishedThisMonth(agency.slug)
  const left = agency.limit_per_month - used

  if (agency.disabled || left <= 0) {
    return (
      <>
        <PageHeader title="Новая биография" />
        <EmptyState
          title={agency.disabled ? 'Подписка приостановлена' : 'Лимит месяца исчерпан'}
          hint={
            agency.disabled
              ? 'Публикация недоступна, пока подписка не возобновлена. Напишите менеджеру.'
              : `Опубликовано ${used} из ${agency.limit_per_month}. Следующие биографии в этом месяце — по цене базового размещения, напишите менеджеру.`
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Новая биография"
        lead="Страница собирается по шаблону портала: структура, разметка и источники — те же, что у редакционных материалов."
        meta={`Осталось в этом месяце: ${left} из ${agency.limit_per_month}`}
      />

      <AgencyBiographyForm
        spheres={getSpheres().map((s) => ({ slug: s.slug, name: s.name }))}
        cities={getCities().map((c) => ({ slug: c.slug, name: c.name }))}
        bodyMin={BODY_MIN}
        bodyMax={BODY_MAX}
      />
    </>
  )
}
