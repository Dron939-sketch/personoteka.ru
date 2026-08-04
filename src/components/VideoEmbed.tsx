'use client'

import { useState } from 'react'

import type { VideoEmbed as VideoEmbedData } from '@/lib/types'

import styles from './VideoEmbed.module.css'

const SRC: Record<VideoEmbedData['provider'], (id: string) => string> = {
  vk: (id) => `https://vk.com/video_ext.php?${id}&autoplay=1`,
  rutube: (id) => `https://rutube.ru/play/embed/${id}/?autoplay=1`,
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
}

const PROVIDER_NAME: Record<VideoEmbedData['provider'], string> = {
  vk: 'VK Видео',
  rutube: 'RuTube',
  youtube: 'YouTube',
}

/**
 * Фасад видео (§7.6, §9.2): до нажатия на странице нет ни плеера, ни его скриптов —
 * только превью и кнопка. Это единственный способ удержать бюджет JS страницы персоны
 * (≤ 120 КБ gzip) и не отдать сторонним доменам загрузку до согласия пользователя.
 */
export function VideoEmbed({ video }: { video: VideoEmbedData }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className={styles.frame}>
        <iframe
          className={styles.player}
          src={SRC[video.provider](video.id)}
          title={video.title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className={styles.frame}>
      <button
        type="button"
        className={styles.facade}
        onClick={() => setPlaying(true)}
        style={video.poster ? { backgroundImage: `url(${video.poster})` } : undefined}
      >
        <span className={styles.play} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path d="M6 3.5 18 11 6 18.5Z" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.label}>
          <span className={styles.title}>{video.title}</span>
          <span className={styles.provider}>
            Смотреть на {PROVIDER_NAME[video.provider]} — плеер загрузится по нажатию
          </span>
        </span>
      </button>
    </div>
  )
}
