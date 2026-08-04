import Image from 'next/image'
import Link from 'next/link'

import styles from './PromoLektorij.module.css'

/**
 * Промо-полоса Лектория Мейстера.
 *
 * Это не рекламный блок и намеренно не использует AdSlot. По ТЗ рекламное
 * место живёт только на бесплатных профилях, а здесь другое: собственный
 * проект издателя на собственном сайте. По части 2 статьи 2 закона о рекламе
 * такая информация рекламой не считается, поэтому ни плашки «Реклама»,
 * ни токена erid не требуется — достаточно честной подписи «Проект редакции».
 *
 * Текст лежит в разметке, а не в картинке: заголовок читается поисковиком
 * и экранным диктором, переводится на тёмную тему и не ломается на узком
 * экране. Изображение — только фон, поэтому у него пустое `alt`.
 */
export function PromoLektorij() {
  return (
    <section className={styles.promo} aria-labelledby="promo-lektorij">
      <div className={styles.media}>
        <Image
          src="/media/promo/lektorij.jpg"
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 1200px"
          className={styles.image}
        />
      </div>

      <div className={styles.body}>
        <p className={`caption ${styles.kicker}`}>Проект редакции</p>
        <h2 id="promo-lektorij" className={styles.title}>
          Лекторий Мейстера
        </h2>
        <p className={styles.slogan}>Понимание вместо советов</p>
        <p className={styles.text}>
          Лекции о том, как устроены мышление, отношения и решения. Не рецепты
          на каждый день, а разбор механизма — чтобы дальше вы решали сами.
        </p>
        <Link className={styles.action} href="https://meysternlp.ru/blog/lektorij/">
          Смотреть лекции
        </Link>
      </div>
    </section>
  )
}
