/* Boot the compiled API. If Railway/Railpack skipped the image build,
   compile once so `node dist/main.js` is never a crash-loop. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const main = path.join(root, "dist", "main.js");

function compile() {
  const tscJs = path.join(root, "node_modules", "typescript", "bin", "tsc");
  const workspaceTsc = path.join(root, "..", "..", "node_modules", "typescript", "bin", "tsc");
  const bin = fs.existsSync(tscJs) ? tscJs : (fs.existsSync(workspaceTsc) ? workspaceTsc : null);
  if (!bin) {
    console.error("api: dist/main.js missing and typescript is not installed — cannot start");
    process.exit(1);
  }
  console.error("api: compiling (dist/main.js was not in the image)");
  const r = spawnSync(process.execPath, [bin, "-p", "tsconfig.json"], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

if (!fs.existsSync(main)) compile();
if (!fs.existsSync(main)) {
  console.error("api: compile finished but dist/main.js is still missing");
  process.exit(1);
}
require(main);
