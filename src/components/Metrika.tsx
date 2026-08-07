'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { METRIKA_ID } from '@/lib/site'

/**
 * Яндекс.Метрика, клиентская часть — §13.
 *
 * Сам код счётчика лежит в разметке (`components/MetrikaScript`): так его видят
 * проверяющие роботы и так он стартует до гидратации. Здесь остаётся то, что
 * без React сделать нельзя:
 *
 * 1. **Запуск по согласию.** Если посетитель нажимает «Принять все» прямо
 *    сейчас, счётчик нужно поднять в тот же момент, не дожидаясь перезагрузки.
 * 2. **Переходы внутри сайта.** Next меняет адрес без перезагрузки страницы,
 *    а Метрика сама этого не видит: без `hit` на смену пути весь сеанс
 *    схлопнулся бы в один просмотр.
 */

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void
    /** Поднимает счётчик. Определена инлайн-скриптом в разметке. */
    __personotekaMetrika?: () => void
    /** Счётчик уже поднят — выставляется той же функцией. */
    __personotekaMetrikaOn?: number
  }
}

export function Metrika() {
  const pathname = usePathname()
  const started = useRef(false)
  const firstPath = useRef<string | null>(null)

  useEffect(() => {
    if (METRIKA_ID <= 0) return

    // Первый просмотр Метрика засчитывает сама при init — запоминаем путь,
    // на котором это произошло, иначе он удвоится.
    const markStarted = () => {
      started.current = true
      firstPath.current = location.pathname
    }

    // Согласие было дано раньше: инлайн-скрипт уже всё поднял.
    if (window.__personotekaMetrikaOn) {
      markStarted()
      return
    }

    const start = () => {
      if (started.current) return
      markStarted()
      window.__personotekaMetrika?.()
    }

    window.addEventListener('personoteka:analytics-allowed', start)
    return () => window.removeEventListener('personoteka:analytics-allowed', start)
  }, [])

  useEffect(() => {
    if (!started.current || !window.ym) return
    if (firstPath.current === pathname) {
      firstPath.current = null
      return
    }
    window.ym(METRIKA_ID, 'hit', location.href, { referer: document.referrer })
  }, [pathname])

  return null
}
