import { METRIKA_ID, SITE } from '@/lib/site'

/**
 * Код счётчика Яндекс.Метрики в разметке страницы — §13.
 *
 * Почему инлайн-скрипт, а не сборка тега из клиентского компонента:
 *
 * 1. **Код должен быть виден в HTML.** Проверяющие роботы — в первую очередь
 *    подтверждение прав в Яндекс.Вебмастере «через счётчик Метрики» — просто
 *    скачивают страницу и ищут в ней номер счётчика. Если тег создаётся
 *    скриптом после гидратации, в скачанном HTML его нет.
 * 2. **Счётчик стартует раньше.** Инлайн-скрипт выполняется до загрузки
 *    React-бандла, поэтому просмотр засчитывается даже если посетитель ушёл
 *    со страницы до гидратации.
 *
 * Что при этом сохранено без изменений: **без согласия ничего не грузится.**
 * В разметке лежит только определение функции; вызывается она либо сразу —
 * если согласие дано в прошлый визит, — либо по событию из баннера cookie.
 * До этого ни один запрос к mc.yandex.ru не уходит и ни одна cookie не ставится.
 *
 * Пиксель `<noscript>` из стандартной инструкции Метрики намеренно не выводится:
 * он срабатывает при отключённом JavaScript, то есть ровно тогда, когда баннер
 * согласия не работает, — получилось бы отслеживание без согласия (§11.8).
 */
export function MetrikaScript() {
  if (METRIKA_ID <= 0) return null

  const host = new URL(SITE.url).hostname

  // Стенды и превью-сборки живут на других хостах: без этой проверки их трафик
  // смешался бы с боевым, а статистика первых недель важнее всего.
  const code = `window.__personotekaMetrika=function(){
if(window.__personotekaMetrikaOn)return;
if(location.hostname!==${JSON.stringify(host)})return;
window.__personotekaMetrikaOn=1;
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}','ym');
ym(${METRIKA_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
};
try{if(localStorage.getItem('personoteka-cookie-consent')==='all'){window.__personotekaMetrika()}}catch(e){}`

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
