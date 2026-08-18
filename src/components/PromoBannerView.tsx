'use client'

import Image from 'next/image'
import { useEffect, useId, useState } from 'react'

import styles from './PromoBanner.module.css'

/**
 * Клиентская половина промо-полосы: частотный кап и подавление после клика.
 *
 * Зачем вообще клиентский слой. Серверный выбор привязан к адресу страницы,
 * поэтому постоянный читатель, возвращаясь на ту же страницу, увидит ту же
 * полосу и на десятый раз — она превратится в слепое пятно. Правила простые
 * и живут в localStorage:
 *
 *   - показали три раза, а по кампании не кликнули → следующий креатив;
 *   - кликнули → четырнадцать дней эту кампанию не показываем: человек уже
 *     дошёл до проекта, и повторное приглашение только мешает;
 *   - первая кампания подавлена → показываем вторую, а не пустоту.
 *
 * Высота полосы задана стилями и от подмены не меняется, поэтому вёрстку
 * не дёргает. Без JS и до гидратации виден серверный вариант — он полноценный,
 * а не скелет.
 */

interface Creative {
  id: string
  title: string
  slogan: string
  text: string
  action: string
  image: string
  href: string
}

interface Pack {
  campaignId: string
  creatives: Creative[]
}

const SEEN_LIMIT = 3
const MUTE_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

interface State {
  seen: number
  clickedAt?: number
}

function read(key: string): State {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as State) : { seen: 0 }
  } catch {
    // Приватный режим и отключённое хранилище — не повод падать: без памяти
    // полоса просто работает как серверная, без ротации.
    return { seen: 0 }
  }
}

function write(key: string, value: State) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* см. read() */
  }
}

function muted(state: State): boolean {
  return Boolean(state.clickedAt && Date.now() - state.clickedAt < MUTE_DAYS * DAY)
}

export function PromoBannerView({
  campaignId,
  creatives,
  index,
  fallback,
}: Pack & { index: number; fallback: Pack | null }) {
  const [shown, setShown] = useState({ campaignId, creative: creatives[index] })
  const titleId = useId()

  useEffect(() => {
    let pack: Pack = { campaignId, creatives }
    let state = read(`pb:${pack.campaignId}`)

    if (muted(state) && fallback) {
      const altState = read(`pb:${fallback.campaignId}`)
      if (!muted(altState)) {
        pack = fallback
        state = altState
      }
    }

    const shift = Math.floor(state.seen / SEEN_LIMIT)
    const next = pack.creatives[(index + shift) % pack.creatives.length]

    setShown({ campaignId: pack.campaignId, creative: next })
    write(`pb:${pack.campaignId}`, { ...state, seen: state.seen + 1 })
  }, [campaignId, creatives, fallback, index])

  const { creative } = shown

  const remember = () => {
    const key = `pb:${shown.campaignId}`
    write(key, { ...read(key), clickedAt: Date.now() })
  }

  return (
    <section className={styles.promo} aria-labelledby={titleId}>
      <div className={styles.media}>
        <Image
          src={creative.image}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 1200px"
          className={styles.image}
        />
      </div>

      <div className={styles.body}>
        <p className={`caption ${styles.kicker}`}>Проект редакции</p>
        <h2 id={titleId} className={styles.title}>
          {creative.title}
        </h2>
        <p className={styles.slogan}>{creative.slogan}</p>
        <p className={styles.text}>{creative.text}</p>
        <a className={styles.action} href={creative.href} onClick={remember}>
          {creative.action}
        </a>
      </div>
    </section>
  )
}
