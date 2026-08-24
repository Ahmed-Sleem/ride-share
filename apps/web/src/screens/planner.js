/* ══════════════════════════════════════════════════════════════════════
   Planner search screen (DEC-206, Path A — the owner's Uber-style ask).
   "The search must be snappy like Google Maps: type the first letters and
   see a list of all close things; the map pins directly."

   UX (research 06_MAPS_UX.md + Uber/Google-Maps patterns):
   - Map on top, panel below (list-first model, map as live context).
   - Two fields: Start (defaults to my-location's closest stop) + "Where to?".
   - TYPEAHEAD: instant local search (searchPlannerStops, AR/EN normalized,
     no network) from the first character; list updates IN PLACE (never a
     full re-render per keystroke — the seamless-tabs lesson).
   - Keyboard: ↑/↓ move, Enter picks, Esc closes — ARIA combobox semantics
     (role, aria-expanded, aria-activedescendant) so screen readers work.
   - The MAP reacts live: matches light up + camera fits them; a chosen
     start/destination pins; tapping the map picks the NEAREST STOP for the
     focused field (our model boards at stops — the pin snaps honestly).
   - Both set → the SAME recommendation engine B built (planJourneys) feeds
     the SAME result cards; no duplicated logic (§0.3).
   Honest fallbacks: no map SDK → illustration + the list; no geolocation →
   pick manually. Nothing invented, nothing dead.                        */

function plannerSearchScreen(){                          // DEC-206 (Path A)
  const w=$("div",{class:"main"});
  w.append($("div",{class:"stack gap1"},
    $("h1",{class:"t-head",text:t("j_planTitle")}),
    $("div",{class:"t-cap",text:t("p_hint")})));

  if(!S.riderIndex && !S.planIndexError){ ensureRiderIndex().then(()=>render()).catch(()=>{}); }
  const stops = collectPlannerStops(S.riderIndex || []);

  /* ── the map: matches light up, pins hold, tap picks the nearest stop ── */
  const q = S.planFocus === "from" ? S.planFromQ : S.planToQ;
  const matches = S.planFocus ? searchPlannerStops(q || "", stops).slice(0, 24) : [];
  w.append(SearchMap({                                   /* RouteMap family (Path A) */
    h: 300,
    stops,
    matches,
    pins: [S.planFrom, S.planTo].filter(Boolean),
    onPick: (lat, lng) => {
      const near = nearestStop(lat, lng, stops);
      if (!near) return;
      plannerSetField(S.planFocus || "to", near);
      toast(t("p_pinnedNearest") + ": " + stopLabel(near));
      render();
    },
  }));

  /* ── the panel: two fields + typeahead list ── */
  const panel = Card("");
  panel.append(plannerField("from", t("j_from"), S.planFrom, S.planFromQ));
  panel.append(plannerField("to", t("p_whereTo"), S.planTo, S.planToQ));
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    panel.append($("button", { class: "link", attrs: { type: "button" }, text: t("p_useMyLocation"),
      on: () => plannerUseMyLocation(stops) }));
  }
  w.append(panel);

  const list = $("div", { id: "plan-typeahead" });
  w.append(list);
  plannerRenderList(list, stops);

  /* ── results: the SAME engine + cards B built (no second copy) ── */
  const results = $("div", { class: "stack gap3", id: "plan-results" });
  w.append(results);
  plannerRenderResults(results);
  return w;
}

/* One input row. id/aria per the combobox pattern; typing updates ONLY the
   list + the map matches (in-place), selection triggers a full render. */
function plannerField(which, label, chosen, query) {
  const id = "plan-" + which;
  return $("div", { class: "field" },
    $("label", { attrs: { for: id }, text: label }),
    $("input", {
      class: "input", attrs: {
        id, type: "search", autocomplete: "off",
        role: "combobox", "aria-expanded": S.planFocus === which ? "true" : "false",
        "aria-controls": "plan-typeahead", "aria-autocomplete": "list",
        "aria-label": label,
        value: query || (chosen ? stopLabel(chosen) : ""),
        placeholder: which === "to" ? t("p_whereTo") : t("j_pickStop"),
      },
      on: {
        focus: () => { S.planFocus = which; S.planActive = 0; render(); },
        input: (e) => {
          S.planFocus = which; S.planActive = 0;
          if (which === "from") { S.planFromQ = e.target.value; S.planFrom = null; }
          else { S.planToQ = e.target.value; S.planTo = null; }
          const list = document.getElementById("plan-typeahead");
          if (list) plannerRenderList(list, collectPlannerStops(S.riderIndex || []));
        },
        keydown: (e) => plannerKeydown(e, which),
        blur: () => { setTimeout(() => { if (!S.planFocus) render(); }, 120); },
      },
    }));
}

/* The typeahead list — aria listbox; rows are options with ids. */
function plannerRenderList(el, stops) {
  if (!el) return;
  el.innerHTML = "";
  if (!S.planFocus) return;
  const q = S.planFocus === "from" ? S.planFromQ : S.planToQ;
  const hits = searchPlannerStops(q || "", stops || []).slice(0, 12);
  el.setAttribute("role", "listbox");
  el.setAttribute("aria-label", t("p_matches"));
  if (!hits.length) {
    el.append(Empty("stops", t("noSearchResults"), t("p_typeMore")));
    return;
  }
  hits.forEach((s, i) => {
    el.append($("div", {
      class: "ta-row" + (i === (S.planActive || 0) ? " ta-row--active" : ""),
      attrs: { role: "option", id: "plan-opt-" + i, "aria-selected": String(i === (S.planActive || 0)) },
      on: { mousedown: (e) => { e.preventDefault(); plannerPick(which(S.planFocus), s); } },
    },
      icon("stops"),
      $("div", { class: "stack" },
        $("strong", { text: stopLabel(s) }),
        $("span", { class: "t-micro", text: s.stop_code || "·" })),
      $("span", { class: "t-micro", text: plannerStopRoutesCount(s) + " " + t("p_routesCount") })));
  });
}
function which(f) { return f === "from" ? "from" : "to"; }

function plannerStopRoutesCount(s) {
  const n = (S.riderIndex || []).filter((e) => (e.stops || []).some((x) => x.stop_id === s.stop_id)).length;
  return String(n);
}

/* Keyboard: ↑/↓ move the active option, Enter picks it, Esc closes. */
function plannerKeydown(e, fld) {
  const stops = collectPlannerStops(S.riderIndex || []);
  const hits = () => searchPlannerStops((fld === "from" ? S.planFromQ : S.planToQ) || "", stops).slice(0, 12);
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const h = hits(); if (!h.length) return;
    S.planActive = Math.max(0, Math.min(h.length - 1, (S.planActive || 0) + (e.key === "ArrowDown" ? 1 : -1)));
    plannerRenderList(document.getElementById("plan-typeahead"), stops);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const h = hits();
    if (h.length) plannerPick(fld, h[S.planActive || 0]);
  } else if (e.key === "Escape") {
    S.planFocus = null; render();
  }
}

function plannerPick(fld, s) { plannerSetField(fld, s); S.planFocus = null; render(); }
function plannerSetField(fld, s) {
  if (fld === "from") { S.planFrom = s; S.planFromQ = stopLabel(s); }
  else { S.planTo = s; S.planToQ = stopLabel(s); }
}

/* Geolocation → the closest indexed stop (honest: our boarding is at stops). */
function plannerUseMyLocation(stops) {
  if (!navigator.geolocation || !stops.length) { toast(t("locateDenied")); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const near = nearestStop(pos.coords.latitude, pos.coords.longitude, stops);
      if (near) { plannerSetField("from", near); toast(t("p_pinnedNearest") + ": " + stopLabel(near)); render(); }
    },
    () => toast(t("locateDenied")),
    { timeout: 8000 });
}

/** Pure: the stop nearest to (lat,lng) — tested; exported for reuse. */
function nearestStop(lat, lng, stops) {
  let best = null, bestD = Infinity;
  for (const s of stops || []) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    const d = distanceMeters(lat, lng, s.lat, s.lng);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

/* Results — B's engine + cards, unchanged (§0.3 one implementation). */
function plannerRenderResults(el) {
  if (!el) return;
  el.innerHTML = "";
  if (!S.planFrom || !S.planTo) { el.append(Empty("routes", t("j_planTitle"), t("j_planNeedBoth"))); return; }
  if (S.planFrom.stop_id === S.planTo.stop_id) { el.append(Empty("stops", t("j_planTitle"), t("j_planSame"))); return; }
  const plans = planJourneys(S.planFrom, S.planTo, S.riderIndex || []);
  if (!plans.length) { el.append(Empty("routes", t("j_planTitle"), t("j_noPlan"))); return; }
  plans.forEach((p, i) => el.append(planResultCard(p, i === 0)));
  /* The recommended plan's route, annotated on the map (RouteMap). */
  const first = plans[0];
  const stops = (first && first.routeStops) || (first && first.kind === "single"
    && ((S.riderIndex || []).find((e) => e.id === (first.route && first.route.id)) || {}).stops) || [];
  if (stops && stops.length >= 2) {
    el.append(RouteMap({ stops, highlightStopId: S.planFrom && S.planFrom.stop_id, h: 200, title: t("p_recommendedRoute") }));
  }
}
