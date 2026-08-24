/* ══════════════════════════════════════════════════════════════════════
   WALLET & PAYMENTS screens (Path A — money). Owned exclusively by the
   money path (docs/planning/PATH_A_MONEY.md). Everything renders from the
   REAL API: the balance is DERIVED by the backend from the ledger (never
   invented client-side), and every state is honest — loading, empty, error,
   and Paymob-off (§8.1: hidden option + one plain sentence, no dead
   buttons). paymentChoice() is the embeddable payment-method component
   Path B drops into the booking review screen.                     */
function riderWallet(){                                       // R-40
  const w=$("div",{class:"main"});
  const cfg = S.payConfig;

  // fetch the session-scoped config + wallet on first paint
  if(!cfg && !S.payConfigError){ payConfigLoad(); }
  if(S.walletLoading === undefined && !S.walletError){ walletLoad(); }

  if(S.walletError){
    w.append(Banner("danger", S.walletError));
  }
  if(S.walletLoading && !S.wallet){
    w.append(Banner("info", t("loading")));
  }

  if(S.wallet){
    w.append(Card("",
      $("div",{class:"t-micro",text:t("w_balance")}),
      $("div",{class:"pricetag ltr",text:money(S.wallet.balanceMinor/100)}),
      Divider()
    ));
    // Top-up: only when the backend says Paymob is live (§8.1 hide, don't
    // disable). When off, one honest sentence explains the state.
    if(cfg && cfg.paymobEnabled){
      w.append($("div",{class:"pad"},
        Btn({label:t("w_topup"), block:true, icon:"card", on:()=>openSheet("topup")})));
    } else {
      w.append($("div",{class:"pad"},
        Banner("info", t("w_paymobOff")),
        $("div",{class:"t-cap",text:t("w_payCash")})));
    }
    w.append($("div",{class:"t-cap",text:t("w_history")}));
    const entries = S.wallet.entries || [];
    if(entries.length === 0){
      w.append(Empty("card", t("w_entriesEmpty"), ""));
    } else {
      const list=Card("");
      entries.forEach((e)=>{
        const inbound = e.side === "credit";
        list.append(Row({
          icon: inbound ? "card" : "trips",
          title: t("w_reason_"+e.reason) !== ("w_reason_"+e.reason) ? t("w_reason_"+e.reason) : e.reason,
          sub: new Date(e.createdAt).toLocaleString(S.lang === "ar" ? "ar-EG" : "en-EG"),
          right: $("div",{class:"fare ltr",text:(inbound?"+ ":"− ")+money(e.amountMinor/100)}),
        }));
      });
      w.append(list);
    }
  } else if(!S.walletError && !S.walletLoading){
    w.append(Banner("info", t("loading")));
  }
  return w;
}

/* Loads the payment config once per session (drives ALL paymob visibility). */
async function payConfigLoad(){
  S.payConfigError = null;
  try{
    S.payConfig = await API.paymentsConfig();
  }catch(e){
    S.payConfigError = errText(e.messageKey);   // config unreachable: keep options hidden
    S.payConfig = null;
  }
  render();
}

/* Loads the derived wallet. */
async function walletLoad(){
  S.walletLoading = true; S.walletError = null; render();
  try{
    S.wallet = await API.wallet();
  }catch(e){
    S.walletError = errText(e.messageKey);
  }
  S.walletLoading = false; render();
}

/* ── Top-up sheet ───────────────────────────────────────────────────────
   Presets + custom amount in whole EGP; bounds come from the SERVER config
   (never a second copy §0.3). Paymob first (DEC-204). On success the
   provider's secure iframe opens in a new tab.                             */
const W_TOPUP_PRESETS = [50, 100, 200, 500];   // display EGP; suggestion only

function topupSheet(){
  const cfg = S.payConfig || {};
  const min = Math.ceil((cfg.topupMinMinor || 500)/100);
  const max = Math.floor((cfg.topupMaxMinor || 1000000)/100);
  const body=$("div",{class:"col gap3"});

  if(!cfg.paymobEnabled){
    // Sheet opened with Paymob off (config refreshed meanwhile) — honest close.
    return Sheet(t("w_topup"),
      Banner("info", t("w_paymobOff")),
      $("div",{class:"t-cap",text:t("w_payCash")}),
      Btn({label:t("close"), block:true, on:closeSheet}));
  }

  const chips=$("div",{class:"row gap3 wrap"});
  W_TOPUP_PRESETS.forEach((v)=>{
    chips.append(Chip({label:String(v), pressed:S.topupAmount===v,
      on:()=>{ S.topupAmount=v; S.topupCustom=""; openSheet("topup"); }}));
  });
  const custom=$("input",{id:"topup-custom", attrs:{type:"number", inputmode:"numeric",
    min:String(min), max:String(max), "aria-label":t("w_custom"), placeholder:t("w_custom")},
    on:{input:(e)=>{ S.topupCustom=e.target.value; S.topupAmount=null; }}});
  if(S.topupCustom) custom.value = S.topupCustom;

  body.append(
    $("div",{class:"t-cap",text:t("w_topupBody")}),
    chips,
    $("label",{class:"t-micro",attrs:{for:"topup-custom"},text:t("w_custom")}),
    custom,
    $("div",{class:"t-micro",text:`${min} – ${max} EGP · `+t("w_amount")})
  );
  if(S.topupError) body.append(Banner("danger", S.topupError));

  const amountEgp = S.topupCustom ? Number(S.topupCustom) : S.topupAmount;
  const valid = Number.isInteger(amountEgp) && amountEgp>=min && amountEgp<=max;
  body.append(Btn({label:t("w_openPay"), block:true, dis:S.topupBusy||!valid,
    on:()=>topupSubmit(amountEgp)}));
  return Sheet(t("w_topup"), body);
}

async function topupSubmit(amountEgp){
  S.topupBusy=true; S.topupError=null; S.topupOk=false; render();
  try{
    const res = await API.topup(Math.round(amountEgp*100));
    S.topupOk=true; closeSheet();
    if(typeof window!=="undefined" && res && res.iframeUrl){
      window.open(res.iframeUrl, "_blank", "noopener");
    }
    toast(t("w_topupOk"));
    walletLoad();                      // order is pending; balance updates on webhook
  }catch(e){
    S.topupError = errText(e.messageKey);
  }
  S.topupBusy=false; render();
}

/* ── Payment-choice component (embedded by Path B's review screen) ────────
   Renders the DEC-204 order: Wallet (when it can cover the fare) → card
   (Paymob, when enabled) → Cash. Selection is S.payMethod; nothing dead is
   shown — methods that cannot be used are absent, not disabled.          */
function paymentChoice(fareMinor){
  const cfg = S.payConfig || {};
  const bal = S.wallet ? S.wallet.balanceMinor : 0;
  const sufficient = bal >= fareMinor;
  const methods=[];
  if(sufficient){
    methods.push({k:"wallet", icon:"card", title:t("w_useWallet"),
      sub:`${t("w_walletHas")}: ${money(bal/100)}`});
  }
  if(cfg.paymobEnabled){
    methods.push({k:"card", icon:"card", title:t("w_topupShort"),
      sub:cfg.topupMinMinor?`${Math.ceil(cfg.topupMinMinor/100)}+ EGP`:""});
  }
  methods.push({k:"cash", icon:"trips", title:t("w_payCash")});
  if(!S.payMethod || !methods.some(m=>m.k===S.payMethod)) S.payMethod = methods[0].k;

  const el=$("div",{class:"col gap3"});
  el.append($("div",{class:"t-cap",text:t("w_choice")}));
  const list=Card("");
  methods.forEach((m)=>{
    list.append(Row({icon:m.icon, title:m.title, sub:m.sub,
      selected:S.payMethod===m.k, chev:false,
      on:()=>{ S.payMethod=m.k; render(); }}));
  });
  el.append(list);
  if(!sufficient && cfg.paymobEnabled){
    el.append($("button",{class:"link", attrs:{type:"button"}, text:t("w_topupShort")+" →",
      on:()=>openSheet("topup")}));
  }
  return el;
}
