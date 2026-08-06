'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { METRIKA_ID, SITE } from '@/lib/site'

/**
 * Яндекс.Метрика — §13.
 *
 * Три правила, из которых собран этот компонент:
 *
 * 1. **Без согласия счётчик не грузится.** §11.8 требует возможности отказа
 *    от аналитических cookie, а отказ «постфактум» отказом не является: к тому
 *    моменту cookie уже поставлены. Поэтому скрипт подключается только после
 *    выбора «Принять все» — либо сразу, если выбор сделан в прошлый визит.
 *
 * 2. **Только на своём домене.** Стенд и превью-сборки живут на других хостах;
 *    без этой проверки их трафик смешался бы с боевым, и статистика первых
 *    недель — самая важная для молодого сайта — оказалась бы испорчена.
 *
 * 3. **Переходы внутри сайта считаются вручную.** Next меняет адрес без
 *    перезагрузки страницы, а Метрика сама этого не видит: без `hit`
 *    на смену пути весь сеанс схлопнулся бы в один просмотр.
 */

declare global {
  interface Window {
    ym?: ((id: number, action: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number }
  }
}

const CONSENT_KEY = 'personoteka-cookie-consent'

type Ym = NonNullable<Window['ym']>

function load() {
  if (window.ym) return

  // Очередь вызовов до загрузки tag.js — фрагмент из инструкции Метрики.
  const ym = function (...args: unknown[]) {
    ;(ym.a = ym.a || []).push(args)
  } as Ym
  ym.l = Date.now()
  window.ym = ym

  const src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`
  if (!document.querySelector(`script[src="${src}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = src
    document.head.appendChild(script)
  }

  ym(METRIKA_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  })
}

export function Metrika() {
  const pathname = usePathname()
  const started = useRef(false)
  const firstPath = useRef<string | null>(null)

  useEffect(() => {
    if (METRIKA_ID <= 0) return
    if (location.hostname !== new URL(SITE.url).hostname) return

    const start = () => {
      if (started.current) return
      started.current = true
      firstPath.current = location.pathname
      load()
    }

    let allowed = false
    try {
      allowed = localStorage.getItem(CONSENT_KEY) === 'all'
    } catch {
      // Приватный режим: считаем, что согласия нет.
    }
    if (allowed) start()

    window.addEventListener('personoteka:analytics-allowed', start)
    return () => window.removeEventListener('personoteka:analytics-allowed', start)
  }, [])

  useEffect(() => {
    if (!started.current || !window.ym) return
    // Первый просмотр Метрика засчитывает сама при init — иначе он удвоится.
    if (firstPath.current === pathname) {
      firstPath.current = null
      return
    }
    window.ym(METRIKA_ID, 'hit', location.href, { referer: document.referrer })
  }, [pathname])

  return null
}
