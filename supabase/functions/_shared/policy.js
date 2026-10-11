// Refund owed when the GUEST cancels, per the published conditions (single source: pricing.json).
import { diffDays, todayIso } from './quote.js';

/**
 * @param {{ fullRefundDays: number }} cancellation
 * @param {number} balanceDaysBefore
 * @param {{ checkin: string, paid: number }} b  paid = amount already collected (cents)
 * @returns {{ refund: number, rule: string }}
 */
export function guestCancellationRefund(cancellation, balanceDaysBefore, b, today = todayIso()) {
  const d = diffDays(today, b.checkin);
  if (d >= cancellation.fullRefundDays) return { refund: b.paid, rule: `${d} jours avant l’arrivée : remboursement intégral` };
  if (d >= balanceDaysBefore) return { refund: 0, rule: `${d} jours avant l’arrivée : l’acompte reste acquis` };
  return { refund: 0, rule: `${d} jours avant l’arrivée : le séjour reste dû` };
}
