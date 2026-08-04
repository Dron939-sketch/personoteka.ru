import type { Metadata } from 'next'

import { PageHeader } from '@/components/PageHeader'
import { LkLoginForm } from '@/components/LkLoginForm'
import { lkEnabled } from '@/lib/lk-auth'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Вход в кабинет',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE.url}/lk/vhod/` },
}

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const enabled = lkEnabled()

  return (
    <div className="container" style={{ maxWidth: '34rem', paddingBottom: 'var(--sp-24)' }}>
      <PageHeader
        title="Вход в кабинет"
        lead={
          enabled
            ? 'Раздел закрыт: в редакционной очереди есть имена людей, которые ещё не давали согласия на публикацию.'
            : undefined
        }
      />

      {enabled ? (
        <LkLoginForm />
      ) : (
        <div className="prose">
          <p>
            Кабинет выключен: на сервере не задана переменная{' '}
            <code>LK_PASSWORD</code>. Пока её нет, раздел не открывается вообще —
            неподготовленный деплой не должен показывать редакционные данные.
          </p>
        </div>
      )}
    </div>
  )
}
