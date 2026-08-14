import type { Metadata, Viewport } from 'next'

import { CookieBanner } from '@/components/CookieBanner'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { ThemeScript } from '@/components/ThemeScript'
import { lowerFirst } from '@/lib/format'
import { SITE } from '@/lib/site'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${lowerFirst(SITE.tagline)}`,
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
        <a className="skip-link" href="#content">
          Перейти к содержанию
        </a>
        <Header />
        <main id="content">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  )
}
