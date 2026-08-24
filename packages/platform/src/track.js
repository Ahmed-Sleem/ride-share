/* P7.4 — batched journey GPS. One session at a time. Off-shift = silent.
   Screens never interpolate: a gap is a gap. Fixes queue until flush. */
(function (root) {
  const g = root || (typeof globalThis !== "undefined" ? globalThis : this);

  const BATCH_MAX = 8;
  const FLUSH_MS = 30000;

  function createTrack(opts) {
    const o = opts || {};
    const watch = o.watch || ((cb) => {
      if (!g.Platform || typeof g.Platform.watchPosition !== "function") return () => {};
      return g.Platform.watchPosition(cb);
    });
    const now = o.now || (() => Date.now());
    let journeyId = null;
    let buf = [];
    let stopWatch = null;
    let timer = null;
    let send = null;

    function lastPoint() {
      return buf.length ? buf[buf.length - 1] : null;
    }

    async function flush() {
      if (!journeyId || !buf.length || typeof send !== "function") return { sent: 0 };
      const points = buf.slice();
      buf = [];
      await send(journeyId, points);
      return { sent: points.length };
    }

    function start(id, sender) {
      if (!id) return;
      if (journeyId === id && stopWatch) {
        send = sender || send;
        return;
      }
      stop();
      journeyId = id;
      send = sender;
      stopWatch = watch((fix) => {
        if (!journeyId) return;
        if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return;
        buf.push({ lat: fix.lat, lng: fix.lng, at: fix.at || now() });
        if (buf.length >= BATCH_MAX) flush();
      });
      if (o.setInterval && o.clearInterval) {
        timer = o.setInterval(flush, FLUSH_MS);
      } else if (typeof setInterval === "function") {
        timer = setInterval(flush, FLUSH_MS);
      }
    }

    function stop() {
      if (stopWatch) { try { stopWatch(); } catch (_) { /* ignore */ } }
      stopWatch = null;
      if (timer != null) {
        if (o.clearInterval) o.clearInterval(timer);
        else if (typeof clearInterval === "function") clearInterval(timer);
      }
      timer = null;
      const leftover = buf.slice();
      const id = journeyId;
      buf = [];
      const sender = send;
      journeyId = null;
      send = null;
      if (id && leftover.length && typeof sender === "function") {
        return sender(id, leftover);
      }
      return Promise.resolve({ sent: leftover.length });
    }

    return {
      start, stop, flush,
      activeId: () => journeyId,
      pending: () => buf.length,
      lastPoint,
      BATCH_MAX, FLUSH_MS,
    };
  }

  const LocationTrack = createTrack();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createTrack, LocationTrack };
  }
  g.LocationTrack = LocationTrack;
  g.createLocationTrack = createTrack;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
