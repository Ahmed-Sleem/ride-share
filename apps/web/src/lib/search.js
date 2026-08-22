/* ══════════════════════════════════════════════════════════════════════
   Search — the ONE place text search happens (§0.3). Fuse.js (Apache-2.0,
   vendored into the build by build.js) does the fuzzy ranking; this module
   owns the index and the Arabic/English NORMALIZATION so both languages
   match consistently: diacritics stripped, alef/hamza/teh-marbuta/ya
   unified, Latin lowercased. A rider typing "smouha" or "سموحه" hits the
   same stop. Riders search ROUTES (with their boarding stops) and see the
   BOOKABLE JOURNEYS nested under each route — a route with no claimed
   departure is still listed, honestly, with an empty "no departures" state.
   ══════════════════════════════════════════════════════════════════════ */

/* Arabic harakat + superscript alef + tatweel — the marks that break a
   naive substring match. */
const AR_DIACRITICS = /[\u064B-\u0652\u0670\u0640]/g;

const normalizeText = (s) => String(s == null ? "" : s)
  .toLowerCase()
  .replace(AR_DIACRITICS, "")
  .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")   // alef variants → ا
  .replace(/\u0624/g, "\u0648")                      // waw + hamza → و
  .replace(/\u0626/g, "\u064A")                      // ya + hamza → ي
  .replace(/\u0649/g, "\u064A")                      // alef maqsura → ي
  .replace(/\u0629/g, "\u0647")                      // teh marbuta → ه
  .replace(/\s+/g, " ")
  .trim();

/* One searchable route entry. `stops` are the route's boarding stops
   (route_stops joined with stop names, from GET /routes/published). */
function routeSearchEntry(route, stops) {
  const names = [
    route.name_en || "", route.name_ar || "", route.code || "",
    ...(stops || []).map((s) =>
      (s.stop_name_en || "") + " " + (s.stop_name_ar || "") + " " + (s.stop_code || "")),
  ].join(" ");
  return {
    id: route.id,
    route,
    stops: stops || [],
    nName: normalizeText((route.name_en || "") + " " + (route.name_ar || "")),
    nCode: normalizeText(route.code || ""),
    nText: normalizeText(names),
  };
}

function buildRiderIndex(routesWithStops) {
  return (routesWithStops || []).map((rw) => routeSearchEntry(rw.route, rw.stops));
}

/* Ranked route ids for a query. Empty query → every route, in order.
   Exact/substring hits on the route name or code rank FIRST; Fuse ranks the
   rest on the full normalized text (name + boarding stops). */
function searchRoutes(query, index) {
  const q = normalizeText(query);
  if (!q) return (index || []).map((e) => e.id);
  const nameHit = (index || []).filter((e) => e.nName.includes(q) || e.nCode.includes(q));
  const seen = new Set(nameHit.map((e) => e.id));
  let fuzzy = [];
  try {
    const fuse = new Fuse(index, {
      keys: [{ name: "nText", weight: 1 }],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    fuzzy = fuse.search(q).map((r) => r.item);
  } catch (e) { /* Fuse unavailable → substring fallback below still applies */ }
  const rest = fuzzy.filter((e) => !seen.has(e.id));
  return nameHit.concat(rest).map((e) => e.id);
}

/* A plain field filter (used by the ops stops list): true when the query is
   empty or every query token appears in the normalized text. */
function matchesQuery(query, text) {
  const q = normalizeText(query);
  if (!q) return true;
  const t = normalizeText(text);
  if (t.includes(q)) return true;
  return q.split(" ").filter(Boolean).every((tok) => t.includes(tok));
}
