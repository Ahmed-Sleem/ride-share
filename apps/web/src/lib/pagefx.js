/* ── the page transition ──────────────────────────────────────────────────────
   One curtain, in one place. The shape is the codrops "SVG path page transition
   (vertical)": a full-bleed path anchored to the bottom of the window swells into a
   hill, fills the screen, then unhooks from the top and falls away.

   Three numbers describe the shore line at any moment — where it touches the left
   edge, where its quadratic control point sits, where it touches the right edge — in a
   0..100 box stretched over the viewport, so one set of numbers works at 320 px and at
   3440 px. They are interpolated on a rAF loop rather than animated by a library:
   nothing new enters the bundle, and there is no CSS `d` support question to answer.
   The pacing is read from stylesheet tokens, so the sheet still owns the motion;
   reduced motion gets a plain swap, as everywhere else on this surface.

   The state change is never held hostage by the animation. `render()` hands the swap to
   this module when — and only when — a gesture the reader actually made asked for a new
   page: the curtain closes, the new page is painted behind it, the curtain opens. A
   page reached any other way (a deep link, a session restore, a test) paints at once,
   and the swap keeps a deadline of its own so that a backgrounded tab, where rAF stops
   arriving, still gets its page. */
const PageFx = (() => {
  const SHAPE = [[100, 100, 100], [50, 0, 50], [0, 0, 0]];   /* nothing → hill → all */
  const DOWN = (a, b, c) => `M 0 100 V ${a} Q 50 ${b} 100 ${c} V 100 z`;
  const UP = (a, b, c) => `M 0 0 V ${a} Q 50 ${b} 100 ${c} V 0 z`;
  const powIn = (n) => (t) => Math.pow(t, n);
  const powOut = (n) => (t) => 1 - Math.pow(1 - t, n);
  const sineIn = (t) => 1 - Math.cos(t * Math.PI / 2);
  /* The reference's curve set — power4 in, power1, sine in, power4 out — with the
     cover shortened, because a curtain that closes slowly is a page that loads badly. */
  const PHASES = [
    { token: "--fx-rise", ms: 220, ease: powIn(4), path: DOWN, from: 0, to: 1 },
    { token: "--fx-fill", ms: 90, ease: powIn(2), path: DOWN, from: 1, to: 2 },
    { token: "--fx-release", ms: 110, ease: sineIn, path: UP, from: 0, to: 1 },
    { token: "--fx-fall", ms: 520, ease: powOut(4), path: UP, from: 1, to: 2 },
  ];
  const GESTURE_WINDOW = 500;
  const FALLBACK_SWAP_MS = 600;      /* the swap's deadline, whatever rAF decides to do */

  let lastGesture = -1e9, busy = false, listened = false, lastKey = null;

  function now() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }
  /* A press or a key, deliberately not a `click`: jsdom marks the click it synthesises
     for `element.click()` as trusted, and a suite that drives the app that way must not
     be held behind a curtain. A real pointer always presses before it clicks, and a
     keyboard activation always keys before it clicks, so nothing a person does is lost. */
  function watchGestures() {
    if (listened || typeof document === "undefined" || !document.addEventListener) return;
    listened = true;
    const seen = (e) => { if (e && e.isTrusted) lastGesture = now(); };
    document.addEventListener("pointerdown", seen, { capture: true, passive: true });
    document.addEventListener("keydown", seen, { capture: true, passive: true });
  }
  /* Installed when the bundle runs, not when the first navigation asks: a watcher put
     in place by the click it was meant to catch would miss exactly that click. */
  watchGestures();

  function reduced() {
    return typeof Motion !== "undefined" && Motion.reduced && Motion.reduced();
  }
  function dur(el, phase) {
    const ms = parseFloat(getComputedStyle(el).getPropertyValue(phase.token));
    return Number.isFinite(ms) && ms >= 0 ? ms : phase.ms;      /* the token, or the default */
  }
  function layer() {
    if (typeof document === "undefined" || !document.body) return null;
    let svg = document.querySelector(".pagefx");
    if (svg) return svg;
    const ns = "http://www.w3.org/2000/svg";
    svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "pagefx");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("class", "pagefx__path");
    /* Painted shut before it is ever asked to move, so a first frame cannot flash a
       half-drawn hill. */
    path.setAttribute("d", PHASES[0].path(...SHAPE[PHASES[0].from].map((v) => v.toFixed(2))));
    svg.append(path);
    document.body.append(svg);
    return svg;
  }
  /* One frame of one phase: interpolate the three numbers, write the path, report
     whether the phase is over. */
  function frame(svg, t0, at, phase) {
    const path = svg.querySelector(".pagefx__path");
    const ms = dur(svg, phase);
    const t = Math.min(1, Math.max(0, (at - t0) / (ms || 1)));
    const p = phase.ease(t);
    const a = SHAPE[phase.from], b = SHAPE[phase.to];
    path.setAttribute("d", phase.path(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p,
                                     a[2] + (b[2] - a[2]) * p));
    return t >= 1;
  }

  /* The route, as the reader would name it: the page they are on, not the field they
     typed in. Two renders with the same key are one view, so the curtain never goes up
     under a keystroke, a countdown tick or a sheet. */
  function routeKey(S) {
    return [S.view, S.page, S.landingPage, S.landingDoc || "", S.authMode || "", S.role || ""].join("|");
  }

  /* Take the paint if a curtain is owed one. Returns true when this module now owns the
     swap: the caller must not paint, because the page is about to be hidden anyway. */
  function armed(key, swap) {
    if (key === lastKey) return false;            /* same page: no curtain */
    const known = lastKey !== null;
    lastKey = key;
    if (!known) return false;                     /* the first paint of a session */
    if (reduced() || busy || (typeof document !== "undefined" && document.hidden)) return false;
    if (now() - lastGesture > GESTURE_WINDOW) return false;      /* not a gesture: no curtain */
    const svg = layer();
    if (!svg || typeof requestAnimationFrame !== "function") return false;
    /* A curtain is only worth drawing where there is a page to hide: a document with no
       layout (a headless DOM test, a detached frame) has nothing to animate, and it must
       never be left waiting on a paint that this module promised to deliver later. */
    if (!svg.getClientRects || !svg.getClientRects().length) { svg.remove(); return false; }
    busy = true;
    let i = 0, t0 = now(), swapped = false;
    const doSwap = () => { if (swapped) return; swapped = true; swap(); };
    const step = () => {
      const at = now();
      if (frame(svg, t0, at, PHASES[i])) {
        i += 1; t0 = at;
        if (i === 2) doSwap();                    /* painted while the screen is shut */
        if (i >= PHASES.length) { busy = false; svg.remove(); return; }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    /* A rAF never arrives in a backgrounded tab, and a curtain must never be the reason
       a page does not appear. */
    setTimeout(doSwap, FALLBACK_SWAP_MS);
    return true;
  }

  /* Between the splash and the first page: the same curtain, held shut while the app
     paints. Nobody presses a button to leave a splash, so this one steps over the
     gesture rule — the brief asks for it by name. */
  function handoff(swap) {
    if (busy || reduced() || typeof requestAnimationFrame !== "function") { swap(); return; }
    const svg = layer();
    if (!svg) { swap(); return; }
    busy = true;
    const cover = [PHASES[0], PHASES[1]];
    let i = 0, t0 = now(), swapped = false;
    const step = () => {
      const at = now();
      if (i < cover.length) {
        if (frame(svg, t0, at, cover[i])) {
          i += 1; t0 = at;
          if (i === cover.length && !swapped) { swapped = true; swap(); }
        }
        requestAnimationFrame(step); return;
      }
      if (i < PHASES.length) {
        if (frame(svg, t0, at, PHASES[i])) { i += 1; t0 = at; }
        requestAnimationFrame(step); return;
      }
      busy = false; svg.remove();
    };
    requestAnimationFrame(step);
    setTimeout(() => { if (!swapped) { swapped = true; swap(); } }, FALLBACK_SWAP_MS);
  }

  return { handoff, armed, routeKey };
})();
