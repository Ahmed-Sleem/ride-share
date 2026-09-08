/* D-8.11 / chunk E — what a boot is, written down as ONE function.
   (the other half of the same rule as §0.3 everywhere else in this repo: the browser harness and
   the node test must not each carry their own idea of "did it work", because two definitions means
   one of them can be wrong and still pass.)

   The screen the harness is guarding is the one a tester meets first inside the APK: the boot page
   (`apps/mobile/offline.html`) reads `/v1/mobile/update`, then `/v1/mobile/bundle`, then replaces its
   own document with the app. If any step fails it stops at the offline card. That card is a *correct*
   answer when the network is really down — it is only a bug when the app was reachable and the page
   still stopped there. So the state is decided from four observations, in this order:

     mounted   `#root` exists and has children  → the app replaced the boot page (`mountBundle` does
                                                  `document.open()/write()`, so the boot page's own DOM
                                                  is gone and the app's root is the only one left)
     offline   `#offline` is visible             → the page decided to stop
     busy      its status line is showing text   → it is still working, and a slow answer is not a fail
     errors    uncaught page errors              → a real crash is never reported as "offline"

   `verdictOf` is pure: no DOM, no browser, no clock. That is what lets a unit test drive every state,
   including the ones puppeteer cannot reach on purpose (see `boot-assert.test.js`). */
"use strict";

/* The offline card is `display:none` in the sheet and `.offline{display:flex}` is what shows it, so
   "visible" means: present AND not hidden AND not zero-size. A check on `offsetParent` alone is wrong
   for an element inside a `position:fixed` parent, so the four are read together and any ONE of them
   being absent is not enough to call it shown. */
function isVisible(offline) {
  if (!offline || !offline.present) return false;
  if (offline.display === "none" || offline.visibility === "hidden") return false;
  /* Numbers, not strings: a browser's getComputedStyle yields `0.65`/`120` as numbers, and a test (or a
     future runner for another engine) may hand over "0.65". Coerce here so a runner cannot make a hidden
     card look shown by reporting the wrong type — that is a false green of exactly the kind D-8.11 exists
     to catch. */
  if (Number(offline.opacity) === 0) return false;
  if (Number(offline.width) === 0 || Number(offline.height) === 0) return false;
  return true;
}

/* NOTE on what lives here and what does not: the IDENTITY of the mounted bundle (versionCode / sha256
   against what the service advertises) is checked by the CALLER (`verify-boot.js`), not here. It was
   first attempted here and it made this function's happy path unreachable — once the boot page has been
   replaced by `document.write()` there is no boot-page status line left to read, so any check after
   `mounted` is the driver's job, reading what the app itself put on screen. One definition of "booted"
   per layer, and they do not overlap. */
/**
 * @param obs {mounted:boolean, offline:object, busyText:string, errors:string[]}
 * @returns {{state:"app"|"offline"|"pending"|"error", detail:string, seen:{}}}
 */
function verdictOf(obs) {
  const o = obs || {};
  const errors = Array.isArray(o.errors) ? o.errors.filter(Boolean) : [];
  const shown = isVisible(o.offline);
  const busy = String(o.busyText || "").trim();
  const seen = { mounted: !!o.mounted, offline: shown, busy, errors: errors.length };

  if (errors.length) return { state: "error", detail: errors[0], seen };
  if (o.mounted && !shown) return { state: "app", detail: "the app replaced the boot page", seen };
  if (shown) {
    /* Mounted AND stopped is the loudest bug this harness exists to catch: the bundle arrived, was
       thrown away, and the tester sees "check your connection" while the phone holds a good app. */
    const detail = o.mounted
      ? "the app was mounted and then the offline card was shown — the mount is being discarded"
      : "stopped at the offline card" + (busy ? `: ${busy}` : " with no reason printed");
    return { state: "offline", detail, seen };
  }
  if (busy) return { state: "pending", detail: busy, seen };
  /* Nothing on the screen a tester would call a result: no app, no card, no status line. That is the
     white screen — the worst failure a phone can show, and the one no other test in this repo can see.
     It stays "pending" so the driver keeps polling to its deadline and only then reports it. */
  return { state: "pending", detail: "white screen: neither the app nor the offline card has been shown", seen };
}

/* One place decides what the harness waits for, so the puppeteer runner and a future runner for
   another engine cannot disagree about when a boot is finished. */
function isDone(v) { return v.state === "app" || v.state === "offline" || v.state === "error"; }

module.exports = { verdictOf, isVisible, isDone };
