#!/usr/bin/env node
/* G-124 — the system bars, painted from the brand instead of from Android's default.

   What is actually wrong, measured rather than assumed: the activity paints a system status-bar
   background that has nothing to do with the page under it. On a light cold start the two agree by
   accident; on a dark-mode start the app opens with a white band carrying the page's own title row.
   `apps/web/src/styles/shell.html` already reserves `--safe-t: env(safe-area-inset-top, 0px)` for
   the head, so the *layout* is not the bug — the *colour* is.

   Why this is a binary concern and not a CSS one: no style rule can reach a window attribute, and the
   `plugins.StatusBar` block that looks like the fix is dead weight — `@capacitor/status-bar` is not a
   dependency of this app (zero hits in pnpm-lock.yaml), so the block configures a plugin that is never
   loaded (G-126). Ionic's own docs also say the StatusBar knobs are no-ops on Android 15+ for a target
   that high, and the generated binary is built with targetSdk 36. So there is no JS call to make; the
   theme has to say it.

   What stays in the web layer, deliberately: every pixel of the interface, the head's height, its
   spacing and its type. This script writes colours only, so a GUI change still travels over the air and
   never waits for an installer (the owner's architecture, unchanged).

   It mirrors `apply-android-night-splash.js`: run after `cap add android`, read the real generated
   files, write both the day and the night resource, fail loudly if the template no longer matches —
   a theme item that lands nowhere is an invisible build flag, and invisible flags are how G-115 and
   G-122 hid. Colours come from packages/brand/brand.json like everything else, so a hex is never
   typed twice. */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..", "..");
const BRAND = JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "brand", "brand.json"), "utf8"));
const light = (BRAND.palette && BRAND.palette.light) || {};
const dark = (BRAND.palette && BRAND.palette.dark) || {};
/* The bar is not painted a colour, it is made transparent, so the page underneath is what a person
   sees. `windowLightStatusBar` is the only other fact the OS needs: dark icons over light paper,
   light icons over ink. A hard #FFFFFF / #000000 would be a second palette, and palettes live in
   brand.json. */
const TRANSPARENT = "#00000000";
const STYLE = "AppTheme.NoActionBarLaunch";

function needPaper(which, v) {
  if (!v || !v.paper) throw new Error(`brand.json has no palette.${which}.paper — the system bars are painted from it`);
  return v.paper;
}
needPaper("light", light);
needPaper("dark", dark);

const res = path.join(ROOT, "apps", "mobile", "android", "app", "src", "main", "res");
const dayFile = path.join(res, "values", "styles.xml");
const nightFile = path.join(res, "values-night", "styles.xml");
if (!fs.existsSync(dayFile)) {
  throw new Error(`no generated Android theme at ${path.relative(ROOT, dayFile)} — run it after \`npx cap add android\``);
}

/* The items, in the order we insert them, so the two files differ only in the icon colour and a
   diff stays readable. `android:enforceStatusBarContrast` is what Android 15+ uses to stamp a
   scrim over a transparent bar; turning it off is the difference between "the page owns the bar"
   and "the OS paints a grey band we cannot reach". Declared with the others, it is one list. */
function items(lightIcons) {
  const icons = lightIcons ? "true" : "false";
  return [
    `<item name="android:statusBarColor">${TRANSPARENT}</item>`,
    `<item name="android:navigationBarColor">${TRANSPARENT}</item>`,
    `<item name="android:windowLightStatusBar">${icons}</item>`,
    `<item name="android:windowLightNavigationBar">${icons}</item>`,
    `<item name="android:enforceStatusBarContrast">false</item>`,
    `<item name="android:enforceNavigationBarContrast">false</item>`,
  ];
}

/* Read the style block, rebuild its item list, write it back. Anchored on the style name, not on a
   line number: `cap add` owns the file, `apply-android-night-splash.js` has already written into
   values-night, and a patch that assumes an offset is a patch that lands in the wrong style. */
function patchTheme(xml, lightIcons, where) {
  const re = new RegExp(`<style name="${STYLE}"[\\s\\S]*?</style>`);
  const m = xml.match(re);
  if (!m) {
    throw new Error(
      `${where}: no <style name="${STYLE}"> to attach the system-bar items to — the Capacitor template ` +
      "changed and this script must be re-read against it (the activity is themed by that style)"
    );
  }
  const block = m[0];
  const add = items(lightIcons).filter((l) => !block.includes(l));
  if (!add.length) return { xml, changed: false }; // idempotent: a re-run writes no new bytes
  /* Split-and-rejoin rather than a chained regex splice: several items added to one block with a
     /[ \t]*<\/style>/ replacement each eats the newline the previous one wrote, and the file fills
     with blank lines. Insert once, in order. */
  const lines = block.split("\n");
  const at = lines.length - 1 - lines.slice().reverse().findIndex((l) => l.includes("</style>"));
  if (at < 0 || at >= lines.length) {
    throw new Error(`${where}: <style name="${STYLE}"> has no closing tag on its own line — refusing to write a half-parsed theme`);
  }
  lines.splice(at, 0, ...add.map((l) => "        " + l));
  return { xml: xml.replace(block, lines.join("\n")), changed: true };
}

const written = [];

const dayText = fs.readFileSync(dayFile, "utf8");
const day = patchTheme(dayText, true, "values/styles.xml");
if (day.changed) {
  fs.writeFileSync(dayFile, day.xml);
  written.push(path.relative(ROOT, dayFile));
}

/* values-night may not exist yet on a project that was never prepped, and the night splash step
   writes it just before this one in prepare-android.sh. Creating it here is not a second source of
   truth: the only thing added is the same theme name with inverted icon colour, and the night splash's
   own resources are left exactly as it wrote them. */
let nightBase = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n';
if (fs.existsSync(nightFile)) nightBase = fs.readFileSync(nightFile, "utf8");
else {
  nightBase = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Generated in part by scripts/apply-android-system-bars.js. The night counterpart of the day
         theme: same style name so the activity finds it, light icons over the brand's ink paper. -->
    <style name="${STYLE}" parent="Theme.SplashScreen">
        <item name="android:windowLightStatusBar">false</item>
    </style>
</resources>
`;
}
const night = patchTheme(nightBase, false, "values-night/styles.xml");
if (night.changed || !fs.existsSync(nightFile)) {
  fs.mkdirSync(path.dirname(nightFile), { recursive: true });
  fs.writeFileSync(nightFile, night.xml);
  if (!written.includes(path.relative(ROOT, nightFile))) written.push(path.relative(ROOT, nightFile));
}

/* Loud about what it did: a build log that says nothing is how a no-op passes for a fix. */
console.log(
  written.length
    ? `system bars: ${written.join(", ")} — transparent status/navigation bars, icons matched to ${light.paper} (day) / ${dark.paper} (night), contrast enforcement off`
    : "system bars already current"
);
