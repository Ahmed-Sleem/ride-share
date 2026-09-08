#!/usr/bin/env node
/* Assemble the Capacitor www/ + Railway dist/ from the ONE web build
   (DEC-176, P7.1). Never fork screens. Brand identity comes from
   packages/brand/brand.json — the same source the web and emails use. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");
const HERE = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "apps/web");
const BRAND = JSON.parse(
  fs.readFileSync(path.join(ROOT, "packages/brand/brand.json"), "utf8")
);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

const webBuild = path.join(WEB, "build.js");
if (!fs.existsSync(webBuild)) {
  console.error("FAIL: web build.js missing — mobile wraps @ride-share/web");
  process.exit(1);
}
run(process.execPath, [webBuild], WEB);

const webHtml = fs.existsSync(path.join(WEB, "dist/index.html"))
  ? path.join(WEB, "dist/index.html")
  : path.join(WEB, "dist-preview.html");
if (!fs.existsSync(webHtml)) {
  console.error("FAIL: web produced no HTML");
  process.exit(1);
}

const www = path.join(HERE, "www");
const dist = path.join(HERE, "dist");
fs.rmSync(www, { recursive: true, force: true });
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(path.join(dist, "www"), { recursive: true });

/* The address this build talks to comes from one module (scripts/resolve-origin.js):
   environment first, brand.json's app.origin as the floor, and a hard failure if neither
   answers. An empty origin used to be possible, and the installer that shipped with one
   is exactly why that is no longer allowed. */
const { resolveOrigin, brandSite, normalise } = require(path.join(HERE, "scripts", "resolve-origin.js"));
const origin = resolveOrigin();
/* Two different hosts, and the difference matters: `origin` is where the interface is fetched
   from, the site is where a person lands. Folding them together silently dropped the site out
   of allowNavigation, which only shows up in the built artifact - so the brand file names each
   one and the config test asserts both are present. */
const webOrigin = normalise(process.env.PUBLIC_WEB_ORIGIN || brandSite(), "PUBLIC_WEB_ORIGIN");
const appId = (process.env.MOBILE_APP_ID || "eg.rideshare.app").trim();
/* No client-side key is read or baked any more (D-8.12). If a build still sets MOBILE_APP_SECRET
   it is ignored here on purpose: the service signs the device tokens with it, and a copy in a
   binary or a bundle would only be an invitation to read it out. */

/* Local-first: Capacitor must start on a FILE in www/, never server.url.
   With server.url the WebView hits the remote host first; offline then
   shows Android's default error page. Boot HTML lives on the device. */
const bootSrc = path.join(HERE, "offline.html");
if (!fs.existsSync(bootSrc)) {
  console.error("FAIL: apps/mobile/offline.html missing");
  process.exit(1);
}
const inject = `<script>window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};window.__RS_SURFACE="mobile";window.__RS_APP_ID=${JSON.stringify(appId)};</script>`;
let boot = fs.readFileSync(bootSrc, "utf8");
/* The boot page is inside the binary and cannot fetch the app's stylesheet, so the
   typeface is handed to it here, from the same brand.json the web build reads. The
   marker is asserted on purpose: a silently missed injection would leave the splash on
   a system font, and nobody would notice until two screens were compared. */
const BRAND_CSS_MARK = "/*__RS_BRAND__*/";
if (!boot.includes(BRAND_CSS_MARK)) throw new Error("apps/mobile/offline.html: brand CSS marker missing");
/* @font-face blocks are taken from the web build's own output, where they are already
   base64-inlined. That is deliberate: naming a family the APK never ships would leave the
   boot page on Roboto and look like a match without being one, and pointing at a path
   build.js invented would be a second source of truth about where the fonts live. */
const faces = (fs.readFileSync(webHtml, "utf8").match(/@font-face\s*\{[^}]*\}/g) || []).join("");
if (!faces) throw new Error("web build contains no @font-face block — refusing to ship a boot page on a system font");
/* The declarations go inside the boot page's :root, the @font-face blocks must NOT: an
   at-rule nested in a style rule is invalid and is dropped in silence, which is how the
   first version of this injection shipped a boot page that named Cairo and loaded nothing.
   Two markers, two positions, both asserted. */
const FACES_MARK = "/*__RS_FACES__*/";
if (!boot.includes(FACES_MARK)) throw new Error("apps/mobile/offline.html: faces marker missing");
/* The palette comes from brand.json, not from this file's opinion: `apps/web` holds its colours
   in --bg-base/--text-primary/--text-secondary/--line, and a page baked into the binary cannot read
   them, so they are injected here — with the dark half in a media query, because the app has two
   themes and a splash that only knows one of them flashes. The faces ride along in the same
   element: an @font-face inside a :root block is invalid and is dropped in silence. */
const PAL = BRAND.palette;
if (!PAL || !PAL.light || !PAL.dark) throw new Error("packages/brand/brand.json has no palette{light,dark}");
/* Only the four the page actually reads. hairline stays in brand.json (the web unit guard holds
   --line to it) but is not injected: a declaration nothing consumes is a token waiting to be
   mistaken for a live one, which is how --brand-2 came to sit in this file for a whole release. */
const layer = (p) =>
  "--bg:" + p.paper + ";--ink:" + p.ink + ";--muted:" + p.muted +
  ";--brand:" + p.ink + ";--on:" + p.paper +
  ";--brand-font:" + BRAND.font.family + ";--brand-font-weight:" + BRAND.font.weight;
boot = boot.replace(FACES_MARK,
  "<style>" + faces +
  ":root{" + layer(PAL.light) + "}" +
  "@media (prefers-color-scheme: dark){:root{" + layer(PAL.dark) + "}}</style>");
boot = boot.replace(BRAND_CSS_MARK, "");
if (boot.includes("</head>")) boot = boot.replace("</head>", inject + "</head>");
else boot = inject + boot;
fs.writeFileSync(path.join(www, "index.html"), boot);
fs.writeFileSync(path.join(www, "offline.html"), boot);

/* Railway `mobile` serves the LIVE app HTML (intro → auth), not the splash.
   The splash only lives on the device so offline never hits Android's page. */
let appHtml = fs.readFileSync(webHtml, "utf8");
const appTag = `<script>window.__RS_SURFACE="mobile";window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};window.__RS_APP_ID=${JSON.stringify(appId)};</script>`;
/* Test for the assignment. The previous guard asked whether the bundle mentions __RS_SURFACE
   at all - and lib/api.js reads window.__RS_SURFACE on every request, so the answer was always
   yes, the tag was never injected, and the delivered app had no origin, no surface and no key:
   it mounted, then asked the WebView's own https://localhost for /v1, where nothing answers
   (G-115). Same class as G-110, one layer up, and invisible to every test that read the source
   instead of the served bundle. */
const TAG_ASSIGNED = /window\.__RS_PUBLIC_ORIGIN\s*=/;
if (!TAG_ASSIGNED.test(appHtml)) {
  appHtml = appHtml.includes("<head>") ? appHtml.replace("<head>", "<head>" + appTag) : appTag + appHtml;
}
if (!TAG_ASSIGNED.test(appHtml)) {
  console.error("FAIL: the OTA bundle has no mobile tag - the app would boot with no API origin");
  process.exit(1);
}
/* The OTA artifact is the whole app on a phone that may be mid-tunnel with no
   network. Anything it has to FETCH before it can paint — a stylesheet, a script, a
   font in a url() — is a page that renders as nothing at exactly the moment the app is
   most useful, and it renders as nothing only on the device, never in CI, where the
   network is always on. The web build inlines its fonts for the same reason; this is
   the promise one layer out, checked on the bytes that actually ship.
   (Third-party links the user taps — the store page, the terms — are untouched: a dead
   hyperlink is an inconvenience, a render-blocking origin is the whole screen.) */
const RENDER_BLOCKING = [/url\(\s*["']?https?:\/\//i, /<link[^>]+rel=["']?stylesheet["']?[^>]+href=["']?https?:/i, /<script[^>]+src=["']?https?:/i];
const leaks = RENDER_BLOCKING.filter((re)=>re.test(appHtml));
if (leaks.length) {
  console.error("FAIL: the OTA bundle reaches a third-party origin before it can paint: " + leaks.join(", "));
  console.error("      inline the asset (see build.js's font inlining) — a phone offline would show a blank page.");
  process.exit(1);
}
fs.writeFileSync(path.join(dist, "www", "index.html"), appHtml);
fs.writeFileSync(path.join(dist, "www", "offline.html"), boot);

fs.copyFileSync(path.join(HERE, "server.js"), path.join(dist, "server.js"));

const cfg = {
  appId,
  appName: BRAND.name.en,
  webDir: "www",
  android: { allowMixedContent: false },
  server: {
    cleartext: false,
    androidScheme: "https",
    hostname: "localhost",
    allowNavigation: [...new Set([
      origin.replace(/^https?:\/\//, ""),
      webOrigin.replace(/^https?:\/\//, ""),
    ].filter(Boolean))],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: BRAND.browserThemeColor.light,
    },
    StatusBar: { style: "DARK" },
  },
};
fs.writeFileSync(
  path.join(HERE, "capacitor.config.json"),
  JSON.stringify(cfg, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(dist, "capacitor.config.json"),
  JSON.stringify(cfg, null, 2) + "\n"
);

const ver = BRAND.version || { name: "0.0.0", code: 0 };
const meta = {
  service: "mobile",
  wrapped: "@ride-share/web",
  appId,
  appName: BRAND.name.en,
  versionName: ver.name,
  versionCode: ver.code,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(dist, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(
  /* Both sizes on one line, because they decide what a device can see: the APK carries only
     the boot page, and the app a tester actually reads is the OTA artifact. "Why is my change
     not in the app?" was answered this round by unzipping a published binary; this line
     answers it from a build log, and it names the versionCode that is the only lever. */
  `mobile: boot ${boot.length} bytes → www/ (live ${origin})` +
  ` | app ${appHtml.length} bytes → dist/www/ (OTA, versionCode ${BRAND.version.code})`,
);
