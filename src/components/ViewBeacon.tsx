'use client'

import { useEffect } from 'react'

/**
 * Маяк просмотра. Ничего не рисует и ничего не хранит на устройстве: один
 * POST со слагом страницы. Cookie не ставит, поэтому согласия не требует
 * и работает независимо от выбора в баннере.
 *
 * `keepalive` — чтобы запрос дожил до конца, если читатель сразу ушёл
 * по ссылке. Ошибка глотается: счётчик не может быть причиной ошибки
 * на странице читателя.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/prosmotr/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
        keepalive: true,
      }).catch(() => {})
    }, 1500) // страница, закрытая за секунду, просмотром не считается
    return () => clearTimeout(timer)
  }, [slug])

  return null
}
