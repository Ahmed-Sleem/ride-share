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

  const Platform = {
    kind() {
      return cap() ? "native" : "web";
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
