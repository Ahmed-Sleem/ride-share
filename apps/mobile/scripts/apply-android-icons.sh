#!/usr/bin/env bash
# Paint launcher icons from packages/brand (same source as the website favicon).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BRAND="$ROOT/packages/brand/brand.json"
RES="$ROOT/apps/mobile/android/app/src/main/res"
[ -f "$BRAND" ] || { echo "FAIL: missing $BRAND"; exit 1; }
[ -d "$RES" ] || { echo "skip icons: android/ not generated yet"; exit 0; }

SVG_OUT="${TMPDIR:-/tmp}/rs-launcher.svg"
export BRAND SVG_OUT
node -e '
const fs=require("fs");
const brand=JSON.parse(fs.readFileSync(process.env.BRAND,"utf8"));
const logo=brand.logo||{};
const [c1,c2]=logo.gradient||["#6C63FF","#5A4FD9"];
const vb=logo.viewBox||"0 0 24 24";
const d=logo.path||"";
fs.writeFileSync(process.env.SVG_OUT, `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="24" height="24" rx="5" fill="url(#g)"/>
  <g fill="#FFFFFF" transform="translate(2.2 2.2) scale(0.816)"><path fill-rule="evenodd" d="${d}"/></g>
</svg>`);
'

raster () {
  local px="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if command -v rsvg-convert >/dev/null 2>&1; then
    rsvg-convert -w "$px" -h "$px" "$SVG_OUT" -o "$dest"
  elif command -v convert >/dev/null 2>&1; then
    convert -background none -resize "${px}x${px}" "$SVG_OUT" "$dest"
  else
    return 1
  fi
}

if raster 192 "$RES/mipmap-xxxhdpi/ic_launcher.png"; then
  raster 144 "$RES/mipmap-xxhdpi/ic_launcher.png" || true
  raster 96 "$RES/mipmap-xhdpi/ic_launcher.png" || true
  raster 72 "$RES/mipmap-hdpi/ic_launcher.png" || true
  raster 48 "$RES/mipmap-mdpi/ic_launcher.png" || true
  for d in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
    [ -f "$RES/$d/ic_launcher.png" ] && cp "$RES/$d/ic_launcher.png" "$RES/$d/ic_launcher_round.png" || true
  done
  echo "android launcher icons refreshed from brand.json"
else
  mkdir -p "$RES/drawable"
  cp "$SVG_OUT" "$RES/drawable/ic_launcher_brand.svg"
  echo "no rsvg/convert — left SVG at drawable/ic_launcher_brand.svg"
fi
