/* ══════════════════════════════════════════════════════════════════════
   API client — the ONE place the interface talks to the backend (§0.3).
   The browser only ever calls the same origin (the web server proxies
   /v1/* to the API over the private network), so there is no CORS and no
   key in the client. Session = access + refresh tokens in localStorage;
   refresh happens exactly once here, on 401.

   No mocks: a request that cannot reach a backend is a real error state,
   never a fabricated success.                                       */

const API = {
  /* Same-origin /v1 on the website. The native shell injects the public
     web origin so the APK talks to the live API (AUTH_OTP_BYPASS included). */
  base: (typeof window !== "undefined" && window.__RS_PUBLIC_ORIGIN)
    ? String(window.__RS_PUBLIC_ORIGIN).replace(/\/$/, "") + "/v1"
    : "/v1",
  access: () => storeGet("rs.access"),
  refreshToken: () => storeGet("rs.refresh"),
  user: () => { try { return JSON.parse(storeGet("rs.user") || "null"); } catch { return null; } },

  saveSession({ user, accessToken, refreshToken }) {
    storeSet("rs.access", accessToken);
    storeSet("rs.refresh", refreshToken);
    storeSet("rs.user", JSON.stringify(user));
  },

  /* The device identity is a random id we generate and keep, not a hardware serial: it exists so
     the same install can re-enroll quietly after its token expires, and so a person who clears app
     data simply looks like a new install (which is true). It is not personal data and is never sent
     anywhere except this service's enroll route. */
  deviceId() {
    let id = storeGet("rs.device");
    if (!id) {
      const rnd = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? String(crypto.randomUUID()).replace(/-/g, "")
        : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("");
      id = "d" + rnd.slice(0, 31);
      storeSet("rs.device", id);
    }
    return id;
  },

  clearSession() {
    try { localStorage.removeItem("rs.access"); } catch {}
    try { localStorage.removeItem("rs.refresh"); } catch {}
    try { localStorage.removeItem("rs.user"); } catch {}
  },

  /* One enrolment per install, then a bearer-of-the-app header on every request. When the token is
     missing, expired, or was minted before a server restart, the request is retried once after a
     fresh enrolment - so a person never sees the difference, and a day is the worst-case stall. */
  _tok: "",
  _tokExp: 0,

  async enroll() {
    if (typeof fetch !== "function" || typeof window === "undefined") return null;
    let res;
    try {
      res = await fetch(this.base + "/mobile/enroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId(),
          appId: window.__RS_APP_ID || "eg.rideshare.app",
        }),
      });
    } catch { return null; }
    if (!res.ok) return null;
    let meta = null;
    try { meta = await res.json(); } catch { return null; }
    if (!meta || !meta.token) return null;
    this._tok = String(meta.token);
    this._tokExp = Number(meta.expiresAt) || 0;
    try { localStorage.setItem("rs.device.token", JSON.stringify({ t: this._tok, e: this._tokExp })); } catch {}
    return meta;
  },

  async deviceToken() {
    if (this._tok && Date.now() < this._tokExp - 5 * 60 * 1000) return this._tok;
    try {
      const cached = JSON.parse(storeGet("rs.device.token") || "null");
      if (cached && cached.t && Date.now() < Number(cached.e) - 5 * 60 * 1000) {
        this._tok = String(cached.t); this._tokExp = Number(cached.e);
        return this._tok;
      }
    } catch { /* a torn cache is just a missing token */ }
    const got = await this.enroll();
    return got ? this._tok : "";
  },

  async request(method, path, body, extraHeaders, afterEnroll) {
    if (typeof fetch !== "function") throw new ApiError("NETWORK", "error.network", null);
    const headers = { "content-type": "application/json" };
    const token = this.access();
    if (token) headers["authorization"] = "Bearer " + token;
    const onDevice = typeof window !== "undefined" && window.__RS_SURFACE === "mobile";
    if (onDevice) {
      try {
        const dev = await this.deviceToken();
        if (dev) headers["x-rs-device-token"] = dev;
      } catch (e) {
        console.warn("[api] device token unavailable", e);
      }
    }
    if (extraHeaders && typeof extraHeaders === "object") {
      for (const [k, v] of Object.entries(extraHeaders)) if (v != null) headers[k] = String(v);
    }
    let res;
    try {
      res = await fetch(this.base + path, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError("NETWORK", "error.network", null);
    }
    let payload = null;
    try { payload = await res.json(); } catch { /* non-JSON */ }
    if (!res.ok) {
      /* A stale or missing device token is our own bookkeeping, not the person's problem: enroll
         once and replay the call. Any other 401 is a real auth failure and must reach the caller. */
      const code = (payload && payload.code) || "";
      if (onDevice && res.status === 401 && String(code).indexOf("DEVICE_TOKEN") === 0 && !afterEnroll) {
        this._tok = "";
        try { localStorage.removeItem("rs.device.token"); } catch {}
        await this.enroll();
        return this.request(method, path, body, extraHeaders, true);
      }
      // 502/503/504 from the proxy means the API is unreachable — a clearer,
      // retryable message beats "something went wrong" for the user.
      const fallback = res.status >= 500 ? "error.unavailable" : "error.internal";
      const err = new ApiError(
        (payload && payload.code) || String(res.status),
        (payload && payload.message_key) || fallback,
        payload
      );
      // one refresh attempt on expired access, then retry exactly once
      if (res.status === 401 && token && path !== "/auth/refresh" && path !== "/auth/login") {
        const refreshed = await this._refresh();
        if (refreshed) return this.request(method, path, body);
      }
      throw err;
    }
    return payload;
  },

  async _refresh() {
    const refreshToken = this.refreshToken();
    if (!refreshToken) return false;
    try {
      const r = await fetch(this.base + "/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!r.ok) { this.clearSession(); return false; }
      const p = await r.json();
      this.saveSession(p);
      return true;
    } catch { return false; }
  },

  /* ── auth ─────────────────────────────────────────────────────────── */
  identify: (identifier) => API.request("POST", "/auth/login/identify", { identifier }),
  login: (identifier, password) => API.request("POST", "/auth/login", { identifier, password }),
  requestOtp: (email) => API.request("POST", "/auth/otp/request", { email }),
  verifyOtp: (email, code) => API.request("POST", "/auth/otp/verify", { email, code }),
  signupVerify: (email, code, name, password) => API.request("POST", "/auth/signup/verify", { email, code, name, password }),
  me: () => API.request("GET", "/me"),
  changePassword: (current, next) => API.request("POST", "/me/password", { current, next }),
  getConfig: () => API.request("GET", "/config"),

  /* ── verification & recovery (DEC-189) ────────────────────────────── */
  requestEmailVerification: (email) => API.request("POST", "/me/email/request", { email }),
  verifyEmail: (code) => API.request("POST", "/me/email/verify", { code }),
  requestPasswordReset: (identifier) => API.request("POST", "/auth/reset/request", { identifier }),
  confirmPasswordReset: (identifier, code, newPassword) =>
    API.request("POST", "/auth/reset/confirm", { identifier, code, newPassword }),

  /* ── staff administration (super_admin) ───────────────────────────── */
  listStaff: () => API.request("GET", "/admin/staff"),
  createStaff: (payload) => API.request("POST", "/admin/staff", payload),
  updateStaff: (id, payload) => API.request("PATCH", `/admin/staff/${id}`, payload),
  deleteStaff: (id) => API.request("DELETE", `/admin/staff/${id}`),
  listAudit: (limit, offset) => API.request("GET", `/admin/audit?limit=${limit||25}&offset=${offset||0}`),

  /* ── drivers & vehicles ───────────────────────────────────────────── */
  driverApply: () => API.request("POST", "/driver/apply"),
  driverMe: () => API.request("GET", "/driver/me"),
  addVehicle: (plate, model, colour) => API.request("POST", "/driver/vehicles", { plate, model, colour }),
  listDriverApplications: () => API.request("GET", "/ops/driver-applications"),
  reviewDriverApplication: (id, decision, reason) =>
    API.request("POST", `/ops/driver-applications/${id}/review`, { decision, reason }),
  listVehicles: () => API.request("GET", "/ops/vehicles"),
  reviewVehicle: (id, decision) => API.request("POST", `/ops/vehicles/${id}/review`, { decision }),

  /* ── geography (M2) ────────────────────────────────────────────────── */
  createStop: (payload) => API.request("POST", "/stops", payload),
  importStops: (csv) => API.request("POST", "/stops/import", { csv }),
  listStops: (status) => API.request("GET", status ? `/stops?status=${status}` : "/stops"),
  captureStop: (payload) => API.request("POST", "/stops/capture", payload),
  submitStop: (id) => API.request("POST", `/stops/${id}/submit`),
  reviewStop: (id, decision, reason) => API.request("POST", `/stops/${id}/review`, { decision, reason }),
  retireStop: (id) => API.request("POST", `/stops/${id}/retire`),

  /* ── routes & journeys (M3) ─────────────────────────────────────────── */
  listRoutes: () => API.request("GET", "/routes"),
  createRoute: (payload) => API.request("POST", "/routes", payload),
  getRoute: (id) => API.request("GET", `/routes/${id}`),
  publishRoute: (id) => API.request("POST", `/routes/${id}/publish`),
  addStopToRoute: (id, stopId) => API.request("POST", `/routes/${id}/stops`, { stopId }),
  reorderRoute: (id, orderedStopIds) => API.request("POST", `/routes/${id}/reorder`, { orderedStopIds }),
  generateSlots: (id, fromDate, toDate) => API.request("POST", `/routes/${id}/slots`, { fromDate, toDate }),
  listRouteSlots: (id, from, to) => API.request("GET", `/routes/${id}/slots?from=${from}&to=${to}`),
  driverVehicles: () => API.request("GET", "/driver/vehicles"),
  claimJourney: (slotId, vehicleId, committed) => API.request("POST", "/journeys/claim", { slotId, vehicleId, committed }),
  releaseJourney: (id) => API.request("POST", `/journeys/${id}/release`),
  openJourney: (id) => API.request("POST", `/journeys/${id}/open`),
  myJourneys: () => API.request("GET", "/journeys/mine"),
  availableJourneys: (from, to) => API.request("GET", `/journeys/available?from=${from}&to=${to}`),

  /* ── rider booking (P3.4–P3.6) ───────────────────────────────────────── */
  publishedRoutes: () => API.request("GET", "/routes/published"),
  // routeId may be null → omit the param (server returns journeys on ANY
  // route in the window; a literal "route=null" would be an invalid uuid).
  upcomingJourneys: (routeId, from, to) => API.request("GET",
    `/journeys/upcoming?${routeId ? `route=${routeId}&` : ""}from=${from}&to=${to}`),
  book: (journeyId, boardingStopId, seats) => API.request("POST", "/bookings", { journeyId, boardingStopId, seats }),
  payWallet: (bookingId) => API.request("POST", `/payments/bookings/${bookingId}/pay-wallet`),
  myBookings: () => API.request("GET", "/bookings/mine"),
  cancelBooking: (id) => API.request("POST", `/bookings/${id}/cancel`),

  /* ===== journeys client (Path B) ===== */
  scanBooking: (journeyId, code) => API.request("POST", "/bookings/scan", { journeyId, code }),
  journeyManifest: (id) => API.request("GET", `/journeys/${id}/manifest`),
  startJourney: (id) => API.request("POST", `/journeys/${id}/start`),
  completeJourney: (id) => API.request("POST", `/journeys/${id}/complete`),
  abortJourney: (id, reason) => API.request("POST", `/journeys/${id}/abort`, { reason }),
  arriveStop: (id) => API.request("POST", `/journeys/${id}/arrive`),
  journeyProgress: (id) => API.request("GET", `/journeys/${id}/progress`),
  journeyPosition: (id, lat, lng) => API.request("POST", `/journeys/${id}/position`, { lat, lng }),
  journeyPositionBatch: (id, points) => API.request("POST", `/journeys/${id}/position`, { points }),
  bookingLive: (id) => API.request("GET", `/bookings/${id}/live`),
  requestAlight: (id) => API.request("POST", `/bookings/${id}/alight`),
  raiseSos: (body) => API.request("POST", "/support/sos", body || {}),
  fileReport: (body) => API.request("POST", "/support/reports", body),
  createShareLink: (bookingId) => API.request("POST", "/support/shares", { bookingId }),
  publicShare: (token) => API.request("GET", `/support/share/${token}`),
  myIncidents: () => API.request("GET", "/support/mine"),
  incidentQueue: () => API.request("GET", "/support/incidents"),
  investigateIncident: (id) => API.request("POST", `/support/incidents/${id}/investigate`),
  decideIncident: (id, decision, reason) => API.request("POST", `/support/incidents/${id}/decide`, { decision, reason }),
  registerDevice: (token, platform) => API.request("POST", "/notifications/device", { token, platform }),
  myNotifications: () => API.request("GET", "/notifications/mine"),
  getOwnerSettings: () => API.request("GET", "/admin/settings"),
  saveOwnerSettings: (payload) => API.request("PATCH", "/admin/settings", payload),

  /* Fetch a stop photo as a data URL (auth header can't ride an <img> tag). */
  stopPhoto: async (id) => {
    if (typeof fetch !== "function") return null;
    const token = API.access();
    const res = await fetch(`${API.base}/stops/${id}/photo`, {
      headers: token ? { authorization: "Bearer " + token } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  },

  /* ===== payments client (Path A — docs/planning/PATH_A_MONEY.md §5) ===== */
  paymentsConfig: () => API.request("GET", "/payments/config"),
  wallet: () => API.request("GET", "/payments/wallet"),
  topup: (amountMinor) => API.request("POST", "/payments/topup", { amountMinor }),
  cashCollected: (bookingId) => API.request("POST", "/payments/cash-collected", { bookingId }),
  driverEarnings: () => API.request("GET", "/payments/driver/earnings"),
  journeysLive: () => API.request("GET", "/journeys/live"),   /* ops fleet map (DEC-205 Path A) */
};

class ApiError extends Error {
  constructor(code, messageKey, payload) {
    super(messageKey);
    this.code = code;
    this.messageKey = messageKey;
    this.payload = payload;
  }
}

/* Resolve the session on boot: a stored session is validated against /me
   (refresh on 401). Returns the user or null. Never throws. */
async function resolveSession() {
  const user = API.user();
  if (!user || !API.access()) return null;
  try {
    const me = await API.me();           // { actor: { id, role } }
    const fresh = { ...user };
    if (me && me.actor) {
      fresh.id = me.actor.id;
      fresh.role = me.actor.role;
    }
    storeSet("rs.user", JSON.stringify(fresh));
    return fresh;
  } catch {
    API.clearSession();
    return null;
  }
}
