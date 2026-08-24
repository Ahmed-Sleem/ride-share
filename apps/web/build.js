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
const fs = require("fs"), path = require("path");

const SRC   = path.join(__dirname, "src");
const OUT   = path.join(__dirname, "dist-preview.html");
const BRAND = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "..", "packages", "brand", "brand.json"), "utf8"));

/* favicon — a data URI built from the brand logo + gradient. */
const faviconSvg =
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${BRAND.logo.viewBox}'>` +
  `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
  `<stop offset='0' stop-color='${BRAND.logo.gradient[0]}'/>` +
  `<stop offset='1' stop-color='${BRAND.logo.gradient[1]}'/>` +
  `</linearGradient></defs>` +
  `<path fill='url(#g)' fill-rule='evenodd' d='${BRAND.logo.path}'/></svg>`;
const faviconDataUri = "data:image/svg+xml," + encodeURIComponent(faviconSvg);

const SHELL_TOKENS = {
  "__BRAND_TITLE__": BRAND.name.en,
  "__BRAND_DESCRIPTION__": BRAND.description,
  "__BRAND_THEME_COLOR__": BRAND.logo.gradient[0],
  "__BRAND_THEME_DARK__": BRAND.browserThemeColor.dark,
  "__BRAND_FAVICON__": faviconDataUri,
  "__BRAND_FONT__": BRAND.font.family,
  "__BRAND_FONT_WEIGHT__": String(BRAND.font.weight),
};

let shell = fs.readFileSync(path.join(SRC, "styles", "shell.html"), "utf8");
for (const [token, value] of Object.entries(SHELL_TOKENS)) {
  shell = shell.split(token).join(value);
}
if (/__BRAND_[A-Z_]+__/.test(shell)) {
  console.error("FAIL: unresolved brand token in shell.html");
  process.exit(1);
}

/* Order matters: data → components → api → screens → shell wiring. */
const PARTS = [
  "data/content.js",
  "lib/components.js",
  "lib/search.js",
  "lib/api.js",
  "lib/map.js",
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

const js = "const BRAND = " + JSON.stringify(BRAND) + ";\n\n" + FUSE_SRC + "\n\n" +
  PLATFORM_SRC + "\n\n" + OUTBOX_SRC + "\n\n" + TRACK_SRC + "\n\n" +
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
fs.writeFileSync(OUT, html);
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), html);
console.log(`built ${path.relative(process.cwd(), OUT)} — ${(html.length/1024).toFixed(1)} KB, ${PARTS.length} modules`);
