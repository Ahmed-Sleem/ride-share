/* ══════════════════════════════════════════════════════════════════════
   Module boundaries (§0.3 layer 3, BUILD_PLAN P0.9). A script, not a habit:
   boundaries erode invisibly — once a service imports another module's
   repository directly, extracting that module stops being a refactor and
   becomes a rewrite. Rules:

     1. a module is imported only through its `contracts/` — reaching into
        another module's domain/, application/, infra/ or api/ fails;
     2. `domain/` never imports `infra/` (business rules must not know a
        database exists);
     3. no cycles anywhere — if two modules need each other, a third concept
        is missing;
     4. `packages/shared-*` never imports from `apps/*`.

   Tooling note (§16 verify-before-adopting): implemented as a dependency-free
   Node script rather than dependency-cruiser — the rules are enforced from
   import paths, which is exactly the information dependency-cruiser would
   mine, without adding a toolchain dependency. The matching module is the
   documented first extraction candidate (DEC-167): its seam (contracts-only)
   is what rules 1–3 protect.
   ══════════════════════════════════════════════════════════════════════ */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, relative, normalize } from 'node:path';

const ROOT = normalize(new URL('..', import.meta.url).pathname);
const SCOPES = [
  join(ROOT, 'apps/api/src'),
  join(ROOT, 'packages'),
];

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { if (!entry.startsWith('.')) walk(p, out); }
    else if (/\.(ts|js)$/.test(entry)) out.push(p);
  }
  return out;
}
const exists = (p) => { try { statSync(p); return true; } catch { return false; } };

function scopeOf(file) {
  const rel = relative(ROOT, file);
  const m = rel.match(/^apps\/api\/src\/modules\/([^/]+)\//);
  if (m) return { kind: 'module', name: m[1], path: rel };
  const p = rel.match(/^packages\/([^/]+)\//);
  if (p) return { kind: 'package', name: p[1], path: rel };
  return { kind: 'core', name: 'api-core', path: rel };
}

// resolve a relative import to a repo-relative path string
function resolveImport(fromFile, spec) {
  const abs = normalize(join(dirname(fromFile), spec));
  return relative(ROOT, abs);
}

const files = SCOPES.flatMap((d) => walk(d));
let examined = 0, hits = 0;
const fail = (msg) => { console.log(`  FAIL ${msg}`); hits++; };
const edges = new Map(); // module -> Set(module)

for (const file of files) {
  examined++;
  const src = readFileSync(file, 'utf8');
  const from = scopeOf(file);
  const importRe = /(?:import\s*[^'"]*from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    const spec = m[1] || m[2] || m[3];
    if (!spec.startsWith('.')) continue; // external deps are out of scope
    const targetRel = resolveImport(file, spec);
    const target = scopeOf(join(ROOT, targetRel));

    // rule 4: packages may not import apps
    if (from.kind === 'package' && targetRel.startsWith('apps/')) {
      fail(`${from.path} → ${targetRel}: shared package imports an app`);
    }

    if (from.kind === 'module' && target.kind === 'module') {
      // rule 3 bookkeeping (module-level graph)
      if (from.name !== target.name) {
        if (!edges.has(from.name)) edges.set(from.name, new Set());
        edges.get(from.name).add(target.name);
      }
      // rule 1: cross-module imports only through contracts/
      if (from.name !== target.name) {
        const insideContracts = /^apps\/api\/src\/modules\/[^/]+\/contracts\//.test(targetRel);
        if (!insideContracts) {
          fail(`${from.path} → ${targetRel}: cross-module import not through contracts/`);
        }
      }
      // rule 2: domain/ never imports infra/
      if (/\/domain\//.test(from.path) && /\/infra\//.test(targetRel)) {
        fail(`${from.path} → ${targetRel}: domain imports infra (business rules must not know the db)`);
      }
    }
  }
}

// rule 3: cycle detection (DFS with colours)
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map();
const cycleNodes = new Set();
function visit(n, stack) {
  color.set(n, GRAY);
  stack.push(n);
  for (const next of edges.get(n) ?? []) {
    if (cycleNodes.has(next)) continue;
    const c = color.get(next) ?? WHITE;
    if (c === GRAY) {
      // record the cycle slice
      const i = stack.indexOf(next);
      for (let k = i; k < stack.length; k++) cycleNodes.add(stack[k]);
      cycleNodes.add(next);
    } else if (c === WHITE) {
      visit(next, stack);
    }
  }
  stack.pop();
  color.set(n, BLACK);
}
for (const n of edges.keys()) if ((color.get(n) ?? WHITE) === WHITE) visit(n, []);
if (cycleNodes.size > 0) {
  fail(`module cycle detected: ${[...cycleNodes].sort().join(' → ')}`);
}

console.log(`\nboundary check: examined ${examined} files, ${hits} hit(s)`);
process.exit(hits === 0 ? 0 : 1);
