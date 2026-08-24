/* Payments contract — the ONLY public surface other modules may import
   (CH8a §8a.2). Path B's boarding/manifest work consumes exactly this:
   markCashCollected (the driver's cash tap), issueCredit (refund-as-credit
   on cancellation), bookingPaymentInfo (the payment-choice rendering). */
export { PaymentsService } from '../application/payments.service.js';
export { TOPUP_MIN_MINOR, TOPUP_MAX_MINOR } from '../application/payments.service.js';
/* Path B wiring points (PATH_A_MONEY.md §8):
   - booking flow, rider chose "wallet":  PaymentsService.chargeWalletForBooking(actor, bookingId)
   - driver's cash tap on the manifest:   PaymentsService.markCashCollected via POST /payments/cash-collected
   - cancellation refund → wallet credit: PaymentsService.issueCredit({ riderId, amountMinor, bookingId, reason, actorLabel }) */
