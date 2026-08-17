#!/usr/bin/env node
/* Assembles app/src into the single deliverable HTML file.
   The shell (styles + document) and the JS modules each have one home.
   Never hand-edit the output: it is regenerated on every build. */
const fs = require("fs"), path = require("path");

const SRC   = path.join(__dirname, "src");
const OUT   = path.join(__dirname, "dist-preview.html");
const shell = fs.readFileSync(path.join(SRC, "styles", "shell.html"), "utf8");

/* Order matters: data → components → screens → shell wiring. */
const PARTS = [
  "data/content.js",
  "lib/components.js",
  "screens/rider.js",
  "screens/driver.js",
  "screens/staff.js",
  "shell/app.js"
];

const js = PARTS.map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join("\n\n");

if (js.includes("</script")) { console.error("FAIL: a source file contains </script"); process.exit(1); }

const MARK = '<div id="root"></div>';
if (!shell.includes(MARK)) { console.error("FAIL: injection point not found"); process.exit(1); }

const html = shell.replace(MARK, MARK + "\n<script>\n" + js + "\n</script>");
fs.writeFileSync(OUT, html);
// Container artifact: the Docker runner copies only apps/web/dist/.
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "index.html"), html);
console.log(`built ${path.relative(process.cwd(), OUT)} — ${(html.length/1024).toFixed(1)} KB, ${PARTS.length} modules`);
