/* P7.5 — local leave-now alarm from CACHED schedule (DEC-147 / G-055).
   Must fire with no network. Push is best-effort; this is the safety net. */
(function (root) {
  const g = root || (typeof globalThis !== "undefined" ? globalThis : this);
  const KEY = "rs.alarms.v1";

  function store() {
    try {
      if (g.Platform && typeof g.Platform.get === "function") return null;
    } catch (_) { /* fall through */ }
    return null;
  }

  function readList() {
    try {
      const raw = g.localStorage ? g.localStorage.getItem(KEY) : null;
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function writeList(list) {
    try { if (g.localStorage) g.localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) { /* opaque */ }
  }

  const timers = Object.create(null);

  function fire(item, onFire) {
    if (typeof onFire === "function") onFire(item);
    else if (g.Notification && Notification.permission === "granted") {
      try { new Notification(item.title, { body: item.body }); } catch (_) { /* ignore */ }
    }
    writeList(readList().filter((a) => a.id !== item.id));
    delete timers[item.id];
  }

  function arm(item, onFire, nowFn) {
    const now = (nowFn || Date.now)();
    const wait = item.at - now;
    if (wait <= 0) { fire(item, onFire); return; }
    if (timers[item.id]) clearTimeout(timers[item.id]);
    timers[item.id] = setTimeout(() => fire(item, onFire), Math.min(wait, 2147483647));
  }

  const LocalAlarm = {
    KEY,
    schedule(item, opts) {
      const o = opts || {};
      const now = (o.now || Date.now)();
      const row = {
        id: String(item.id || "alarm"),
        at: Number(item.at),
        title: String(item.title || "Leave now"),
        body: String(item.body || ""),
        page: item.page || "waiting",
      };
      if (!Number.isFinite(row.at)) return { ok: false };
      const rest = readList().filter((a) => a.id !== row.id);
      rest.push(row);
      writeList(rest);
      arm(row, o.onFire, o.now);
      return { ok: true, at: row.at, wait: row.at - now };
    },
    cancel(id) {
      if (timers[id]) { clearTimeout(timers[id]); delete timers[id]; }
      writeList(readList().filter((a) => a.id !== id));
    },
    restore(opts) {
      const o = opts || {};
      readList().forEach((item) => arm(item, o.onFire, o.now));
      return readList().length;
    },
    list: readList,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { LocalAlarm };
  g.LocalAlarm = LocalAlarm;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
