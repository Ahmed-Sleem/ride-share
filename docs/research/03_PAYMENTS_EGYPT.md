# Research — Egyptian payment rails (2026)

Follows R10 in `01_RESEARCH_FINDINGS.md` (IPN/InstaPay reality, Paymob two-way
capability, payout thresholds, the pooled-cash problem). This pass answers one
question: **which gateway is the primary rail for this product?**

## Finding

| Provider | What it covers in Egypt | Fee | Notes |
|---|---|---|---|
| **Paymob** | Visa/Mastercard, **Meeza** (national debit), **mobile wallets** (Vodafone Cash, Orange Cash, etisalat cash, WE Pay), **Fawry OTC reference codes**, kiosk/valU BNPL | ~2.75% + 3 EGP | API-first, sandbox, multi-market. **Uber Egypt uses Paymob** for in-app card/wallet/OTC payments (thepaypers, 2021). |
| **Fawry** | cash-in at 200k+ agent points, bill payments, cards | ~2.75% + 3 EGP | Largest cash network; heavier consumer-bill orientation; reachable **through Paymob** as an OTC method anyway. |
| **InstaPay** | instant bank-to-bank (IPN network) | low/flat | Consumer P2P/transfer rail — relevant for **payouts**, not checkout. |
| valU / others | BNPL, POS | varies | Not needed at launch. |

## Recommendation (recorded as DEC-179 / DEC-180)

1. **Paymob is the primary gateway.** One integration covers cards + Meeza +
   mobile wallets + Fawry OTC — which is exactly the cashless spread this
   product needs, and Uber's choice for the same market. Sandbox now, live keys
   from the owner later.
2. **Cash stays the product's core** (the exact CH6 cash sequence). The gateway
   augments it; it does not replace it.
3. **Driver payouts** are weekly, ops-owned, via bank transfer / InstaPay. The
   ledger is the sole source of truth; disbursement is an operational action,
   not a code dependency, at launch.
4. Everything sits behind the CH6 `PaymentProvider` interface — the gateway is
   swappable, and the double-entry ledger never depends on a provider's ledger.

Sources: thepaypers (Uber–Paymob Egypt); payatlas Egypt PSP guide (Jan 2026);
dodopayments MENA PSP comparison (2026); naos-solutions Egypt gateway pricing;
xpay.app gateway comparison (2025).
