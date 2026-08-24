const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");

const HERE = path.join(__dirname, "..");
const htmlPath = path.join(HERE, "dist", "www", "index.html");
if (!fs.existsSync(htmlPath)) {
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<!doctype html><title>fixture</title>");
}

const { handler } = require("../server.js");

function request(url) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      handler(req, res).catch(reject);
    });
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      http.get({ hostname: "127.0.0.1", port, path: url }, (r) => {
        const chunks = [];
        r.on("data", (c) => chunks.push(c));
        r.on("end", () => {
          srv.close();
          resolve({ status: r.statusCode, body: Buffer.concat(chunks).toString("utf8") });
        });
      }).on("error", reject);
    });
  });
}

test("healthz names the mobile service", async () => {
  const r = await request("/healthz");
  assert.equal(r.status, 200);
  const j = JSON.parse(r.body);
  assert.equal(j.ok, true);
  assert.equal(j.service, "mobile");
  assert.equal(j.wrap, "capacitor");
});

test("root serves the wrapped HTML", async () => {
  const r = await request("/");
  assert.equal(r.status, 200);
  assert.match(r.body, /<!doctype html|<html/i);
});

test("unconfigured /v1 is an honest 503", async () => {
  const r = await request("/v1/healthz");
  assert.equal(r.status, 503);
  assert.equal(JSON.parse(r.body).code, "API_NOT_CONFIGURED");
});
