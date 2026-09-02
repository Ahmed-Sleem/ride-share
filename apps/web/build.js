#!/usr/bin/env node
/* Assembles app/src into the single deliverable HTML file.
   The shell (styles + document) and the JS modules each have one home.
   Never hand-edit the output: it is regenerated on every build.

   Brand (§0.3): everything about the product's identity — name, tagline,
   logo, font, favicon, browser theme colour — comes from the ONE source
   packages/brand/brand.json. This build (a) substitutes the shell's __BRAND_*
   tokens and (b) injects `const BRAND = …` that the copy table and the logo
   component read. To rename the product or change the logo, edit brand.json
   only.                                                              */
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const SRC   = path.join(__dirname, "src");
const OUT   = path.join(__dirname, "dist-preview.html");
const BRAND = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "brand", "brand.json"), "utf8"));

/* brand.json is a *published* file: whatever can write the repository can write this
   one, and its contents are spliced into the served document — into `<title>`, into two
   `theme-color` metas, into a CSS font stack, into the favicon's inline <svg>, and into
   the install card's link. So the shapes are refused here, where the reason is obvious,
   rather than reaching a browser as markup, as `undefined`, or as a dead button. */
(() => {
  const fail = (m) => { console.error("FAIL: brand.json — " + m); process.exit(1); };
  const noMarkup = (v, what) => {
    if (typeof v !== "string" || v.trim() === "" || /[<>"`&]/.test(v)) fail(what + " must be plain text");
  };
  for (const k of ["name", "tagline"]) {
    const o = BRAND[k];
    if (!o || typeof o !== "object") fail(`\`${k}\` must give one value per language`);
    for (const lang of Object.keys(o)) noMarkup(o[lang], `${k}.${lang}`);
  }
  noMarkup(BRAND.description, "description");
  if (/[<>{}&`\[\];@]/.test(BRAND.font.family) || !/^[A-Za-z0-9 ,;'"().+-]+$/.test(BRAND.font.family)) {
    fail("`font.family` must be a plain font stack (it becomes a CSS value)");
  }
  if (!Number.isFinite(BRAND.font.weight)) fail("`font.weight` must be a number");
  const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(v);
  for (const [what, o, keys] of [["browserThemeColor", BRAND.browserThemeColor, ["light", "dark"]],
                                 ["logo.color", BRAND.logo.color, ["light", "dark"]]]) {
    for (const k of keys) if (!o || !hex(o[k])) fail(`\`${what}.${k}\` must be a #rrggbb colour`);
  }
  if (!/^[\d. -]+$/.test(String(BRAND.logo.viewBox))) fail("`logo.viewBox` must be numbers");
  if (!/^[A-Za-z0-9][\w.+-]*$/.test(String(BRAND.version.name)) || !Number.isInteger(BRAND.version.code)) {
    fail("`version` must give a name and an integer code (the install link carries it)");
  }
  const d = BRAND.download;
  if (!d || !/^\/[\w./-]*$/.test(String(d.path))) fail("`download.path` must be a rooted path");
  if (!d || !/^[\w.-]+\.apk$/.test(String(d.apk))) fail("`download.apk` must be an .apk file name");
  if (typeof BRAND.logo.path !== "string" || BRAND.logo.path.length < 8
      || !/^[AaMmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/.test(BRAND.logo.path)) {
    fail("`logo.path` must be SVG path data");
  }
})();

/* favicon — a data URI built from the brand logo, flat ink that answers
   `prefers-color-scheme` the same way the document does. The in-app mark is
   currentColor (see logoSVG in lib/components.js); a favicon has no document to
   inherit from, so the two literal colours live in brand.json — the one place
   the mark is written down. */
const faviconSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${BRAND.logo.viewBox}'>` +
  `<style>@media (prefers-color-scheme:dark){path{fill:${BRAND.logo.color.dark}}}</style>` +
  `<path fill='${BRAND.logo.color.light}' fill-rule='evenodd' d='${BRAND.logo.path}'/></svg>`;
const faviconDataUri = "data:image/svg+xml," + encodeURIComponent(faviconSvg);

/* ── type ───────────────────────────────────────────────────────────────────
   The deliverable is one file with no network, so a font is not a <link>: the
   face is read from `assets/fonts/`, verified, and inlined as a data URI.
   `packages/brand/brand.json` owns the STACK (what a role asks for) and
   `assets/fonts/fonts.json` owns the FILES (what is in the bundle) — one fact,
   one home, and this is where the two are proved to agree.
   Refused at build time, rather than shipping a page that quietly falls back: a
   missing file, a file that is not woff2, bytes that do not match the recorded
   sha256, a face whose `unicodeRange` does not cover Arabic (it would steal the
   Latin run and change the brand's letterforms), a face without its licence, a
   face over its own budget, the bundle over its total, and a family that no
   stack names yet still costs payload. A face kept in the directory as a
   declared option and not named by the brand stack is held back, never carried. */
const FONT_DIR   = path.join(__dirname, "assets", "fonts");
const FONTS      = JSON.parse(fs.readFileSync(path.join(FONT_DIR, "fonts.json"), "utf8"));
const brandStack = BRAND.font.family;
const shipped = [];
const held = [];
for (const face of FONTS.faces) {
  const fail = (m) => { console.error("FAIL: fonts.json — " + face.family + ": " + m); process.exit(1); };
  if (!/^[A-Za-z0-9 ."'()&+-]+$/.test(face.family)) fail("`family` must be a plain font name");
  const named = brandStack.indexOf('"' + face.family + '"') >= 0 || brandStack.indexOf(face.family) >= 0;
  if (!face.display && !named) { held.push(face.family); continue; }
  if (!/^\d+(\.\d+)? \d+(\.\d+)?$/.test(face.weight)) fail("`weight` must be a range like `200 1000`");
  if (!/U\+0600-06FF/.test(face.unicodeRange)) fail("`unicodeRange` must cover U+0600-06FF, or the face steals the Latin");
  /* A face may carry LESS than the full Arabic ranges (a masthead has no need of the
     zero-width marks), never MORE: anything outside them could take a run away from
     the brand stack, which is the one thing this whole step exists to prevent. */
  const allowed = new Set(FONTS.arabicRanges.split(",").map((r) => r.trim()));
  for (const r of face.unicodeRange.split(",")) {
    const r0 = r.trim();
    if (!allowed.has(r0)) fail("`unicodeRange` carries " + r0 + ", outside the Arabic ranges the file was subset to");
  }
  const file = path.join(FONT_DIR, face.file);
  if (!fs.existsSync(file)) fail(face.file + " is missing — re-subset it (the command is in fonts.json)");
  const buf = fs.readFileSync(file);
  if (buf.subarray(0, 4).toString("latin1") !== "wOF2") fail(face.file + " is not a woff2 payload");
  const sum = crypto.createHash("sha256").update(buf).digest("hex");
  if (sum !== face.sha256) fail(face.file + " changed (recorded " + face.sha256.slice(0, 12) + "…, found " + sum.slice(0, 12) + "…) — re-subset and re-record, never overwrite");
  if (buf.length > face.budgetBytes) fail(face.file + " is " + buf.length + " B, over its " + face.budgetBytes + " B budget");
  if (!face.license || !fs.existsSync(path.join(FONT_DIR, face.licenseFile))) fail("an OFL face must ship its licence file beside it");
  shipped.push({ family: face.family, weight: face.weight, range: face.unicodeRange,
    adjust: face.sizeAdjust || 0, b64: buf.toString("base64"), display: !!face.display });
}
const fontBytes = shipped.reduce((n, f) => n + Math.ceil(f.b64.length * 3 / 4), 0);
if (fontBytes > FONTS.budgetBytes) {
  console.error("FAIL: fonts — " + fontBytes + " B inlined, over the " + FONTS.budgetBytes + " B budget for the single file");
  process.exit(1);
}
const FONT_FACE_CSS = shipped.map((f) =>
  "@font-face{font-family:\"" + f.family + "\";font-style:normal;font-weight:" + f.weight + ";" +
  (f.adjust ? "size-adjust:" + (f.adjust * 100).toFixed(1) + "%;" : "") +
  "src:url(data:font/woff2;base64," + f.b64 + ") format(\"woff2\");" +
  "unicode-range:" + f.range + ";font-display:block}").join("\n");
/* The poster's display roles ask for one family in front of the brand stack, and
   only faces marked `display` may answer there. The ranges, not the components,
   do the routing — which is why no screen, no rule and no component has to know
   which script it is showing: the same `--brand-font` chain serves both. */
const FONT_DISPLAY_STACK = shipped.filter((f) => f.display).map((f) => '"' + f.family + '"')
  .concat([brandStack]).join(", ");

const SHELL_TOKENS = {
  "__BRAND_TITLE__": BRAND.name.en,
  "__BRAND_DESCRIPTION__": BRAND.description,
  "__BRAND_THEME_COLOR__": BRAND.browserThemeColor.light,
  "__BRAND_THEME_DARK__": BRAND.browserThemeColor.dark,
  "__BRAND_FAVICON__": faviconDataUri,
  "__BRAND_FONT__": BRAND.font.family,
  "__BRAND_FONT_WEIGHT__": String(BRAND.font.weight),
  "__FONT_FACES__": FONT_FACE_CSS,
  "__FONT_DISPLAY_STACK__": FONT_DISPLAY_STACK,
};

let shell = fs.readFileSync(path.join(SRC, "styles", "shell.html"), "utf8");
for (const [token, value] of Object.entries(SHELL_TOKENS)) {
  shell = shell.split(token).join(value);
}
if (/__BRAND_[A-Z_]+__|__FONT_[A-Z_]+__/.test(shell)) {
  console.error("FAIL: unresolved brand or font token in shell.html");
  process.exit(1);
}

/* Order matters: data → components → api → screens → shell wiring. */
const PARTS = [
  "data/content.js",
  "data/journey.js",   /* the landing's decorative geometry (provenance in the file) */
  "lib/qr.js",         /* a real QR encoder — an install code must actually scan */
  "lib/components.js",
  "lib/search.js",
  "lib/api.js",
  "lib/map.js",
  "lib/motion.js",     /* the landing's scroll machinery (reveal, weight, journey) */
  "lib/pagefx.js",     /* the page transition — one curtain, armed by render() */
  "lib/landing-parts.js",/* the poster's shapes: masthead, band, journey, slab, chapters */
  "screens/planner.js",	/* Path A: Uber-style planner search (DEC-206) */			/* RouteMap — the one data-bound map primitive (R21) */
  "screens/landing.js",
  "screens/auth.js",
  "screens/admin.js",
  "screens/rider.js",
  "screens/wallet.js",
  "screens/driver.js",
  "screens/staff.js",
  "shell/app.js"
];

/* Fuse.js (Apache-2.0, vendored at BUILD time — never a CDN) is inlined
   before the app code so the classic-script bundle gets the `Fuse` global.
   The UMD is wrapped in an IIFE: its top-level `var e,t` must not collide
   with the app's own `const t` (the translator) in the shared classic-script
   scope. `this` is passed through so the UMD still attaches `Fuse` to the
   window/global. lib/search.js owns the index and the Arabic/English
   normalization (§0.3: one search implementation). */
const FUSE_SRC =
  "(function(){\n" +
  fs.readFileSync(path.join(__dirname, "node_modules", "fuse.js", "dist", "fuse.min.js"), "utf8") +
  "\n}).call(typeof window !== 'undefined' ? window : this);";

const PLATFORM_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "platform", "src", "index.js"),
  "utf8"
);
const OUTBOX_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "platform", "src", "outbox.js"),
  "utf8"
);
const TRACK_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "platform", "src", "track.js"),
  "utf8"
);
const ALARM_SRC = fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "platform", "src", "alarm.js"),
  "utf8"
);

const js = "const BRAND = " + JSON.stringify(BRAND) + ";\n\n" + FUSE_SRC + "\n\n" +
  PLATFORM_SRC + "\n\n" + OUTBOX_SRC + "\n\n" + TRACK_SRC + "\n\n" + ALARM_SRC + "\n\n" +
  PARTS.map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n\n");

/* One-color line illustrations. The pack uses fill="black" / fill="none"
   only — we promote black to currentColor so the parent token sets ink
   (page text, or white on a colour slide). No palette flattening. */
const ILLU_DIR  = path.join(__dirname, "assets", "undraw");
const ILLU_KEYS  = ["hero","drivehero","seat","price","save","book","track","route","board","way","hours","secure","boardfast","noroute"];
const stickers = {};
for (const k of ILLU_KEYS) {
  let svg = fs.readFileSync(path.join(ILLU_DIR, k + ".svg"), "utf8");
  if (svg.includes("</script")) { console.error("FAIL: illustration contains </script"); process.exit(1); }
  svg = svg.replace(/>\s+</g, "><");
  svg = svg.replace(/\s+/g, " ").trim();
  svg = svg.replace(/width="[^"]*" height="[^"]*"/, "");
  svg = svg.replace(/fill=(["'])black\1/gi, "fill=\"currentColor\"");
  svg = svg.replace(/stroke=(["'])black\1/gi, "stroke=\"currentColor\"");
  svg = svg.replace(/fill=(["'])#0{3,8}\1/gi, "fill=\"currentColor\"");
  stickers[k] = svg;
}
const stickerJS = "\n\n/* Illustrations (one-color pack, currentColor → tokens) */\nconst STICKERS = " +
  JSON.stringify(stickers) + ";\n";

if (js.includes("</script")) { console.error("FAIL: a source file contains </script"); process.exit(1); }

const MARK = '<div id="root"></div>';
if (!shell.includes(MARK)) { console.error("FAIL: injection point not found"); process.exit(1); }

/* A replacement FUNCTION, not a string: the injected code contains `$&`
   (Fuse.js's minified bitap uses `$` as a variable). In a string replacement
   `$&` means "the matched text" and would corrupt the bundle with
   "<div id=\"root\"></div>" spliced into the middle of the library. */
const html = shell.replace(MARK, () => MARK + "\n<script>\n" + js + stickerJS + "\n</script>");
/* A bundle that does not parse is a blank page, and every guard in the suite would
   then report an absence rather than a fault. The classic script has no top-level
   await, so `new Function` is a complete syntax check of what the browser will run —
   and it is done here, before anything is written. */
try { new Function(js); }
catch (e) {
  console.error("FAIL: the bundle does not parse — " + e.message);
  process.exit(1);
}
fs.writeFileSync(OUT, html);
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), html);
console.log(`fonts: ${shipped.length} inlined (${Math.round(fontBytes/1024)} KB), ` +
  `${shipped.filter((f) => f.display).length} display face(s), ` +
  (held.length ? `${held.length} held as an option: ${held.join(", ")}` : "no unused faces") +
  ` — ${Math.round(html.length/1024)} KB total`);
console.log(`built ${path.relative(process.cwd(), OUT)} — ${(html.length/1024).toFixed(1)} KB, ${PARTS.length} modules`);
