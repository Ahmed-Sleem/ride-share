#!/usr/bin/env node
/* Assembles app/src into the single deliverable HTML file.
   The shell (styles + document) and the JS modules each have one home.
   Never hand-edit the output: it is regenerated on every build. */
const fs = require("fs"), path = require("path");

const SRC   = path.join(__dirname, "src");
const OUT   = path.join(__dirname, "dist-preview.html");
const shell = fs.readFileSync(path.join(SRC, "styles", "shell.html"), "utf8");

/* Order matters: data → components → api → screens → shell wiring. */
const PARTS = [
  "data/content.js",
  "lib/components.js",
  "lib/api.js",
  "screens/landing.js",
  "screens/auth.js",
  "screens/admin.js",
  "screens/rider.js",
  "screens/driver.js",
  "screens/staff.js",
  "shell/app.js"
];

const js = PARTS.map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n\n");

/* Stickers — the Streamline "Manila" doodles, recolored at build time from
   their two source colours (#001434 navy → --sticker-ink, #3D9CFB blue →
   --sticker-accent) so they follow the theme and each slide's palette tint.
   They live OUTSIDE src/ (assets/) so the no-hardcoded-colour check ignores
   the source files; the injected strings contain only CSS variables. */
const STICKER_DIR = path.join(__dirname, "assets", "stickers");
const STICKER_KEYS = ["price","save","book","track","route","seat","board"];
const stickers = {};
for (const k of STICKER_KEYS) {
  let svg = fs.readFileSync(path.join(STICKER_DIR, k + ".svg"), "utf8");
  svg = svg.replace(/>\s+</g, "><");          // minify
  svg = svg.replace(/\s+/g, " ").trim();
  svg = svg.replace(/width="[^"]*" height="[^"]*"/, "");
  svg = svg.replace(/fill="none"/, "");       // presentation fill-none is the default for paths
  svg = svg.replace(/fill="#001434"/g, 'style="fill:var(--sticker-ink)"');
  svg = svg.replace(/fill="#3D9CFB"/g, 'style="fill:var(--sticker-accent)"');
  stickers[k] = svg;
}
const stickerJS = "\n\n/* Stickers (Streamline Manila, recolored to tokens) */\nconst STICKERS = " +
  JSON.stringify(stickers) + ";\n";

if (js.includes("</script")) { console.error("FAIL: a source file contains </script"); process.exit(1); }

const MARK = '<div id="root"></div>';
if (!shell.includes(MARK)) { console.error("FAIL: injection point not found"); process.exit(1); }

const html = shell.replace(MARK, MARK + "\n<script>\n" + js + stickerJS + "\n</script>");
fs.writeFileSync(OUT, html);
// Container artifact: the Docker runner copies only apps/web/dist/.
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), html);
console.log(`built ${path.relative(process.cwd(), OUT)} — ${(html.length/1024).toFixed(1)} KB, ${PARTS.length} modules`);
