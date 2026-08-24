/* One Railpack start for every service that is NOT on Dockerfile.node.
   RAILWAY_SERVICE_NAME is set by the platform. api/web should stay on
   the Docker image; if they land on Railpack anyway, compile+start. */
const { spawnSync } = require("child_process");
const name = String(process.env.RAILWAY_SERVICE_NAME || process.env.PROJECT || "").toLowerCase();

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  process.exit(r.status === null ? 1 : r.status);
}

if (name.includes("api")) {
  run("pnpm", ["--filter", "@ride-share/api", "start"]);
}
if (name.includes("web")) {
  run("pnpm", ["--filter", "@ride-share/web", "start"]);
}
run(process.execPath, ["apps/mobile/server.js"]);
