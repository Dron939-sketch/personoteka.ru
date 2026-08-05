/**
 * Типы и подписи реестра заявок — отдельным модулем от `tickets.ts`, потому что
 * тот помечен `server-only` (там файловый доступ и ПДн). Переключатель состояния
 * в кабинете — клиентский компонент, и ему нужны ровно эти три вещи.
 */

export type TicketKind = 'lead' | 'removal'
export type TicketState = 'open' | 'in_work' | 'done' | 'rejected'

export const TICKET_STATE_LABEL: Record<TicketState, string> = {
  open: 'новая',
  in_work: 'в работе',
  done: 'закрыта',
  rejected: 'отклонена',
}
