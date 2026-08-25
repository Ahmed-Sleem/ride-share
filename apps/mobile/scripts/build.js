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
const origin = (process.env.MOBILE_WEB_ORIGIN || process.env.PUBLIC_WEB_ORIGIN ||
  "https://ride-shareweb-production.up.railway.app").replace(/\/$/, "");
let html = fs.readFileSync(webHtml, "utf8");
const inject = `<script>window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};</script>`;
if (html.includes("</head>")) html = html.replace("</head>", inject + "</head>");
else html = inject + html;
fs.writeFileSync(path.join(www, "index.html"), html);
fs.writeFileSync(path.join(dist, "www", "index.html"), html);
const offlineSrc = path.join(HERE, "offline.html");
if (fs.existsSync(offlineSrc)) {
  const off = fs.readFileSync(offlineSrc);
  fs.writeFileSync(path.join(www, "offline.html"), off);
  fs.writeFileSync(path.join(dist, "www", "offline.html"), off);
}

fs.copyFileSync(path.join(HERE, "server.js"), path.join(dist, "server.js"));

const appId = process.env.MOBILE_APP_ID || "eg.rideshare.app";
const cfg = {
  appId,
  appName: BRAND.name.en,
  webDir: "www",
  android: { allowMixedContent: false },
  /* First-party live HTML: each launch loads the Railway website. A push
     to main updates the installed app without a new APK. Offline falls
     back to the baked www/ copy only if the URL cannot be reached — the
     shell still ships that copy. Native skip-landing lives in that HTML. */
  server: {
    url: origin,
    cleartext: false,
    androidScheme: "https",
    hostname: "localhost",
    errorPath: "offline.html",
    allowNavigation: [origin.replace(/^https?:\/\//, "")],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: BRAND.logo.gradient[0],
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
console.log(`mobile: wrapped ${path.relative(ROOT, webHtml)} → www/ + dist/ (${html.length} bytes)`);
