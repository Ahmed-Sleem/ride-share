/* Driver outbox (BUILD_PLAN P7.2, DEC-099).
   One ordered, durable queue. Replay is in seq order. Network failure
   stops the flush so later actions cannot overtake earlier ones. A 4xx
   conflict is surfaced, never last-write-wins. Age > maxAge → review,
   never silent drop. Position updates for the same path coalesce. */
(function (root) {
  const g = root || (typeof globalThis !== "undefined" ? globalThis : this);
  const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  function newId() {
    try {
      if (g.crypto && typeof g.crypto.randomUUID === "function") return g.crypto.randomUUID();
    } catch (_) { /* */ }
    return "ob-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function memoryPersist(seed) {
    let data = seed ? JSON.parse(JSON.stringify(seed)) : { seq: 0, items: [] };
    return {
      load: async () => JSON.parse(JSON.stringify(data)),
      save: async (next) => { data = JSON.parse(JSON.stringify(next)); },
      _dump: () => data,
    };
  }

  function localPersist(key) {
    const k = key || "rs.outbox.v1";
    return {
      load: async () => {
        try {
          const raw = g.localStorage ? g.localStorage.getItem(k) : null;
          if (!raw) return { seq: 0, items: [] };
          const p = JSON.parse(raw);
          if (!p || !Array.isArray(p.items)) return { seq: 0, items: [] };
          return p;
        } catch (_) { return { seq: 0, items: [] }; }
      },
      save: async (next) => {
        try { if (g.localStorage) g.localStorage.setItem(k, JSON.stringify(next)); } catch (_) { /* quota */ }
      },
    };
  }

  function createOutbox(opts) {
    const o = opts || {};
    const persist = o.persist || memoryPersist();
    const now = o.now || (() => Date.now());
    const maxAgeMs = o.maxAgeMs != null ? o.maxAgeMs : DEFAULT_MAX_AGE_MS;
    let send = o.send || (async () => { throw Object.assign(new Error("error.network"), { code: "NETWORK", messageKey: "error.network" }); });
    let state = { seq: 0, items: [] };
    let flushing = false;

    async function hydrate() {
      state = await persist.load();
      if (!state || !Array.isArray(state.items)) state = { seq: 0, items: [] };
    }
    async function commit() {
      await persist.save(state);
    }

    function pending() { return state.items.filter((i) => i.status === "pending"); }
    function review() { return state.items.filter((i) => i.status === "stale" || i.status === "conflict"); }

    async function enqueue(input) {
      await hydrate();
      const kind = input.kind;
      const method = (input.method || "POST").toUpperCase();
      const path = input.path;
      const body = input.body == null ? null : input.body;
      if (kind === "position") {
        const existing = state.items.find((i) => i.status === "pending" && i.kind === "position" && i.path === path);
        if (existing) {
          existing.body = body;
          existing.updatedAt = now();
          await commit();
          return existing;
        }
      }
      state.seq += 1;
      const item = {
        id: input.id || newId(),
        seq: state.seq,
        kind,
        method,
        path,
        body,
        status: "pending",
        createdAt: now(),
        updatedAt: now(),
        attempts: 0,
        lastError: null,
      };
      state.items.push(item);
      await commit();
      return item;
    }

    async function flush() {
      if (flushing) return { stopped: "busy" };
      flushing = true;
      try {
        await hydrate();
        const ordered = state.items.filter((i) => i.status === "pending").sort((a, b) => a.seq - b.seq);
        for (const item of ordered) {
          if (now() - item.createdAt > maxAgeMs) {
            item.status = "stale";
            item.updatedAt = now();
            await commit();
            continue;
          }
          item.attempts += 1;
          item.updatedAt = now();
          await commit();
          try {
            await send(item);
            state.items = state.items.filter((i) => i.id !== item.id);
            await commit();
          } catch (err) {
            const code = err && (err.code || err.status);
            const key = err && (err.messageKey || err.message);
            const network = code === "NETWORK" || key === "error.network" || key === "error.unavailable" || Number(code) >= 500;
            if (network) {
              item.lastError = key || "error.network";
              await commit();
              return { stopped: "network", at: item.id };
            }
            item.status = "conflict";
            item.lastError = key || String(code || "conflict");
            await commit();
          }
        }
        return { stopped: null };
      } finally {
        flushing = false;
      }
    }

    async function dismiss(id) {
      await hydrate();
      state.items = state.items.filter((i) => i.id !== id);
      await commit();
    }

    return {
      enqueue, flush, dismiss, pending, review, hydrate,
      setSend(fn) { send = fn; },
      snapshot() { return JSON.parse(JSON.stringify(state)); },
    };
  }

  const Outbox = {
    DEFAULT_MAX_AGE_MS,
    memoryPersist,
    localPersist,
    create: createOutbox,
    _live: null,
    install(opts) {
      this._live = createOutbox(opts);
      return this._live;
    },
    live() { return this._live; },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { Outbox, createOutbox, memoryPersist };
  g.Outbox = Outbox;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
