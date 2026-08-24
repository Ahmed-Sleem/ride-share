/* ══════════════════════════════════════════════════════════════════════
   WALLET & PAYMENTS screens (Path A — money).
   This file is OWNED by the money path (docs/planning/PATH_A_MONEY.md):
   wallet balance, top-up (Paymob first, cash second — DEC-204), payment
   method choice, transaction history. The other parallel path must not
   edit it (see the ownership table in PATH_A_MONEY.md / PATH_B_JOURNEY.md).
   Until the payments backend lands (P3.7) this stays an honest coming-soon
   state — no invented balance, no fake success (§8).                       */
function riderWallet(){                                       // R-40
  const w=$("div",{class:"main"});
  /* Wallet and payments arrive with booking (M3) — no invented balance. */
  w.append(Empty("wallet", t("comingSoon"), t("walletComingBody")));
  return w;
}
