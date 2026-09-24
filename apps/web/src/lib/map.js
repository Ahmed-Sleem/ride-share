/* ══════════════════════════════════════════════════════════════════════
   RouteMap — the ONE data-bound map primitive (R21, research 06_MAPS_UX).
   Shared library (added by Path A; every screen composes this — nobody
   hand-rolls a second map, §0.3 / Uber's layer-discipline lesson).

   Renders, for a route's ordered stops:
     - real tiles + route polyline + numbered stop markers when the map SDK
       is loaded (Leaflet/OpenFreeMap by default — DEC-198, no key; Google
       when configured), with the highlighted stop (the rider's boarding
       stop) enlarged in the brand colour and an optional live vehicle
       marker (real journeys.progress data only — never an invented dot);
     - the honest labelled illustration + the numbered stop LIST until then.
   The stop list is the ACCESSIBLE alternative to the map (screen readers,
   no-SDK, file:// previews) — the map is enhancement, never the only path.
   Colours come only from CSS custom properties (tokens, §0.3); an unread
   token falls back to another token, then to the map library's default. */

/* ONBOARDING_TASK_2 Step 4/5: tile source as a single deliberate constant.
   The tile host is the ONE remaining third-party fetch; code is vendored
   inside the bundle (no unpkg/cdn on any critical path). maxZoom comes
   from the tile source's declared limit. Attribution is the literal OSM
   line everywhere a Leaflet map renders (attributionControl off — one
   line, ours). */
const OSM_ATTR = "\u00a9 OpenStreetMap contributors";
const MAP_TILES = {
  url: "https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.webp",
  maxZoom: 19,
};

function RouteMap({ stops, highlightStopId, vehicle, h = 220, title } = {}) {
  const list = (stops || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const hi = list.find((s) => s.stop_id === highlightStopId) || null;

  const wrap = $("div", { class: "col gap3" });
  if (title) wrap.append($("div", { class: "t-cap", text: title }));

  const box = $("div", { class: "mapbox mapbox--route" });
  if (mapsLive()) {
    box.append(realRouteMap(list, hi, vehicle, h));
  } else {
    box.append(MapView({ h, route: list.length >= 2, stops: true, vehicle: !!vehicle, zoom: true }));
  }
  wrap.append(box);

  /* The accessible alternative — always present, independent of the map. */
  const ul = $("ol", { class: "stack gap1 mapstops", attrs: { "aria-label": t("m_stopsAria") } });
  list.forEach((s, i) => {
    ul.append($("li", {
      class: "row gap3 mapstops__item" + (s.stop_id === highlightStopId ? " mapstops__item--hi" : ""),
    },
      $("span", { class: "mapstops__n", attrs: { "aria-hidden": "true" }, text: String(i + 1) }),
      $("span", { class: "t-cap", text: pickLang({ en: s.name_en, ar: s.name_ar }) || "—" }),
      s.stop_id === highlightStopId
        ? $("span", { class: "chip chip--brand", text: t("m_boardingHere") }) : null));
  });
  if (list.length === 0) ul.append($("li", { class: "t-cap", text: t("m_noStops") }));
  wrap.append(ul);
  return wrap;
}

/* Real-tiles renderer. One implementation per provider branch, both driven
   by the SAME data; fit-bounds so the whole line is visible (the camera
   serves the content, never a hardcoded demo — the violation R21 fixed). */
function realRouteMap(list, hi, vehicle, h) {
  const id = "routemap-" + Math.random().toString(36).slice(2, 9);
  const holder = $("div", { class: "mapbox__canvas", attrs: { id, "aria-label": t("m_routeAria") } });
  const root = $("div", { class: "mapbox mapbox--real", style: { height: h + "px" } }, holder);
  root.append($("div", { class: "attribution", text: window.__rsMapProvider === "google" ? "Google" : OSM_ATTR }));
  const cssVar = (n, fb) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || (fb ? cssVar(fb) : undefined);
  };
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const base = createBaseMap(el);                       // the ONE tiles factory
    if (!base) return;
    const { map } = base;
    const pts = list.map((s) => [s.lat, s.lng]);

    if (base.provider === "leaflet") {
      const brand = cssVar("--brand", "--accent-route");  // may be undefined → Leaflet default
      L.polyline(pts, { color: brand, weight: 5, opacity: 0.92 }).addTo(map);
      list.forEach((s, i) => {
        const isHi = hi && s.stop_id === hi.stop_id;
        L.circleMarker([s.lat, s.lng], {
          radius: isHi ? 9 : 6, color: brand, weight: 3,
          fillColor: cssVar("--bg-base", "--surface-base"), fillOpacity: 1,
        }).addTo(map)
          .bindTooltip(`${i + 1} · ${pickLang({ en: s.name_en, ar: s.name_ar }) || ""}`, { direction: "top" });
      });
      if (vehicle && Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)) {
        L.circleMarker([vehicle.lat, vehicle.lng], {
          radius: 8, weight: 3, fillColor: brand, fillOpacity: 1,
        }).addTo(map).bindTooltip(t("m_vehicle"), { direction: "top" });
      }
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate: false });
      window.__rsMapInstance = map;
    }

    if (base.provider === "google") {
      const map = base.map;
      const brand = cssVar("--brand", "--accent-route");
      new google.maps.Polyline({
        path: list.map((s) => ({ lat: s.lat, lng: s.lng })),
        map, geodesic: true, strokeColor: brand, strokeOpacity: 0.9, strokeWeight: 5,
      });
      list.forEach((s, i) => {
        const isHi = hi && s.stop_id === hi.stop_id;
        new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng }, map,
          title: `${i + 1} · ${pickLang({ en: s.name_en, ar: s.name_ar }) || ""}`,
          label: String(i + 1),   // numbered like the Leaflet markers
          ...(isHi ? { icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9,
            strokeWeight: 3, strokeColor: brand,
            fillColor: cssVar("--bg-base", "--surface-base"), fillOpacity: 1 } } : {}),
        });
      });
      if (vehicle && Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)) {
        new google.maps.Marker({ position: { lat: vehicle.lat, lng: vehicle.lng }, map, title: t("m_vehicle") });
      }
      const b = new google.maps.LatLngBounds();
      list.forEach((s) => b.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(b, 60);
      window.__rsMapInstance = map;
    }
  }, 0);
  return root;
}

/* The ONE base-map factory: tiles + attribution + provider detection.
   Every real-map renderer (RouteMap, SearchMap) starts here — there is no
   second tile implementation (§0.3). Returns null when no SDK is loaded. */
function createBaseMap(el) {
  /* The ONE tiles factory (§0.3). Every real-map surface starts here.
     Gestures, zoom control placement and tile-failure state are decided
     in this one place so RouteMap, SearchMap, EditRouteMap and MapView
     cannot drift:
       - wheel scroll stays on the page (a wheel-stealing map steals the page)
       - dragging + touchZoom on, keyboard:true
       - zoom control top-right, measured clear of the boarding pin
         at 320 px (guarded in layout.test.js)
       - attributionControl OFF: OSM_ATTR is appended by each caller in
         its own chrome (one line, ours)
     tileerror fires on the LAYER (Leaflet events don't bubble; listening
     on the map silently did nothing — exactly the grey-rectangle bug
     this state exists to prevent). */
  if (window.L) {
    const map = L.map(el, {
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      keyboard: true,
      zoomControl: false,
      attributionControl: false,
    });
    const tiles = L.tileLayer(MAP_TILES.url, { maxZoom: MAP_TILES.maxZoom });
    tiles.on("tileerror", () => {
      window.__rsMapsOn = false;
      setMapState("unavailable");
    });
    tiles.addTo(map);
    L.control.zoom({ position: "topright", zoomInText: "+", zoomOutText: "\u2212" }).addTo(map);
    /* Override Leaflet's default marker icon with a zero-size data-URI
       SVG so no upstream PNG is ever requested — the app uses
       circleMarker everywhere, but defensive (build.js blanks the
       images/ urls too, for belt-and-braces). */
    const iconSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'/>";
    const iconUrl = "data:image/svg+xml;base64," + btoa(iconSvg);
    L.Marker.prototype.options.icon = L.icon({
      iconUrl, iconSize: [0,0], iconAnchor: [0,0], popupAnchor: [0,0], shadowUrl: "",
    });
    return { provider: "leaflet", map };
  }
  if (window.google?.maps) {
    const map = new google.maps.Map(el, {
      center: { lat: 31.2241, lng: 29.9549 }, zoom: 13,
      scrollwheel: false,
      keyboardShortcuts: true,
      disableDefaultUI: true, clickableIcons: false, fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
    });
    return { provider: "google", map };
  }
  return null;
}

/* SearchMap — the planner's live map (DEC-206): all stops as quiet dots,
   matches LIGHT UP (brand) while typing, pins hold the chosen start/to,
   tapping picks the nearest stop (onPick). Falls back to the illustration. */
function SearchMap({ h = 260, stops = [], matches = [], pins = [], vehicles = [], onPick } = {}) {
  const pts = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const box = $("div", { class: "mapbox mapbox--route" });
  if (!(mapsLive())) {
    box.append(MapView({ h, route: pts.length >= 2, stops: true, zoom: true, onPick }));
    return box;
  }
  const id = "searchmap-" + Math.random().toString(36).slice(2, 9);
  const holder = $("div", { class: "mapbox__canvas", attrs: { id, "aria-label": t("m_routeAria") } });
  const root = $("div", { class: "mapbox mapbox--real", style: { height: h + "px" } }, holder);
  root.append($("div", { class: "attribution", text: window.__rsMapProvider === "google" ? "Google" : OSM_ATTR }));
  const cssVar2 = (n, fb) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return v || (fb ? cssVar2(fb) : undefined);
  };
  const matchIds = new Set((matches || []).map((s) => s.stop_id));
  const pinIds = new Set((pins || []).map((s) => s.stop_id));
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const base = createBaseMap(el);
    if (!base) return;
    const { map, provider } = base;
    const brand = cssVar2("--brand", "--accent-route");
    const quiet = cssVar2("--border-strong", "--border-subtle");
    const focusPts = [];

    const mark = (s, kind) => {                    // one marker spec per provider
      const hot = kind !== "quiet";
      if (provider === "leaflet") {
        L.circleMarker([s.lat, s.lng], {
          radius: kind === "pin" ? 9 : hot ? 8 : 5,
          color: kind === "pin" ? brand : hot ? brand : quiet,
          weight: kind === "pin" ? 4 : 2,
          fillColor: kind === "pin" ? brand : cssVar2("--bg-base", "--surface-base"),
          fillOpacity: 1,
        }).addTo(map).bindTooltip(`${hot ? "● " : ""}${stopLabelForMap(s)}`, { direction: "top" });
      } else {
        new google.maps.Marker({
          position: { lat: s.lat, lng: s.lng }, map,
          title: stopLabelForMap(s), label: kind === "pin" ? "P" : "",
          ...(hot ? { icon: { path: google.maps.SymbolPath.CIRCLE, scale: kind === "pin" ? 9 : 7,
            strokeWeight: 3, strokeColor: brand,
            fillColor: cssVar2("--bg-base", "--surface-base"), fillOpacity: 1 } } : {}),
        });
      }
      if (hot) focusPts.push(provider === "leaflet" ? [s.lat, s.lng] : { lat: s.lat, lng: s.lng });
    };
    const stopLabelForMap = (s) => pickLang({ en: s.stop_name_en || s.name_en, ar: s.stop_name_ar || s.name_ar }) || s.stop_code || "";

    pts.forEach((s) => {
      if (pinIds.has(s.stop_id)) mark(s, "pin");
      else if (matchIds.has(s.stop_id)) mark(s, "match");
      else mark(s, "quiet");
    });
    /* fleet dots: real positions only (journeys/live), brand-filled */
    (vehicles || []).forEach((v) => {
      if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) return;
      if (provider === "leaflet") {
        L.circleMarker([v.lat, v.lng], { radius: 9, color: cssVar2("--border-strong", "--border-subtle"),
          weight: 3, fillColor: brand, fillOpacity: 1 })
          .addTo(map).bindTooltip(t("m_vehicle"), { direction: "top" });
      } else {
        new google.maps.Marker({ position: { lat: v.lat, lng: v.lng }, map, title: t("m_vehicle"),
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, strokeWeight: 3,
            strokeColor: cssVar2("--border-strong", "--border-subtle"), fillColor: brand, fillOpacity: 1 } });
      }
      focusPts.push(provider === "leaflet" ? [v.lat, v.lng] : { lat: v.lat, lng: v.lng });
    });

    const fit = (arr) => {
      if (!arr || arr.length === 0) return;
      if (provider === "leaflet") map.fitBounds(L.latLngBounds(arr).pad(0.25), { animate: false });
      else { const b = new google.maps.LatLngBounds(); arr.forEach((x) => b.extend(x)); map.fitBounds(b, 60); }
    };
    if (focusPts.length) fit(focusPts);
    else if (pts.length) fit(pts.map((s) => provider === "leaflet" ? [s.lat, s.lng] : { lat: s.lat, lng: s.lng }));
    else if (provider === "leaflet") map.setView([31.2241, 29.9549], 13);

    if (onPick) {
      if (provider === "leaflet") map.on("click", (e) => onPick(e.latlng.lat, e.latlng.lng));
      else map.addListener("click", (e) => onPick(e.latLng.lat(), e.latLng.lng()));
    }
    window.__rsMapInstance = map;
  }, 0);
  return root;
}

/* EditRouteMap — desk tool: tiles always (when SDK is on), tap to pin,
   pending pin is draggable. Existing stops are numbered, not invented. */
function EditRouteMap({ h = 320, stops = [], onPick } = {}) {
  const list = (stops || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (!(mapsLive())) {
    return MapView({ h, vehicle: false, route: list.length >= 2, stops: false, locate: true, onPick });
  }
  const id = "editmap-" + Math.random().toString(36).slice(2, 9);
  const holder = $("div", { class: "mapbox__canvas", attrs: { id, "aria-label": t("m_routeAria") } });
  const root = $("div", { class: "mapbox mapbox--real", style: { height: h + "px" } }, holder);
  root.append($("div", { class: "attribution", text: window.__rsMapProvider === "google" ? "Google" : OSM_ATTR }));
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const base = createBaseMap(el);
    if (!base) return;
    const { map, provider } = base;
    const brand = (getComputedStyle(document.documentElement).getPropertyValue("--brand") || "").trim();
    if (provider === "leaflet") {
      const pts = list.map((s) => [s.lat, s.lng]);
      if (pts.length >= 2) L.polyline(pts, { color: brand || undefined, weight: 4, opacity: 0.85 }).addTo(map);
      list.forEach((s, i) => {
        L.circleMarker([s.lat, s.lng], { radius: 7, color: brand || undefined, weight: 3, fillOpacity: 1 })
          .addTo(map).bindTooltip(String(i + 1), { direction: "top" });
      });
      if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.3), { animate: false });
      else map.setView([31.2241, 29.9549], 13);
      let pending = null;
      if (onPick) {
        map.on("click", (e) => {
          const lat = e.latlng.lat, lng = e.latlng.lng;
          if (pending) pending.setLatLng(e.latlng);
          else {
            pending = L.marker(e.latlng, { draggable: true }).addTo(map);
            pending.on("dragend", () => {
              const p = pending.getLatLng();
              onPick(p.lat, p.lng);
            });
          }
          onPick(lat, lng);
        });
      }
    } else {
      list.forEach((s, i) => {
        new google.maps.Marker({ position: { lat: s.lat, lng: s.lng }, map, label: String(i + 1) });
      });
      if (list.length) {
        const b = new google.maps.LatLngBounds();
        list.forEach((s) => b.extend({ lat: s.lat, lng: s.lng }));
        map.fitBounds(b, 48);
      }
      let pending = null;
      if (onPick) {
        map.addListener("click", (e) => {
          const lat = e.latLng.lat(), lng = e.latLng.lng();
          if (pending) pending.setPosition(e.latLng);
          else {
            pending = new google.maps.Marker({ position: e.latLng, map, draggable: true });
            pending.addListener("dragend", () => {
              const p = pending.getPosition();
              onPick(p.lat(), p.lng());
            });
          }
          onPick(lat, lng);
        });
      }
    }
    window.__rsMapInstance = map;
  }, 0);
  return root;
}
