/* One Platform interface (BUILD_PLAN P7.1, DEC-176).
   Screens and feature files call Platform.* only.
   Native Capacitor plugins are reached through window.Capacitor at runtime
   when the APK WebView injects them — this file never `import`s @capacitor/*
   so the web bundle stays a working web app if the native layer is removed. */
(function (root) {
  const g = root || (typeof globalThis !== "undefined" ? globalThis : this);

  function cap() {
    try {
      const C = g.Capacitor;
      if (C && typeof C.isNativePlatform === "function" && C.isNativePlatform()) return C;
      if (C && C.isNative === true) return C;
    } catch (_) { /* browser / jsdom */ }
    return null;
  }

  function plugin(name) {
    const C = cap();
    if (!C) return null;
    const plugins = C.Plugins || (C.getPlugin && C.getPlugin(name) ? { [name]: C.getPlugin(name) } : null);
    return (plugins && plugins[name]) || null;
  }

  function sixDigits(raw) {
    const s = String(raw || "").replace(/\D/g, "");
    if (s.length >= 6) return s.slice(0, 6);
    return "";
  }
  function extractScanText(result) {
    if (!result) return "";
    if (typeof result === "string") return result;
    const first = (result.barcodes && result.barcodes[0]) || result.barcode || result;
    return first.rawValue || first.displayValue || first.content || first.text || "";
  }

  const Platform = {
    kind() {
      return cap() ? "native" : "web";
    },

    watchPosition(onFix) {
      const cb = typeof onFix === "function" ? onFix : () => {};
      const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
      const geo = plugin("Geolocation");
      if (geo && typeof geo.watchPosition === "function") {
        let id = null;
        const p = geo.watchPosition(options, (pos, err) => {
          if (err || !pos) return;
          const c = pos.coords || pos;
          if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;
          cb({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy, at: Date.now() });
        });
        if (p && typeof p.then === "function") p.then((v) => { id = v && (v.value || v); }).catch(() => {});
        else id = p;
        return () => {
          try { if (geo.clearWatch) geo.clearWatch({ id }); } catch (_) { /* gone */ }
        };
      }
      if (g.navigator && g.navigator.geolocation && typeof g.navigator.geolocation.watchPosition === "function") {
        const id = g.navigator.geolocation.watchPosition(
          (p) => cb({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            at: Date.now(),
          }),
          () => {},
          options
        );
        return () => { try { g.navigator.geolocation.clearWatch(id); } catch (_) { /* gone */ } };
      }
      return () => {};
    },

    async getPosition(opts) {
      const options = Object.assign(
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
        opts || {}
      );
      const geo = plugin("Geolocation");
      if (geo && typeof geo.getCurrentPosition === "function") {
        const pos = await geo.getCurrentPosition(options);
        const c = pos.coords || pos;
        return {
          lat: c.latitude,
          lng: c.longitude,
          accuracy: c.accuracy,
        };
      }
      if (!g.navigator || !g.navigator.geolocation) return null;
      return new Promise((resolve) => {
        g.navigator.geolocation.getCurrentPosition(
          (p) => resolve({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
          }),
          () => resolve(null),
          options
        );
      });
    },

    async share(payload) {
      const data = payload || {};
      const sh = plugin("Share");
      if (sh && typeof sh.share === "function") {
        await sh.share({
          title: data.title || "",
          text: data.text || "",
          url: data.url || "",
        });
        return true;
      }
      if (g.navigator && typeof g.navigator.share === "function") {
        try {
          await g.navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
          return true;
        } catch (_) { /* user cancelled */ }
      }
      if (data.url && g.navigator && g.navigator.clipboard && g.navigator.clipboard.writeText) {
        try {
          await g.navigator.clipboard.writeText(data.url);
          return true;
        } catch (_) { /* leave the field for the caller */ }
      }
      return false;
    },

    async get(key) {
      const prefs = plugin("Preferences");
      if (prefs && typeof prefs.get === "function") {
        const r = await prefs.get({ key });
        return r && r.value != null ? r.value : null;
      }
      try { return g.localStorage ? g.localStorage.getItem(key) : null; } catch (_) { return null; }
    },

    /* P7.3 — scan a boarding QR. Returns { code } or { denied } or null.
       Never throws into the screen. The numeric keypad is always the fallback. */
    async scanCode() {
      const scan = plugin("BarcodeScanner");
      if (scan) {
        try {
          if (typeof scan.requestPermissions === "function") {
            const perm = await scan.requestPermissions();
            const cam = perm && (perm.camera || perm.state);
            if (cam === "denied" || cam === "prompt-with-rationale") return { denied: true };
          }
          const result = typeof scan.scan === "function"
            ? await scan.scan({ formats: ["qrCode", "qr_code", 256] })
            : null;
          const raw = extractScanText(result);
          const code = sixDigits(raw);
          if (code) return { code };
          return null;
        } catch (e) {
          const msg = String((e && e.message) || e || "");
          if (/denied|permission|cancel/i.test(msg)) return { denied: true };
          return null;
        }
      }
      return null;
    },

    async registerPush() {
      const push = plugin("PushNotifications");
      if (push && typeof push.requestPermissions === "function") {
        try {
          const perm = await push.requestPermissions();
          if (perm && perm.receive === "denied") return { denied: true };
          if (typeof push.register === "function") await push.register();
          return { ok: true };
        } catch (_) { return { denied: true }; }
      }
      if (g.Notification && typeof Notification.requestPermission === "function") {
        try {
          const p = await Notification.requestPermission();
          if (p === "denied") return { denied: true };
          return { ok: true, token: "web" };
        } catch (_) { return { denied: true }; }
      }
      return { unavailable: true };
    },

    async set(key, value) {
      const prefs = plugin("Preferences");
      if (prefs && typeof prefs.set === "function") {
        await prefs.set({ key, value: String(value) });
        return;
      }
      try { if (g.localStorage) g.localStorage.setItem(key, String(value)); } catch (_) { /* opaque origin */ }
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { Platform };
  g.Platform = Platform;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
