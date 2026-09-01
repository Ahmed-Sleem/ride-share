/* ══════════════════════════════════════════════════════════════════════════
   MOTION — the landing's own scroll machinery, and nothing else.

   Three things live here and nothing else: the reveal observer, the variable-
   weight scrub on the display type, and the journey (a bus that rides the real
   corridor down the page, with stops that light as it passes and a confetti
   burst when it arrives). Every one of them follows the same four rules:

   1. THE SCROLLER IS PASSED IN. The landing is a surface of the app shell, not
      a document: `html`/`body` never scroll (break-tested in tests/breaks.sh),
      so any `window.scrollY` read here would be permanently zero. Reading the
      element that actually scrolls is also what makes these effects testable —
      a unit test can hand in a fake scroller.
   2. TRANSFORM, OPACITY, DASH-OFFSET ONLY. Nothing here may write a property
      that triggers layout inside a scroll callback.
   3. EVERY MOUNT RETURNS A DISPOSE. Re-rendering the landing must not stack
      listeners or rAF loops; the caller keeps the returned function and calls
      it before it replaces the DOM.
   4. REDUCED MOTION MEANS THE FINISHED PAGE. No observer, no rAF, no confetti:
      the reveal states are set to their end value and the bus parks mid-route,
      so the content is complete without any motion at all.

   No copy, no colours, no dimensions: numbers that shape the page are either
   in styles/shell.html as tokens or are arguments from the caller.
   ══════════════════════════════════════════════════════════════════════════ */

const Motion = (function () {
  const reduced = () => typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

  /* ── reveal: [data-rv] flips to [data-rv="in"] once, when it enters ───────
     The CSS holds the transform and the duration; this only decides *when*.
     Without IntersectionObserver (old WebView, jsdom) the items are simply on. */
  function reveal(root, scroller) {
    const items = Array.from((root || document).querySelectorAll("[data-rv]"));
    if (!items.length) return function () {};
    if (reduced() || typeof IntersectionObserver !== "function") {
      items.forEach(n => { n.dataset.rv = "in"; });
      return function () {};
    }
    const pending = new Set(items);
    function mark(el) {
      el.dataset.rv = "in";
      pending.delete(el);
      io.unobserve(el);
      if (!pending.size) stop();     /* nothing left to find: no work per frame */
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting && !behind(e.target, e.rootBounds)) return;
        mark(e.target);
      });
    }, { root: scroller || null, rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach(n => io.observe(n));
    /* "Already scrolled past" counts as seen. IntersectionObserver reports a
       change of ratio, not a position: a flick, a scrollbar drag or an in-page
       anchor can move a block from below the fold to above it between two
       samples, and then the observer never fires for it at all — no entry, no
       callback, and CSS still holding the block at zero opacity on a page the
       reader has already read. A sweep on scroll is the part the observer
       cannot do, so it runs while anything is pending and unsubscribes itself
       when nothing is. */
    function behind(el, box) {
      const r = el.getBoundingClientRect();
      const top = box ? box.top : (scroller ? scroller.getBoundingClientRect().top : 0);
      return r.bottom <= top;
    }
    let raf = 0;
    function sweep() {
      raf = 0;
      const box = scroller ? scroller.getBoundingClientRect() : null;
      pending.forEach(el => { if (behind(el, box)) mark(el); });
    }
    function onscroll() { if (!raf) raf = requestAnimationFrame(sweep); }
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      (scroller || window).removeEventListener("scroll", onscroll);
    }
    (scroller || window).addEventListener("scroll", onscroll, { passive: true });
    sweep();
    return stop;
  }

  /* ── the variable-axis scrub ─────────────────────────────────────────────
     The masthead's three display lines thicken as the first screen scrolls
     away (each line lagging the one above it), and every journey word gains
     weight as it crosses the middle of the viewport. The weight floor is not
     thin-on-purpose: the brief is BOLD type, so the first impression is
     already substantial and the scrub adds on top of it. Those two numbers are
     the same ones the CSS writes for its non-JS state — if they disagree the
     headline flashes for a frame before the first scrub. */
  const SCRUB_FROM = 420, SCRUB_SPAN = 480;      /* masthead: 420 → 900 */
  const WORD_FROM = 430, WORD_SPAN = 470;        /* journey words: 430 → 900 */

  function mountScrub(scroller, root) {
    const vf = Array.from(root.querySelectorAll("[data-vf]"));
    const words = Array.from(root.querySelectorAll("[data-word]"));
    if (!vf.length && !words.length) return function () {};
    if (reduced()) {
      vf.forEach(el => { el.style.fontVariationSettings = '"wght" 900'; });
      words.forEach(el => {
        el.style.fontVariationSettings = '"wght" ' + (WORD_FROM + WORD_SPAN);
        el.style.setProperty("--near", "1");
      });
      return function () {};
    }
    const vh = () => (scroller && scroller.clientHeight) || 1;
    function scrub() {
      const top = (scroller && scroller.scrollTop) || 0;
      const p = clamp01(top / (vh() * 0.9));
      vf.forEach((el, i) => {
        const lag = clamp01((p - i * 0.07) / (1 - i * 0.07));
        el.style.fontVariationSettings =
          '"wght" ' + Math.round(SCRUB_FROM + lag * SCRUB_SPAN);
      });
      words.forEach(el => {
        const r = el.getBoundingClientRect();
        const box = scroller.getBoundingClientRect();
        const mid = (r.top + r.height / 2 - box.top) / vh();
        const near = clamp01(1 - Math.abs(mid - 0.5) * 2.4);
        el.style.fontVariationSettings =
          '"wght" ' + Math.round(WORD_FROM + near * WORD_SPAN);
        el.style.setProperty("--near", near.toFixed(3));
      });
    }
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; scrub(); });
    };
    const onResize = () => onScroll();
    if (scroller) scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scrub);
    scrub();
    return function dispose() {
      if (scroller) scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }

  /* ── the journey: one route, ridden down the page ────────────────────────
     Every value-prop cut is a stop on one continuous route. The road is the
     real corridor (data/journey.js), fitted to the section and smoothed with a
     uniform Catmull-Rom → cubic bézier conversion so the bus can read its own
     tangent from the same path it is drawn along. Scroll sets a target; a rAF
     loop eases toward it with a time constant, so the glide is the same speed
     on a 60 Hz phone and a 144 Hz monitor. */
  function journey(opts) {
    const section = opts.section, scroller = opts.scroller, geo = opts.geography;
    const cuts = Array.from(section.querySelectorAll("[data-journey-cut]"));
    const svg = section.querySelector("[data-journey-map]");
    if (!svg || !geo || typeof svg.querySelector !== "function") return function () {};
    /* getTotalLength/getPointAtLength are SVG geometry APIs. Where they are
       missing (jsdom, an old shell) the page still reads perfectly: the cuts
       are plain copy and the map is decoration. */
    const probe = document.createElementNS(SVG_NS, "path");
    if (typeof probe.getTotalLength !== "function") return function () {};

    const state = { W: 0, H: 0, L: 0, prog: 0, tgt: 0, raf: null, last: 0,
                    road: null, done: null, bus: null, spot: null, shade: null,
                    stopsGroup: null, destEl: null, confettiEl: null,
                    dest: { x: 0, y: 0 }, nodes: [], particles: [], arrived: false,
                    ro: null, rt: null };

    const polyPath = (arrs, S, ox, oy, close) => {
      let d = "";
      for (const flat of arrs) {
        for (let i = 0; i < flat.length; i += 2) {
          const x = ox + flat[i] * S, y = oy + flat[i + 1] * S;
          d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
        }
        if (close) d += "Z ";
      }
      return d;
    };
    const ptsPage = (flat, S, ox, oy) => {
      const out = [];
      for (let i = 0; i < flat.length; i += 2) out.push([ox + flat[i] * S, oy + flat[i + 1] * S]);
      return out;
    };
    function smoothD(pts) {
      let d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += " C " + c1x.toFixed(2) + " " + c1y.toFixed(2) + ", " +
                  c2x.toFixed(2) + " " + c2y.toFixed(2) + ", " +
                  p2[0].toFixed(2) + " " + p2[1].toFixed(2);
      }
      return d;
    }

    const BUS_MARKUP =
      '<g class="journey__bus">' +
      '<rect class="journey__bus-body" x="-22" y="-14" width="44" height="26" rx="7"/>' +
      '<rect class="journey__bus-glass" x="-16" y="-9" width="11" height="6.5" rx="1.5"/>' +
      '<rect class="journey__bus-glass" x="-2.5" y="-9" width="14" height="6.5" rx="1.5"/>' +
      '<rect class="journey__bus-glass" x="-18" y="1.5" width="36" height="1.2" rx="0.6"/>' +
      '<circle class="journey__bus-body" cx="-12.5" cy="12.5" r="4.5"/>' +
      '<circle class="journey__bus-body" cx="12.5" cy="12.5" r="4.5"/>' +
      '<circle class="journey__bus-glass" cx="-12.5" cy="12.5" r="1.6"/>' +
      '<circle class="journey__bus-glass" cx="12.5" cy="12.5" r="1.6"/>' +
      "</g>";

    function paint(p) {
      if (!state.road || !state.bus) return;
      const q = clamp01(p);
      const len = state.L * q;
      const pt = state.road.getPointAtLength(len);
      const nx = state.road.getPointAtLength(Math.min(state.L, len + 1));
      const a = (Math.atan2(nx.y - pt.y, nx.x - pt.x) * 180) / Math.PI;
      state.bus.setAttribute("transform",
        "translate(" + pt.x.toFixed(2) + " " + pt.y.toFixed(2) + ") rotate(" + a.toFixed(2) + ")");
      if (state.spot) {
        state.spot.setAttribute("cx", pt.x.toFixed(1));
        state.spot.setAttribute("cy", pt.y.toFixed(1));
      }
      state.done.style.strokeDashoffset = (state.L * (1 - q)).toFixed(2);
      if (state.stopsGroup) {
        /* Each stop is a halo + dot pair; the dot lights once the bus is past it. */
        const dots = Array.from(state.stopsGroup.children).filter((c, i) => i % 2 === 1);
        dots.forEach((c, i) => {
          c.classList.toggle("is-passed", q > (i + 0.5) / state.nodes.length);
        });
      }
      /* Arrival: light the finish, throw confetti, and re-arm if the reader
         scrolls back up — the celebration belongs to whoever gets here. */
      const ARRIVE = opts.arriveAt || 0.985;
      if (state.destEl) state.destEl.classList.toggle("is-arrived", q >= ARRIVE);
      if (q >= ARRIVE && !state.arrived) {
        state.arrived = true;
        if (!reduced()) spawnConfetti(state.dest.x, state.dest.y);
      } else if (q < ARRIVE - 0.06) {
        state.arrived = false;
      }
    }

    function layout() {
      state.W = section.clientWidth;
      state.H = section.offsetHeight;
      state.particles.forEach(q => q.el.remove());
      state.particles = [];
      const rect = section.getBoundingClientRect();
      const cutY = cuts.map(el => {
        const r = el.getBoundingClientRect();
        return r.top - rect.top + r.height / 2;
      });

      /* Fit the real route: fill the height, centred horizontally. The margins
         are proportions, so the fit is the same on a 320px phone and a 2560px
         display — the reason the geometry has no screen size baked into it. */
      let rx0 = 1e9, rx1 = -1e9, ry0 = 1e9, ry1 = -1e9;
      const route = geo.route;
      for (let i = 0; i < route.length; i += 2) {
        const x = route[i], y = route[i + 1];
        if (x < rx0) rx0 = x; if (x > rx1) rx1 = x;
        if (y < ry0) ry0 = y; if (y > ry1) ry1 = y;
      }
      const topM = state.H * 0.06, botM = state.H * 0.10;
      const S = (state.H - topM - botM) / (ry1 - ry0);
      const ox = state.W / 2 - ((rx0 + rx1) / 2) * S;
      const oy = topM - ry0 * S;
      const spotR = Math.max(150, Math.min(340, state.W * 0.19));

      const seaD = polyPath([geo.sea], S, ox, oy, true);
      const coastD = polyPath(geo.coast, S, ox, oy, false);
      const canalD = polyPath(geo.canal, S, ox, oy, false);
      const roadD = [0, 1, 2, 3].map(k => polyPath(geo.roads[k] || [], S, ox, oy, false));
      const routeD = smoothD(ptsPage(route, S, ox, oy));
      const marksSVG = (geo.marks || []).map(m => {
        const x = ox + m.x * S, y = oy + m.y * S;
        return '<circle class="journey__mark" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3"/>' +
               '<text class="journey__mark-label" x="' + (x + 9).toFixed(1) +
               '" y="' + (y - 8).toFixed(1) + '">' + m.label + "</text>";
      }).join("");

      svg.setAttribute("viewBox", "0 0 " + state.W + " " + state.H);
      svg.innerHTML =
        "<defs>" +
        '<radialGradient id="journeySpot" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="' + spotR.toFixed(0) + '">' +
        '<stop offset="0" stop-color="var(--paper)" stop-opacity="0"/>' +
        '<stop offset="0.42" stop-color="var(--paper)" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="var(--paper)" stop-opacity="0.72"/>' +
        "</radialGradient>" +
        "</defs>" +
        '<path class="journey__sea" d="' + seaD + '"/>' +
        '<path class="journey__coast" d="' + coastD + '"/>' +
        '<path class="journey__canal" d="' + canalD + '"/>' +
        roadD.map((d, i) => '<path class="journey__road-' + i + '" d="' + d + '"/>').join("") +
        marksSVG +
        '<rect class="journey__shade" x="0" y="0" width="' + state.W + '" height="' + state.H +
          '" fill="url(#journeySpot)"/>' +
        '<path class="journey__casing" d="' + routeD + '"/>' +
        '<path class="journey__line" d="' + routeD + '"/>' +
        '<path class="journey__done" d="' + routeD + '"/>' +
        BUS_MARKUP;
      state.road = svg.querySelector(".journey__line");
      state.done = svg.querySelector(".journey__done");
      state.bus = svg.querySelector(".journey__bus");
      state.spot = svg.querySelector("#journeySpot");
      state.L = state.road.getTotalLength();
      state.done.style.strokeDasharray = state.L;
      state.done.style.strokeDashoffset = state.L;

      /* Stops: each cut's vertical centre, projected onto the real route — the
         stop belongs to the road, not to a grid row, so the composition holds
         at any width. Sampled once per layout, then nearest-neighbour. */
      const SAMPLES = 500;
      const samples = [];
      for (let k = 0; k <= SAMPLES; k++) samples.push(state.road.getPointAtLength((state.L * k) / SAMPLES));
      state.nodes = cutY.map(cy => {
        let best = samples[0], bd = 1e9;
        for (const s of samples) {
          const dd = Math.abs(s.y - cy);
          if (dd < bd) { bd = dd; best = s; }
        }
        return { x: best.x, y: best.y };
      });
      const stopsGroup = document.createElementNS(SVG_NS, "g");
      stopsGroup.setAttribute("class", "journey__stops");
      stopsGroup.innerHTML = state.nodes.map(n =>
        '<circle class="journey__stop-halo" cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="9"/>' +
        '<circle class="journey__stop" cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="5"/>').join("");
      svg.insertBefore(stopsGroup, state.bus);
      state.stopsGroup = stopsGroup;

      /* The finish: the last point of the real route, with a station flag. */
      const ep = state.road.getPointAtLength(state.L);
      state.dest = { x: ep.x, y: ep.y };
      const destEl = document.createElementNS(SVG_NS, "g");
      destEl.setAttribute("class", "journey__dest");
      destEl.setAttribute("transform", "translate(" + ep.x.toFixed(1) + " " + ep.y.toFixed(1) + ")");
      destEl.innerHTML =
        '<circle class="journey__dest-pulse" r="15"/>' +
        '<circle class="journey__dest-halo" r="26"/>' +
        '<circle class="journey__dest-ring" r="15"/>' +
        '<circle class="journey__dest-dot" r="7"/>' +
        '<g class="journey__dest-flag" transform="translate(0 -40)">' +
        '<path d="M0 0 V -16"/><path d="M0 -16 L 18 -11 L 0 -6 Z"/></g>';
      svg.insertBefore(destEl, state.bus);
      state.destEl = destEl;

      state.confettiEl = document.createElementNS(SVG_NS, "g");
      state.confettiEl.setAttribute("class", "journey__confetti");
      svg.appendChild(state.confettiEl);
      paint(state.prog);
    }

    function burst(x, y, count, power) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (130 + Math.random() * 340) * power;
        const size = 4 + Math.random() * 5;
        const shape = i % 3;
        const el = document.createElementNS(SVG_NS, shape === 0 ? "circle" : shape === 1 ? "rect" : "path");
        el.setAttribute("class", "journey__confetti-" + (i % 5));
        if (shape === 0) {
          el.setAttribute("r", size.toFixed(1));
        } else if (shape === 1) {
          el.setAttribute("x", (-size / 2).toFixed(1));
          el.setAttribute("y", (-size / 2).toFixed(1));
          el.setAttribute("width", size.toFixed(1));
          el.setAttribute("height", size.toFixed(1));
          el.setAttribute("rx", "1");
        } else {
          const s = (size * 1.15).toFixed(1);
          el.setAttribute("d", "M0," + (-s) + " L" + s + "," + s + " L" + (-s) + "," + s + " Z");
        }
        state.confettiEl.appendChild(el);
        state.particles.push({ el: el, x: x, y: y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 190,
          rot: Math.random() * 360, vr: (Math.random() - 0.5) * 720,
          life: 0, maxLife: 1.5 + Math.random() * 1.1, g: 430 });
      }
    }
    /* Three staggered bursts read as one generous celebration. */
    function spawnConfetti(x, y) {
      burst(x, y, 44, 1);
      setTimeout(() => burst(x, y, 20, 0.72), 230);
      setTimeout(() => burst(x, y, 14, 0.5), 500);
    }

    function readScroll() {
      const r = section.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      const vh = scroller.clientHeight || 1;
      state.tgt = clamp01((box.top + vh * 0.5 - r.top) / r.height);
    }

    function tick(now) {
      state.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - state.last) / 1000);
      state.last = now;
      const k = 1 - Math.exp(-dt * 6.5);            /* time-based ease */
      state.prog += (state.tgt - state.prog) * k;
      paint(state.prog);
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) { p.el.remove(); state.particles.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const o = Math.max(0, 1 - p.life / p.maxLife);
        p.el.setAttribute("transform",
          "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ") rotate(" + p.rot.toFixed(1) + ")");
        p.el.setAttribute("opacity", o.toFixed(2));
      }
    }

    const onScroll = () => readScroll();
    const onResize = () => { clearTimeout(state.rt); state.rt = setTimeout(() => { layout(); readScroll(); }, 120); };

    layout();
    if (reduced()) { paint(0.5); readScroll(); return function dispose() {}; }
    if (scroller) scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); readScroll(); });
    if (typeof ResizeObserver === "function") {
      state.ro = new ResizeObserver(() => { layout(); readScroll(); });
      state.ro.observe(section);
    }
    readScroll();
    state.last = performance.now();
    state.raf = requestAnimationFrame(tick);

    return function dispose() {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = null;
      if (scroller) scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(state.rt);
      if (state.ro) { state.ro.disconnect(); state.ro = null; }
      state.particles.forEach(q => q.el.remove());
      state.particles = [];
    };
  }

  return { reduced, clamp01, reveal, mountScrub, journey,
           SCRUB_FROM, SCRUB_SPAN, WORD_FROM, WORD_SPAN };
})();
