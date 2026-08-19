import type { Metadata, Viewport } from 'next'

import { CookieBanner } from '@/components/CookieBanner'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { Metrika } from '@/components/Metrika'
import { MetrikaScript } from '@/components/MetrikaScript'
import { ThemeScript } from '@/components/ThemeScript'
import { GOOGLE_VERIFICATION, SITE, YANDEX_VERIFICATION } from '@/lib/site'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline.toLowerCase()}`,
    template: `%s — ${SITE.name}`,
  },
  description:
    'Биографический справочник: страницы экспертов, предпринимателей, руководителей и деятелей культуры. Проверяемые факты, источники, дата обновления.',
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
  },
  robots: { index: true, follow: true },
  alternates: { types: { 'application/rss+xml': `${SITE.url}/feed.xml` } },
  // Коды подтверждения прав в Яндекс.Вебмастере и Google Search Console.
  // Оба зашиты в `site.ts`: секретом они не являются — поисковики сами
  // публикуют их мета-тегом на каждой странице, — зато переживают перенос
  // хостинга. Права перепроверяются периодически, и код, заданный только
  // переменной окружения, слетел бы вместе с ней молча.
  verification: {
    yandex: YANDEX_VERIFICATION || undefined,
    google: GOOGLE_VERIFICATION || undefined,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#111418' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <MetrikaScript />
        <a className="skip-link" href="#content">
          Перейти к содержанию
        </a>
        <Header />
        <main id="content">{children}</main>
        <Footer />
        <CookieBanner />
        <Metrika />
      </body>
    </html>
  )
}
