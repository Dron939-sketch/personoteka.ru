'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import type { Photo } from '@/lib/types'

import styles from './Gallery.module.css'

/**
 * Галерея с лайтбоксом (§7.6). Лайтбокс — нативный `<dialog>`: он сам даёт
 * ловушку фокуса, закрытие по Esc и подложку, а листание стрелками добавляем
 * поверх (критерий приёмки §15: полная навигация с клавиатуры, включая лайтбокс).
 */
export function Gallery({ photos, personName }: { photos: Photo[]; personName: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open !== null && !dialog.open) dialog.showModal()
    if (open === null && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setOpen((i) => ((i ?? 0) + 1) % photos.length)
      if (e.key === 'ArrowLeft') setOpen((i) => ((i ?? 0) - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, photos.length])

  if (!photos.length) return null

  const current = open !== null ? photos[open] : null

  return (
    <>
      <ul className={styles.grid}>
        {photos.map((photo, i) => (
          <li key={photo.src}>
            <button type="button" className={styles.thumb} onClick={() => setOpen(i)}>
              <Image
                src={photo.src}
                alt={photo.alt ?? `${personName}: фотография ${i + 1}`}
                width={320}
                height={Math.round((320 * photo.height) / photo.width)}
                sizes="(min-width: 768px) 240px, 45vw"
              />
              <span className="visually-hidden">Открыть во весь экран</span>
            </button>
            {photo.caption && <p className={styles.caption}>{photo.caption}</p>}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          // Клик по подложке (а не по картинке) закрывает лайтбокс.
          if (e.target === dialogRef.current) setOpen(null)
        }}
      >
        {current && (
          <figure className={styles.figure}>
            <Image
              src={current.src}
              alt={current.alt ?? `${personName}: фотография`}
              width={current.width}
              height={current.height}
              sizes="90vw"
            />
            <figcaption className={styles.figcaption}>
              <span>
                {current.caption ?? personName}
                {photos.length > 1 ? ` · ${(open ?? 0) + 1} из ${photos.length}` : ''}
              </span>
              <button type="button" className={styles.close} onClick={() => setOpen(null)}>
                Закрыть
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  )
}
