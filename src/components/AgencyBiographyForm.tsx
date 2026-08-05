'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import styles from './AgencyBiographyForm.module.css'

/**
 * Форма публикации биографии агентством.
 *
 * Форма ведёт себя как шаблон портала, а не как пустое поле ввода: разделы,
 * источники и рубрики — отдельные поля, потому что именно из них собирается
 * структура страницы и разметка schema.org. Свободный текст одним куском
 * пришлось бы разбирать обратно, и разбирать неточно.
 *
 * Счётчики знаков показываются до отправки: узнать, что лид длиннее 600 знаков,
 * лучше во время правки, чем после нажатия «опубликовать».
 *
 * Абзацы внутри раздела разделяются пустой строкой — так же, как в любом
 * текстовом редакторе, откуда текст обычно и копируют.
 */

export interface Named {
  slug: string
  name: string
}

interface Section {
  heading: string
  text: string
}

interface Source {
  title: string
  url: string
}

interface UploadedPhoto {
  src: string
  width: number
  height: number
}

const LEAD_MAX = 600
const TAGLINE_MAX = 120

export function AgencyBiographyForm({
  spheres,
  cities,
  bodyMin,
  bodyMax,
}: {
  spheres: Named[]
  cities: Named[]
  bodyMin: number
  bodyMax: number
}) {
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tagline, setTagline] = useState('')
  const [lead, setLead] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [city, setCity] = useState('')
  const [chosenSpheres, setChosenSpheres] = useState<string[]>([])
  const [occupations, setOccupations] = useState('')
  const [sections, setSections] = useState<Section[]>([
    { heading: 'Ранние годы', text: '' },
    { heading: 'Карьера', text: '' },
  ])
  const [facts, setFacts] = useState('')
  const [sources, setSources] = useState<Source[]>([{ title: '', url: '' }])
  const [links, setLinks] = useState<Source[]>([{ title: '', url: '' }])
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null)
  const [photoAuthor, setPhotoAuthor] = useState('')
  const [uploading, setUploading] = useState(false)
  const [consentHero, setConsentHero] = useState(false)
  const [foreignChecked, setForeignChecked] = useState(false)

  const [errors, setErrors] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const bodyLength = useMemo(
    () => sections.reduce((sum, s) => sum + paragraphs(s.text).join(' ').length, 0),
    [sections],
  )

  const nameForPhoto = displayName.trim() || fullName.trim()

  async function uploadPhoto(file: File) {
    if (!nameForPhoto) {
      setErrors(['Сначала укажите имя героя — по нему называется файл портрета'])
      return
    }
    setUploading(true)
    setErrors([])
    try {
      const data = new FormData()
      data.set('file', file)
      data.set('name', nameForPhoto)
      const response = await fetch('/api/lk/foto/', { method: 'POST', body: data })
      const body = (await response.json()) as { photo?: UploadedPhoto; error?: string }
      if (!response.ok || !body.photo) throw new Error(body.error ?? 'Не удалось загрузить')
      setPhoto(body.photo)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Не удалось загрузить портрет'])
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    setErrors([])
    try {
      const response = await fetch('/api/lk/biografiya/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          display_name: displayName || undefined,
          tagline,
          lead,
          birth_date: birthDate || undefined,
          city: city || undefined,
          spheres: chosenSpheres,
          occupations: occupations
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
          body: sections
            .filter((s) => s.heading.trim() && s.text.trim())
            .map((s) => ({ heading: s.heading.trim(), paragraphs: paragraphs(s.text) })),
          facts: facts
            .split('\n')
            .map((f) => f.trim())
            .filter(Boolean),
          sources: sources
            .filter((s) => s.title.trim())
            .map((s) => ({ title: s.title.trim(), url: s.url.trim() || undefined })),
          links: links
            .filter((l) => l.url.trim())
            .map((l) => ({ url: l.url.trim(), label: l.title.trim() || undefined })),
          photo: photo ? { ...photo, author: photoAuthor || undefined } : undefined,
          consent_hero: consentHero,
          foreign_agent_checked: foreignChecked,
        }),
      })
      const body = (await response.json()) as { slug?: string; errors?: string[]; error?: string }
      if (!response.ok) {
        setErrors(body.errors ?? [body.error ?? 'Не удалось опубликовать'])
        return
      }
      setDone(body.slug ?? null)
    } catch {
      setErrors(['Сеть не отвечает. Попробуйте ещё раз — введённое не потеряется.'])
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className={styles.done}>
        <p className={styles.doneTitle}>Страница опубликована.</p>
        <p>
          Она уже на сайте: <a href={`/${done}/`}>{`personoteka.ru/${done}/`}</a>. Редакция
          прочитает материал и, если он расходится с редполитикой, свяжется с вами.
        </p>
        <p>
          <a href="/lk/agentstvo/">Вернуться к списку страниц</a>
        </p>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Кто герой</legend>

        <label className={styles.field}>
          <span className={styles.label}>Полное имя</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <span className={styles.hint}>Как в документах: «Иванов Иван Иванович».</span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Имя на странице</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <span className={styles.hint}>
            То, под чем героя знают. Из него получается адрес страницы. Пусто — возьмём
            полное имя.
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Подзаголовок <Counter now={tagline.length} max={TAGLINE_MAX} />
          </span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} required />
          <span className={styles.hint}>Одна строка: кто это. «Хирург, доктор наук».</span>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Лид <Counter now={lead.length} max={LEAD_MAX} />
          </span>
          <textarea rows={4} value={lead} onChange={(e) => setLead(e.target.value)} required />
          <span className={styles.hint}>
            Первый абзац страницы и описание для поиска. Без превосходных степеней.
          </span>
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Дата рождения</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Город</span>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">— не указан —</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.checks}>
          <legend className={styles.label}>Рубрики — от одной до трёх</legend>
          {spheres.map((s) => (
            <label key={s.slug} className={styles.check}>
              <input
                type="checkbox"
                checked={chosenSpheres.includes(s.slug)}
                onChange={(e) =>
                  setChosenSpheres((prev) =>
                    e.target.checked
                      ? [...prev, s.slug].slice(0, 3)
                      : prev.filter((x) => x !== s.slug),
                  )
                }
              />
              <span>{s.name}</span>
            </label>
          ))}
        </fieldset>

        <label className={styles.field}>
          <span className={styles.label}>Род занятий</span>
          <input
            value={occupations}
            onChange={(e) => setOccupations(e.target.value)}
            placeholder="предприниматель, инвестор"
            required
          />
          <span className={styles.hint}>Через запятую.</span>
        </label>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>
          Биография{' '}
          <Counter now={bodyLength} max={bodyMax} min={bodyMin} unit="знаков" />
        </legend>

        {sections.map((section, i) => (
          <div key={i} className={styles.section}>
            <label className={styles.field}>
              <span className={styles.label}>Заголовок раздела</span>
              <input
                value={section.heading}
                onChange={(e) => patch(setSections, i, { heading: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Текст</span>
              <textarea
                rows={8}
                value={section.text}
                onChange={(e) => patch(setSections, i, { text: e.target.value })}
              />
              <span className={styles.hint}>Абзацы разделяются пустой строкой.</span>
            </label>
            {sections.length > 1 && (
              <button
                type="button"
                className={styles.remove}
                onClick={() => setSections((prev) => prev.filter((_, j) => j !== i))}
              >
                Убрать раздел
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          className={styles.add}
          onClick={() => setSections((prev) => [...prev, { heading: '', text: '' }])}
        >
          Добавить раздел
        </button>

        <label className={styles.field}>
          <span className={styles.label}>Факты</span>
          <textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} />
          <span className={styles.hint}>По одному в строке. Необязательно.</span>
        </label>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Источники</legend>
        <p className={styles.groupNote}>
          Обязательны: по ним редакция проверяет факты. Публикации в СМИ, официальные
          реестры, сайты организаций — то, что можно открыть и прочитать.
        </p>
        {sources.map((source, i) => (
          <div key={i} className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Название</span>
              <input
                value={source.title}
                onChange={(e) => patch(setSources, i, { title: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ссылка</span>
              <input
                type="url"
                value={source.url}
                onChange={(e) => patch(setSources, i, { url: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className={styles.add}
          onClick={() => setSources((prev) => [...prev, { title: '', url: '' }])}
        >
          Добавить источник
        </button>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Ссылки героя</legend>
        <p className={styles.groupNote}>
          Сайт и соцсети — попадут в разметку sameAs. Необязательно.
        </p>
        {links.map((link, i) => (
          <div key={i} className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Подпись</span>
              <input
                value={link.title}
                onChange={(e) => patch(setLinks, i, { title: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Адрес</span>
              <input
                type="url"
                value={link.url}
                onChange={(e) => patch(setLinks, i, { url: e.target.value })}
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          className={styles.add}
          onClick={() => setLinks((prev) => [...prev, { title: '', url: '' }])}
        >
          Добавить ссылку
        </button>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Портрет</legend>
        <p className={styles.groupNote}>
          Кадр 4:5 портал сделает сам, лицо найдёт автоматически. Нужен снимок не меньше
          600×750, лучше 1200×1500.
        </p>

        <div className={styles.photoRow}>
          {photo && (
            <Image
              src={photo.src}
              alt=""
              width={120}
              height={150}
              className={styles.preview}
              unoptimized
            />
          )}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="portrait">
              Файл
            </label>
            <input
              id="portrait"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadPhoto(file)
              }}
            />
            {uploading && <span className={styles.hint}>Обрабатываем снимок…</span>}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Автор снимка</span>
          <input value={photoAuthor} onChange={(e) => setPhotoAuthor(e.target.value)} />
          <span className={styles.hint}>
            Если не указан, основанием будет записано «предоставлено героем».
          </span>
        </label>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Подтверждения</legend>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={consentHero}
            onChange={(e) => setConsentHero(e.target.checked)}
          />
          <span>
            Герой дал согласие на публикацию биографии и распространение указанных
            сведений, либо это публичная фигура и все сведения общедоступны (§11.2).
          </span>
        </label>

        <label className={styles.check}>
          <input
            type="checkbox"
            checked={foreignChecked}
            onChange={(e) => setForeignChecked(e.target.checked)}
          />
          <span>
            Герой сверен с реестром иностранных агентов Минюста и в нём не числится.
            Если числится — напишите менеджеру, страница требует установленной законом
            пометки.
          </span>
        </label>
      </fieldset>

      {errors.length > 0 && (
        <div className={styles.errors} role="alert">
          <p className={styles.errorsTitle}>Публикация не прошла:</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className={styles.submit} disabled={sending}>
        {sending ? 'Публикуем…' : 'Опубликовать'}
      </button>
      <p className={styles.note}>
        Страница появится на сайте сразу. Редакция читает материалы агентств
        постфактум и может снять текст, расходящийся с редполитикой.
      </p>
    </form>
  )
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean)
}

function patch<T>(
  set: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  values: Partial<T>,
): void {
  set((prev) => prev.map((item, i) => (i === index ? { ...item, ...values } : item)))
}

function Counter({
  now,
  max,
  min,
  unit,
}: {
  now: number
  max: number
  min?: number
  unit?: string
}) {
  const bad = now > max || (min !== undefined && now > 0 && now < min)
  return (
    <span className={`tabular ${bad ? styles.counterBad : styles.counter}`}>
      {now} / {max}
      {unit ? ` ${unit}` : ''}
      {min !== undefined ? ` (минимум ${min})` : ''}
    </span>
  )
}
