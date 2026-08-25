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
/* Local-first: Capacitor must start on a FILE in www/, never server.url.
   With server.url the WebView hits the remote host first; offline then
   shows Android's default error page. errorPath is resolved against the
   remote origin so it also fails. Boot HTML lives on the device. */
const bootSrc = path.join(HERE, "offline.html");
if (!fs.existsSync(bootSrc)) {
  console.error("FAIL: apps/mobile/offline.html missing");
  process.exit(1);
}
const inject = `<script>window.__RS_PUBLIC_ORIGIN=${JSON.stringify(origin)};</script>`;
let boot = fs.readFileSync(bootSrc, "utf8");
if (boot.includes("</head>")) boot = boot.replace("</head>", inject + "</head>");
else boot = inject + boot;
fs.writeFileSync(path.join(www, "index.html"), boot);
fs.writeFileSync(path.join(www, "offline.html"), boot);
fs.writeFileSync(path.join(dist, "www", "index.html"), boot);
fs.writeFileSync(path.join(dist, "www", "offline.html"), boot);

fs.copyFileSync(path.join(HERE, "server.js"), path.join(dist, "server.js"));

const appId = process.env.MOBILE_APP_ID || "eg.rideshare.app";
const cfg = {
  appId,
  appName: BRAND.name.en,
  webDir: "www",
  android: { allowMixedContent: false },
  /* Start on local www/index.html (offline splash). When /healthz is
     reachable, the boot page navigates to the live first-party origin
     so website deploys still update the installed app. */
  server: {
    cleartext: false,
    androidScheme: "https",
    hostname: "localhost",
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
console.log(`mobile: boot ${boot.length} bytes → www/ (live ${origin})`);
