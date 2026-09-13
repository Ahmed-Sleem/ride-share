# Task 4 — measured candidate gaps (scratch, round 21)

Written from the code, not from memory. My round-20 note said "14 zero-caller `api.js`
methods ⇒ the driver duty loop has no UI". **That was wrong and I re-measured it.**

## What is actually true

`apps/web/src/lib/api.js` exposes 85 members; 33 match the plain
`name: (args) => API.request("METHOD", \`/path\`)` shape. Of those 33:

- **9 have no caller anywhere in `apps/web/src`** (grep on the identifier).
- **6 of those 9 are duplicates, not gaps** — the same path is called directly by the
  driver screen through the offline outbox helper:
  `startJourney` `arriveStop` `completeJourney` `abortJourney` `journeyPosition`
  `journeyPositionBatch` → `queueOrSend(kind, "POST", \`/journeys/${jid}/…\`)`
  (`apps/web/src/screens/driver.js:203-299`). So the **duty loop exists** and is durable.
- **3 have no UI call at all** (the server already implements each of them):

| client wrapper | server route (already there) | who needs it |
|---|---|---|
| `releaseJourney(id)` | `POST journeys/:id/release` (`journeys/api/…controller.ts:36`) | driver — give back a claimed journey before departure |
| `reorderRoute(id, orderedStopIds)` | `POST routes/:id/reorder` (`routes/api/routes.controller.ts:75`, gapless + exact-permutation validated) | ops — drag stops into order |
| `retireStop(id)` | `POST stops/:id/retire` (`geo/api/stops.controller.ts:109`) | ops — retire a stop |

`cancelBooking`, `addVehicle`, `scanBooking`, `changePassword`, `myNotifications` are
**not** in the zero-caller set (verified: `rider.js:551` calls `API.cancelBooking`),
except `myNotifications` which is Task 3 and in flight with the developer.

## The real two-layer smell

`queueOrSend` bypasses `API.request` and hits paths by string, so `api.js` is not the
single list of what the client can do. That is why a count-based claim mislead me. Any
task here should make one layer call the other, and keep the outbox semantics.

## Options for the owner (pick one, all are `apps/web` + one mobile file, no api change)

1. **Close the 3 endpoints** (~small): driver release action on the duty card; ops stop
   retire + route reorder in the routes tool. Each bilingual, each with a break case.
2. **Unify the request layers** (medium, no new feature, but removes a whole class of
   "the client cannot do X" mistakes).
3. **Device pass first** (D-8.27, 23 boxes) — no code until the phone list says ✗.
4. Legal rows (G-017, G-041) — owner's decision, not mine or the developer's.

## Rules any chosen task obeys

- never break existing behaviour; guards move in the same commit with the reason;
- `version.code` bump **and** one `apps/mobile/**` file in the same push (D-8.22 / MISSED-BUILD);
- every source edit re-runs `node apps/web/build.js` before tests read `dist-preview.html`;
- new guards must be seen to fail (`BREAKS_ONLY`), and the mutation must be seen to mutate;
- `bash apps/web/verify.sh` without `RS_SKIP_BREAKS`, plus `verify-repo.sh`;
- docs in the same commit (CHANGELOG / AUDIT_AND_TODO row / checklist / roadmap).
