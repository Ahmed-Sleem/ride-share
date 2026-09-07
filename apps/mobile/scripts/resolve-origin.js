"use strict";
/* One rule for "which server does this build talk to", in one file, so a build can never
   silently ship without an address.
   This exists because of a shipped defect (G-110): the origin was resolved from environment
   variables that only exist on the Railway runtime, and the CI job that builds the installer
   has none of them, so the boot page was baked with an empty origin. Its code then took the
   `if (!origin)` branch straight to the offline card - "Check your internet connection" on a
   connected phone, with a Retry that re-ran the same no-op. Nothing was thrown, because "no
   origin" used to be a legal answer. It is not any more: this module returns an https origin
   or fails the build.
   Precedence - a deployment always wins over the default, and the default always wins over
   nothing:
     MOBILE_PUBLIC_ORIGIN > PUBLIC_MOBILE_ORIGIN > MOBILE_WEB_ORIGIN
     > RAILWAY_PUBLIC_DOMAIN > packages/brand/brand.json app.origin
   http://localhost[:port] is accepted for development, because Capacitor serves the app from
   a local scheme; nothing else may be http, since server.cleartext is false and a cleartext
   OTA endpoint would be dropped by the WebView anyway. */
const fs = require("node:fs");
const path = require("node:path");

const BRAND_FILE = path.join(__dirname, "..", "..", "..", "packages", "brand", "brand.json");

function brandOrigin() {
  const brand = JSON.parse(fs.readFileSync(BRAND_FILE, "utf8"));
  const origin = (brand.app && brand.app.origin) || "";
  if (!origin) {
    throw new Error("packages/brand/brand.json must carry app.origin - it is the only place " +
      "the product's own address is written down");
  }
  return origin;
}

function normalise(value, label) {
  const who = label || "origin";
  let raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  /* Parse first, then decide. Trimming slashes off the front door is what let the string
     "https://" survive as the origin "https://https:" - a bare scheme is not a host, and a
     build that quietly accepted it would produce an installer that cannot reach anything. */
  /* Case-insensitive on purpose: `HTTPS://Host.Test` is a legal spelling of the same origin, and
     prepending a scheme to it used to produce the nonsense host "https:" below. */
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(who + " is not a URL: " + JSON.stringify(value));
  }
  if (!parsed.hostname) throw new Error(who + " has no host: " + JSON.stringify(value));
  /* Only an origin. The boot page builds `origin + "/v1/mobile/bundle"`, so a base path here
     would be silently doubled and every request would 404 - a mis-baked install all over again. */
  const rest = parsed.pathname + parsed.search + parsed.hash;
  if (rest !== "" && rest !== "/") {
    throw new Error(who + " must be an origin with no path, query or fragment, got " + JSON.stringify(value));
  }
  if (parsed.protocol === "http:" && parsed.hostname !== "localhost") {
    throw new Error(who + " must be https (http://localhost is allowed for development), got " + JSON.stringify(value));
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(who + " must be an http(s) origin, got " + JSON.stringify(value));
  }
  return parsed.origin;
}

function resolveOrigin(env = process.env) {
  for (const key of ["MOBILE_PUBLIC_ORIGIN", "PUBLIC_MOBILE_ORIGIN", "MOBILE_WEB_ORIGIN"]) {
    const hit = normalise(env[key], key);
    if (hit) return hit;
  }
  const railway = normalise(env.RAILWAY_PUBLIC_DOMAIN, "RAILWAY_PUBLIC_DOMAIN");
  if (railway) return railway;
  return normalise(brandOrigin(), "brand app.origin");
}

module.exports = { resolveOrigin, brandOrigin, normalise };
