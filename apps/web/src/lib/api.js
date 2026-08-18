/* ══════════════════════════════════════════════════════════════════════
   API client — the ONE place the interface talks to the backend (§0.3).
   The browser only ever calls the same origin (the web server proxies
   /v1/* to the API over the private network), so there is no CORS and no
   key in the client. Session = access + refresh tokens in localStorage;
   refresh happens exactly once here, on 401.

   No mocks: a request that cannot reach a backend is a real error state,
   never a fabricated success.                                       */
const API = {
  base: "/v1",
  access: () => storeGet("rs.access"),
  refreshToken: () => storeGet("rs.refresh"),
  user: () => { try { return JSON.parse(storeGet("rs.user") || "null"); } catch { return null; } },

  saveSession({ user, accessToken, refreshToken }) {
    storeSet("rs.access", accessToken);
    storeSet("rs.refresh", refreshToken);
    storeSet("rs.user", JSON.stringify(user));
  },

  clearSession() {
    try { localStorage.removeItem("rs.access"); } catch {}
    try { localStorage.removeItem("rs.refresh"); } catch {}
    try { localStorage.removeItem("rs.user"); } catch {}
  },

  async request(method, path, body) {
    if (typeof fetch !== "function") throw new ApiError("NETWORK", "error.network", null);
    const headers = { "content-type": "application/json" };
    const token = this.access();
    if (token) headers["authorization"] = "Bearer " + token;
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
      const err = new ApiError(
        (payload && payload.code) || String(res.status),
        (payload && payload.message_key) || "error.internal",
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
  login: (identifier, password) => API.request("POST", "/auth/login", { identifier, password }),
  requestOtp: (phone) => API.request("POST", "/auth/otp/request", { phone }),
  verifyOtp: (phone, code, name) => API.request("POST", "/auth/otp/verify", { phone, code, name }),
  me: () => API.request("GET", "/me"),
  changePassword: (current, next) => API.request("POST", "/me/password", { current, next }),

  /* ── verification & recovery (DEC-189) ────────────────────────────── */
  requestEmailVerification: (email) => API.request("POST", "/me/email/request", { email }),
  verifyEmail: (code) => API.request("POST", "/me/email/verify", { code }),
  requestPasswordReset: (identifier) => API.request("POST", "/auth/reset/request", { identifier }),
  confirmPasswordReset: (identifier, code, newPassword) =>
    API.request("POST", "/auth/reset/confirm", { identifier, code, newPassword }),

  /* ── staff administration (super_admin) ───────────────────────────── */
  listStaff: () => API.request("GET", "/admin/staff"),
  createStaff: (payload) => API.request("POST", "/admin/staff", payload),
  listAudit: () => API.request("GET", "/admin/audit"),

  /* ── drivers & vehicles ───────────────────────────────────────────── */
  driverApply: () => API.request("POST", "/driver/apply"),
  driverMe: () => API.request("GET", "/driver/me"),
  addVehicle: (plate, model, colour) => API.request("POST", "/driver/vehicles", { plate, model, colour }),
  listDriverApplications: () => API.request("GET", "/ops/driver-applications"),
  reviewDriverApplication: (id, decision, reason) =>
    API.request("POST", `/ops/driver-applications/${id}/review`, { decision, reason }),
  listVehicles: () => API.request("GET", "/ops/vehicles"),
  reviewVehicle: (id, decision) => API.request("POST", `/ops/vehicles/${id}/review`, { decision }),
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
