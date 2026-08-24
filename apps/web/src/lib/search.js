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

/* ── A→B planner (DEC-199) ───────────────────────────────────────────
   Pure ranking over published routes. Mirrors geo-math.ts haversine
   (client cannot import the API module; formula is the same definition).
   Boarding is at a fixed stop; alighting is free along the line (DEC-140),
   so a route serves B when any later stop or segment is near B. Walking
   has no ceiling (DEC-064/134) — distances are ranked and shown honestly.
   2-leg mixes are independent bookings (DEC-135). */

const EARTH_M = 6371000;
const rad = (d) => (Number(d) * Math.PI) / 180;
const TRANSFER_PENALTY_M = 400;

function distanceMeters(lat1, lng1, lat2, lng2) {
  const a1 = Number(lat1), o1 = Number(lng1), a2 = Number(lat2), o2 = Number(lng2);
  if (![a1, o1, a2, o2].every(Number.isFinite)) return Infinity;
  const dLat = rad(a2 - a1), dLng = rad(o2 - o1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a1)) * Math.cos(rad(a2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentMeters(lat, lng, lat1, lng1, lat2, lng2) {
  const toXY = (a, o) => {
    const x = distanceMeters(lat1, lng1, lat1, o) * (o >= lng1 ? 1 : -1);
    const y = distanceMeters(lat1, lng1, a, lng1) * (a >= lat1 ? 1 : -1);
    return [x, y];
  };
  const [px, py] = toXY(lat, lng);
  const [ax, ay] = [0, 0];
  const [bx, by] = toXY(lat2, lng2);
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1) return distanceMeters(lat, lng, lat1, lng1);
  let t = (apx * abx + apy * aby) / ab2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

function orderedStops(stops) {
  return (stops || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0));
}

function walkToStop(point, stop) {
  if (!point || !stop) return Infinity;
  return distanceMeters(point.lat, point.lng, stop.lat, stop.lng);
}

/* Distance from dest to the portion of the line AFTER boarding (exclusive). */
function alightWalkMeters(stops, boardIndex, dest) {
  const rest = stops.slice(boardIndex + 1);
  if (!rest.length) return Infinity;
  let best = Infinity;
  for (let i = 0; i < rest.length; i++) {
    best = Math.min(best, walkToStop(dest, rest[i]));
    const prev = i === 0 ? stops[boardIndex] : rest[i - 1];
    if (prev && rest[i] && Number.isFinite(Number(prev.lat)) && Number.isFinite(Number(rest[i].lat))) {
      best = Math.min(best, pointToSegmentMeters(
        dest.lat, dest.lng, prev.lat, prev.lng, rest[i].lat, rest[i].lng));
    }
  }
  return best;
}

function bestSingleLeg(start, dest, entry) {
  const stops = orderedStops(entry.stops);
  let best = null;
  for (let i = 0; i < stops.length - 1; i++) {
    const board = stops[i];
    const walkBoard = walkToStop(start, board);
    const walkAlight = alightWalkMeters(stops, i, dest);
    if (!Number.isFinite(walkBoard) || !Number.isFinite(walkAlight)) continue;
    const score = walkBoard + walkAlight;
    if (!best || score < best.score) {
      best = {
        kind: "single",
        routeId: entry.id,
        route: entry.route,
        stops,
        board,
        walkBoard,
        walkAlight,
        score,
        fareMinor: entry.route.fare_minor || 0,
      };
    }
  }
  return best;
}

function bestTransfer(stopsA, stopsB) {
  let best = null;
  for (let i = 1; i < stopsA.length; i++) {          // must ride at least one hop
    for (let j = 0; j < stopsB.length - 1; j++) {    // must leave room to continue
      const walk = walkToStop(stopsA[i], stopsB[j]);
      if (!Number.isFinite(walk)) continue;
      if (!best || walk < best.walk) best = { from: stopsA[i], to: stopsB[j], fromIndex: i, toIndex: j, walk };
    }
  }
  return best;
}

function bestTwoLeg(start, dest, a, b) {
  if (a.id === b.id) return null;
  const sa = orderedStops(a.stops);
  const sb = orderedStops(b.stops);
  const xfer = bestTransfer(sa, sb);
  if (!xfer) return null;
  let best = null;
  for (let i = 0; i < xfer.fromIndex; i++) {
    const board = sa[i];
    const walkBoard = walkToStop(start, board);
    const walkAlight = alightWalkMeters(sb, xfer.toIndex, dest);
    if (!Number.isFinite(walkBoard) || !Number.isFinite(walkAlight)) continue;
    const score = walkBoard + xfer.walk + walkAlight + TRANSFER_PENALTY_M;
    if (!best || score < best.score) {
      best = {
        kind: "mix",
        legs: [
          { route: a.route, routeId: a.id, board, stops: sa },
          { route: b.route, routeId: b.id, board: xfer.to, stops: sb },
        ],
        transfer: xfer,
        walkBoard,
        walkTransfer: xfer.walk,
        walkAlight,
        score,
        fareMinor: (a.route.fare_minor || 0) + (b.route.fare_minor || 0),
      };
    }
  }
  return best;
}

function planJourneys(start, dest, index) {
  if (!start || !dest || start.stop_id === dest.stop_id) return [];
  const singles = [];
  const mixes = [];
  for (const e of index || []) {
    const s = bestSingleLeg(start, dest, e);
    if (s) singles.push(s);
  }
  singles.sort((a, b) => a.score - b.score);
  const bestSingle = singles[0] ? singles[0].score : Infinity;
  for (let i = 0; i < (index || []).length; i++) {
    for (let j = 0; j < index.length; j++) {
      if (i === j) continue;
      const m = bestTwoLeg(start, dest, index[i], index[j]);
      if (!m) continue;
      if (m.score < bestSingle - 50) mixes.push(m);   // only when clearly better
    }
  }
  mixes.sort((a, b) => a.score - b.score);
  return singles.concat(mixes.slice(0, 4)).sort((a, b) => a.score - b.score);
}

function collectPlannerStops(index) {
  const map = new Map();
  for (const e of index || []) {
    for (const s of e.stops || []) {
      if (s && s.stop_id && !map.has(s.stop_id)) map.set(s.stop_id, s);
    }
  }
  return [...map.values()];
}

function searchPlannerStops(query, stops) {
  const q = normalizeText(query);
  const list = stops || [];
  if (!q) return list;
  return list.filter((s) => matchesQuery(q,
    [s.stop_name_en, s.stop_name_ar, s.stop_code].filter(Boolean).join(" ")));
}

function formatWalkMeters(m) {
  if (!Number.isFinite(m)) return "—";
  const minutes = Math.max(1, Math.round(m / 80));
  return String(minutes);
}
