import Link from 'next/link'

import { SITE } from '@/lib/site'

import styles from './Footer.module.css'

/**
 * Подвал (§4.2): четыре колонки — О проекте / Разделы / Для клиентов / Правовое,
 * возрастная маркировка, свидетельство СМИ, копирайт, ссылка на форму удаления данных.
 *
 * Блок свидетельства СМИ появляется только после регистрации сетевого издания:
 * до этого обещать «публикацию в СМИ» запрещено (§11.5).
 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={`container container-wide ${styles.grid}`}>
        <section>
          <h2 className={`caption ${styles.title}`}>О проекте</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/o-proekte/">О «Персонотеке»</Link>
            </li>
            <li>
              <Link href="/redpolitika/">Редакционная политика</Link>
            </li>
            <li>
              <Link href="/redakciya/">Редакция</Link>
            </li>
            <li>
              <Link href="/kontakty/">Контакты</Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={`caption ${styles.title}`}>Разделы</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/katalog/">Каталог персон</Link>
            </li>
            <li>
              <Link href="/rejting/">Индекс внимания</Link>
            </li>
            <li>
              <Link href="/rodilis-segodnya/">Родились сегодня</Link>
            </li>
            <li>
              <Link href="/interv-yu/">Интервью</Link>
            </li>
            <li>
              <Link href="/novosti/">Новости</Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={`caption ${styles.title}`}>Для клиентов</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/razmestit/">Разместить биографию</Link>
            </li>
            <li>
              <Link href="/tarify/">Тарифы</Link>
            </li>
            <li>
              <Link href="/lk/">Личный кабинет</Link>
            </li>
            <li>
              <Link href="/reklama/">Реклама</Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className={`caption ${styles.title}`}>Правовое</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/pravila/">Правила пользования</Link>
            </li>
            <li>
              <Link href="/politika-konfidencialnosti/">Политика обработки ПДн</Link>
            </li>
            <li>
              <Link href="/udalenie-dannyh/">Удаление и исправление данных</Link>
            </li>
          </ul>
        </section>
      </div>

      <div className={`container container-wide ${styles.bottom}`}>
        <p className={styles.legal}>
          © {year} «{SITE.name}». Сведения о персонах публикуются с согласия героев либо
          на основании общедоступных источников. Ответственность за достоверность данных,
          предоставленных героем публикации, несёт герой публикации.
        </p>
        <div className={styles.marks}>
          <span className={styles.age} aria-label={`Возрастная маркировка: ${SITE.ageRating}`}>
            {SITE.ageRating}
          </span>
          {SITE.smiCertificate ? (
            <span className={styles.smi}>{SITE.smiCertificate}</span>
          ) : null}
          <Link href="/udalenie-dannyh/" className={styles.removal}>
            Запросить удаление данных
          </Link>
        </div>
      </div>
    </footer>
  )
}
