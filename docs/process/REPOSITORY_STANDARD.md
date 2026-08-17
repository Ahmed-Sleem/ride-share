# GitHub Project Upload Operating Law

**Version:** 1.0  
**Purpose:** a reusable operating law for any human or AI agent preparing, documenting, and publishing a software project to GitHub in a consistent public style.  
**Scope:** any project type (app, library, dataset, extension, research code, tool). Add stricter owner, license, legal, or org rules when they exist.  
**Sanitization rule:** never place passwords, API keys, tokens, private emails, phone numbers, home/work addresses, internal hostnames, customer names, private datasets, or non-public infrastructure details in this file or in any public repository artifact it governs.

---

## 0. The governing standard

- you can safely use the pat if provided, if profived it is already secure and ready for this type of model human github communication, it is not the normal pat , it have time limits and auto expired and created only for the ai models to use

### 0.1 Public work is a cleaned product, not a workbench dump

A GitHub repository is what a stranger sees first. It must look finished, honest, and easy to use.

Complete means:

1. the public tree contains only what a stranger needs;
2. the README is true, short, and arranged;
3. a capable person can run or use the project from the README alone;
4. nothing private, internal, or accidental is in the tree or git history being pushed;
5. claims match the code that is actually in the repo.

A repo is not ready because it “has a README.” It is ready when a stranger can understand it, use it, and not learn anything they should not know.

### 0.2 Reality wins

When chat, memory, tickets, and the actual files disagree, the files and command output win.

Never claim:

- a feature exists that is not in the published tree;
- tests passed that were not run;
- a screenshot shows the current UI if it does not;
- the project is production-ready, secure, or complete without evidence.

If something is incomplete, say so in one calm line. Do not hide it. Do not advertise around it.

### 0.3 Minimal, calm, natural

Public writing is:

- direct;
- short;
- exact;
- not sales copy;
- not a pitch deck;
- not a personal diary;
- not a changelog of internal process.

Prefer nouns and facts. Cut adjectives that do not change meaning.

Forbidden tone:

```text
revolutionary / lightning-fast / ultimate / best / game-changing
don't miss / star this / follow me / like and subscribe
I spent months / after a long journey / I'm excited to share
```

Allowed tone:

```text
This does X.
I built it because Y.
Run it like this.
This part is not done.
```

### 0.4 Timeless by default

Do not put dates, years, “session N”, sprint names, or “updated last week” in public docs unless the fact is required (license year, citation year, dataset version that is itself a date, or a pinned dependency version).

Do not write “as of today.” Write the durable fact.

### 0.5 One source of truth for the public story

The README is the front door. Other docs exist only when the README would become heavy. The README links to them. The README does not duplicate them.

---

## 1. What must never be published

### 1.1 Personal information

Do not commit or mention in the repo:

- legal name beyond the GitHub account / LICENSE author the owner already chose;
- email, phone, address, national ID, student ID, employee ID;
- photos of people, desks, badges, or documents;
- school/employer internals unless the owner explicitly wants them public;
- private social handles, personal calendars, family names;
- client, employer, or teammate names unless they are already public and approved.

Use generic language:

```text
a construction PMO product
a personal task list
an internal knowledge graph (sample data only)
```

Not:

```text
built for Company X's Riyadh site team
my roommate asked me to...
professor Y's course homework
```

### 1.2 Internal development information

The public repo is not the working notebook.

Do not publish:

- `_working_docs/`, thinking files, audit/todo, implementation logs, session roadmaps, agent rules, review letters, partner handoffs;
- prompts, hidden system instructions, internal scoring rubrics;
- “how we actually develop” process, tool stacks used only by the agent, model names used to write the code, chat transcripts;
- unfinished plans presented as product docs;
- reviewer or client comments;
- local absolute paths (`/Users/...`, `C:\...`, `/home/ahmed/...`);
- private ticket IDs, Slack/WhatsApp excerpts, meeting notes.

Working records stay local, in a private repo, or in ignored folders.

Default ignore (adapt to the stack):

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
id_rsa
id_ed25519
.DS_Store
.vscode/
.idea/
_working_docs/
**/thinking/
**/*secret*
**/*credential*
node_modules/
dist/
build/
.next/
.venv/
__pycache__/
*.log
coverage/
```

Public exception: a short `CONTRIBUTING.md` that tells outsiders how to open a PR. That is product process, not internal method.

### 1.3 Secrets and live infrastructure

Never commit:

- `.env` files with values;
- API keys, tokens, cookies, session strings, JWTs;
- private keys, keystores, cloud credentials;
- database URLs with passwords;
- production hostnames, IPs, SSH commands, internal VPN names;
- customer data, real org charts, real emails in fixtures.

Commit `.env.example` with **empty or fake** placeholders only:

```bash
DATABASE_URL=
SESSION_SECRET=
PROVIDER_API_KEY=
```

If a secret was ever committed:

1. treat it as compromised;
2. remove it from the tree;
3. rotate it;
4. purge it from git history before the repo is public (or before the next force-with-care history rewrite the owner approves);
5. do not write the secret value into the incident note.

### 1.4 What may stay

Allowed and expected:

- code, tests, configs without secrets;
- public logs, sample logs, redacted logs;
- screenshots of the product (no personal data in frame);
- licenses, citations, third-party attributions;
- honest status of what works;
- sample/synthetic datasets clearly labeled as sample.

---

## 2. Repository shape before the first public push

### 2.1 Required public files

Every public repo has at least:

```text
README.md
LICENSE
.gitignore
```

If the project needs configuration:

```text
.env.example
```

If the project is a library or has a public API, add only what is needed:

```text
CONTRIBUTING.md     # optional, short
SECURITY.md         # optional, how to report issues privately
CITATION.cff        # only for citable research/data
```

Do not add empty placeholder files “for completeness.”

### 2.2 Default branch and name

- Default branch: `main`.
- Repo name: short, lowercase, hyphenated, matches the product name.
- Description (GitHub about box): one sentence, same claim as the README first line. No emoji spam. No hashtags.

Topics: a few real topics (language, domain). Not a keyword dump.

### 2.3 What the tree looks like

The root is calm. A stranger sees the product, not the workshop.

Prefer:

```text
project/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docs/                 # only if needed
│   └── assets/           # screenshots
├── src/   or   apps/     # actual code
├── tests/                # if they exist
├── scripts/              # public useful scripts only
└── LICENSE-compatible lockfiles
```

Do not put at root:

- scratch notebooks, `old/`, `backup/`, `final_final_2/`;
- zipped copies of the repo;
- personal notes;
- dozens of unrelated markdown files.

If a large design/research pack must ship, put it under `docs/` or `research/` with an index, and keep the README pointing at the index only.

### 2.4 License

Pick one license the owner approved. Put the full text in `LICENSE`. Mention it once at the end of the README. Do not paste the whole license into the README.

If third-party code or data is included, state their licenses in a short `NOTICE` or a README subsection. Do not claim a license you did not verify.

---

## 3. The README law

The README is the product. It must be pleasant to read and cheap to scan.

### 3.1 Fixed order

Use this order. Skip a section only when it does not apply. Do not invent extra sections.

```text
1. Title
2. One-line fact
3. Optional badges (license, language) — few, factual
4. Story (short)
5. What it is / what it is not (only if confusion is likely)
6. Screenshots
7. What you can do (table or short list)
8. Requirements
9. How to use / Quick start
10. Configuration (env names only)
11. Repository layout (only if non-obvious)
12. Further docs (table of links)
13. Status (only if not finished — honest, short)
14. License
15. Credits / citation (only if required)
```

No “star this repo.” No social links unless the owner asked. No newsletter. No “buy me a coffee” unless the owner asked.

### 3.2 Title and one-line fact

```md
# Product Name

**One factual sentence. What it is. Not why it is amazing.**
```

Examples:

```md
# EdgePilot AI

**Compare local and cloud AI deployment using recorded benchmarks.**
```

```md
# Sleem's Tasks

A local task manager with a list and a board. No account.
```

Bad:

```md
# 🚀 SuperAI Pro — The Future of Work!!!
The most advanced all-in-one platform you will ever need.
```

### 3.3 The story

Three to eight lines. Plain. Why the thing exists. If it is personal, say that calmly. If it is for a class of users, say the class, not a private person.

Template:

```md
## Why

<problem in ordinary words>

<what this repo is, in one sentence>
```

or, for a personal tool:

```md
I needed X without Y. This is that tool.
```

Rules:

- one reason, not a biography;
- no company-confidential motive;
- no “journey”;
- no overclaim of scale (“used by thousands”) unless true and approved.

### 3.4 Screenshots

Visual projects need pictures in the README. Non-visual libraries may skip this.

Rules:

- store images in `docs/assets/` or `screenshots/`;
- use relative paths;
- meaningful `alt` text;
- show the real current UI;
- crop out personal data, real names, real emails, API keys, local absolute paths, unfinished debug overlays;
- light and dark if both exist, in a small table;
- one hero image first;
- extra images inside a collapsed block so the README stays short:

```md
<p align="center">
  <img src="docs/assets/overview.png" alt="App overview" width="920" />
</p>

<details>
<summary>More screens</summary>

![Settings](docs/assets/settings.png)

</details>
```

Do not use unlicensed marketing stock. Do not embed huge raw videos in git; link a release asset if needed.

### 3.5 Capabilities

A table beats a paragraph.

```md
| Capability | What it does |
|---|---|
| ... | ... |
```

Only list what the published code actually does. If a row is planned, it belongs in Status, not in this table.

### 3.6 What it is not

Add this only when people will assume the wrong thing.

```md
- Not a hosted model.
- Not a login product. Keys stay on the device.
- Not finished: the projects page is in progress.
```

### 3.7 How to use — the most important section

A stranger must succeed by copy-paste.

Requirements first, then commands, then the URL or next click.

```md
## Quick start

### Requirements

- Node.js 24
- PostgreSQL

### Run

```bash
git clone <public-url>
cd <repo>
cp .env.example .env
# fill the empty values
npm ci
npm run dev
```

Open http://localhost:3000
```

Rules:

- real commands that work from a clean machine;
- pin major versions in Requirements when the app will fail otherwise;
- never put real secrets in the snippet;
- if there are two ways (Docker vs local), put the simplest first;
- numbered click-path for non-CLI tools (extensions, desktop apps);
- after start, say the one thing to do to see it working.

If install is long, keep Quick start short and link `docs/install.md`.

### 3.8 Configuration

List variable **names** and what they are for. Never real values.

```md
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection |
| `SESSION_SECRET` | session signing |
```

Say where keys must live (server only, never `NEXT_PUBLIC_`, etc.) when that is a real rule of the project.

### 3.9 Layout

Show a short tree only if the repo is not obvious. Do not dump every file.

### 3.10 Status

Only if the project is incomplete. Calm table or three bullets. No dates.

```md
| Area | State |
|---|---|
| Shell | Done |
| Projects API | In progress |
| Billing | Not started |
```

Do not write “Ready to connect — your step: connect GitHub” as marketing. If an action is required of the owner, it is not README material.

### 3.11 Length

If the README needs a table of contents, it is probably too long. Split into `docs/` and keep the README as the spine.

Cyrkil/Vyne-style encyclopedias are allowed only when the product is genuinely an engine with a public API that operators must run. Even then: Overview → Quick start near the top, deep reference below or in `docs/`.

---

## 4. Voice and claim rules

### 4.1 Do not overclaim

Never write without evidence:

- first / only / largest / state of the art;
- secure, private, compliant, production-ready;
- exact performance numbers copied from a demo;
- “official” implementation of someone else’s method.

For datasets and research, numbers must match the files. If a paper exists, cite it; do not re-sell it.

Preferred:

```text
A structured set of N records from official public sources.
```

Not:

```text
The largest and most complete legal dataset ever released.
```

(If a size claim is central and verified, it may stay. Unverified superlatives may not.)

### 4.2 Separate layers of claim

| Layer | Allowed wording |
|---|---|
| Intent | “Meant to help with X.” |
| Behavior | “Does X when you do Y.” |
| Limit | “Does not do Z.” |
| Evidence | “Tests cover N cases.” only if those tests are in the repo |

### 4.3 Language

- English unless the product is bilingual; then the README may be English with a short note that the UI is AR/EN.
- No emoji walls. One optional emoji in a personal tiny tool is fine. None in serious products.
- No filler section titles (“🚀 Installation (30 Seconds)”).
- Contractions are fine. Hype is not.

---

## 5. Sanitization pass (mandatory before publish)

Treat the repo as if it will be cloned by a stranger and indexed by search engines.

### 5.1 Scan

From the repo root, inspect what will be published:

```bash
git status --short --branch
git ls-files
git log --oneline -n 20
```

Search the tracked tree for leaks:

```text
api_key, apikey, secret, password, token, bearer, private_key
BEGIN OPENSSH, BEGIN RSA, AKIA, sk-, ghp_, github_pat_
@.gmail.com, @.edu, phone-like numbers
/Users/, /home/, C:\
internal hostnames, vpn, slack, whatsapp
_working_docs, AGENT_RULES, IMPLEMENTATION_LOG, AUDIT_AND_TODO
```

Also open every screenshot and sample data file with human eyes.

### 5.2 History

A deleted file that remains in git history is still public.

If a leak is in history:

- rotate the secret;
- rewrite history only with owner approval;
- or start a clean public repo and push a fresh root commit of the sanitized tree.

Do not publish and “fix later.”

### 5.3 Sample data

Public fixtures must be synthetic or already-public and licensed.

Replace real org names, people, salaries, IDs. If the product needs a demo graph, ship a clearly labeled sample schema, not a client’s graph.

### 5.4 Comments and code

Remove from public code:

- `TODO: ask Ahmed`, `FIXME hack for the demo on Monday`;
- commented credentials;
- customer names in strings;
- agent/session breadcrumbs.

Keep ordinary technical comments.

---

## 6. Git publish protocol

### 6.1 Before the first public push

1. Owner confirmed: public vs private, license, product name, what story may be told.
2. Working docs and secrets are ignored or outside the repo.
3. README follows §3.
4. Screenshots are current and clean.
5. `.env.example` has no values.
6. `LICENSE` and `.gitignore` exist.
7. Verification the project already uses is run (tests, lint, build) or the gap is stated.
8. Secret scan is clean.
9. `git diff` and `git ls-files` show only intended paths.

### 6.2 Commits

Public history should be readable, not a diary of agent sessions.

- focused commits;
- messages like `feat(api): add project list` — not `session 14 wip ahmed`;
- no commit messages that mention internal tools, prompts, or people.

If the private history is messy, squash or start clean for the public remote.

### 6.3 Remote

- Push only to the owner’s intended GitHub remote.
- Default branch `main`.
- Do not force-push a public branch unless the owner asked and history rewrite was the point (secret purge).
- After push, verify the remote commit matches local.

### 6.4 GitHub metadata

Set on the GitHub repo (UI or `gh`):

- description = README one-liner;
- website = public live URL only if it is meant to be public;
- license detected;
- releases only for real versioned artifacts.

Do not enable a noisy social preview with a personal photo.

---

## 7. Project-type notes

Apply only what fits.

### 7.1 Application

README: story, screenshots, quick start, env names, status.  
Ship a working dev path. If Docker is the intended path, make `docker compose up` the first command.

### 7.2 Library / CLI

README: what it is, install, 10-line usage, API pointer.  
Screenshots optional. Examples must run.

### 7.3 Dataset

README: source, license, schema, counts that match the files, citation, how to load one sample.  
No scrape credentials. No claim of completeness you did not measure.

### 7.4 Research code

README: paper citation, how to reproduce the stated experiment, data location, limits.  
Do not dump the whole paper review process. Public code ≠ review workspace.

### 7.5 Extension / desktop binary

README: what it does, install click-path, usage click-path, screenshots.  
Binaries go in GitHub Releases, not as huge blobs in git, unless the owner wants a small zip in-tree.

### 7.6 Monorepo

Root README is the map. Each app has a short README. Root Quick start runs the thing people came for.

---

## 8. Documentation split

| Lives in README | Lives in `docs/` | Does not go public |
|---|---|---|
| Story, screenshots, how to run | Architecture, API, deploy runbooks | Agent rules, audits, thinking |
| Env **names** | Long config reference | Real env values |
| Honest status | Design tokens, research index | Client names, private research |
| License pointer | Contributor guide | Session logs |

Docs in `docs/` follow the same voice: short, dated only when required, no secrets.

---

## 9. Definition of done

A project may be called “uploaded” only when:

```text
[ ] Owner approved public/private, name, license, and allowed story.
[ ] Personal and internal material removed from tree and from the history being pushed.
[ ] Secret scan clean; .env.example has no secrets.
[ ] README follows the section order and voice rules.
[ ] Screenshots exist for visual products and contain no private data.
[ ] Quick start is the real command path.
[ ] Claims match the published code.
[ ] LICENSE and .gitignore are present.
[ ] Working-docs / agent files are not in the public tree.
[ ] Remote matches the sanitized local tree.
[ ] GitHub description matches the README one-liner.
```

---

## 10. Forbidden behaviors

Never:

- upload a work folder “as is”;
- include `_working_docs`, agent rules, or implementation logs in a public repo;
- commit secrets or real personal data;
- write sales copy, calls to action, or superlatives without proof;
- put dates on the README for decoration;
- document internal methods of how the code was produced;
- claim tests, deploys, or features that are not there;
- leave `TODO ask <person>` or local paths in public files;
- use real customer or classmate data as a demo;
- publish first and sanitize later.

---

## 11. Copy/paste templates

### 11.1 Minimal README

```md
# <Name>

**<One factual sentence.>**

## Why

<3–6 lines. The problem. What this repo is.>

## Preview

<p align="center">
  <img src="docs/assets/overview.png" alt="<Name> overview" width="920" />
</p>

## What it does

| Capability | What you get |
|---|---|
| | |

## Requirements

- <runtime and versions that actually matter>

## Quick start

```bash
git clone <url>
cd <repo>
cp .env.example .env
# fill empty values
<install>
<run>
```

<Where to open it. One first action.>

## Configuration

| Variable | Purpose |
|---|---|
| | |

## License

<SPDX name> — see [LICENSE](LICENSE).
```

### 11.2 Public .gitignore starter

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
.DS_Store
_working_docs/
**/thinking/
node_modules/
.venv/
__pycache__/
dist/
build/
.next/
coverage/
*.log
```

### 11.3 Pre-push sanitization checklist

```text
[ ] git ls-files reviewed
[ ] no .env, keys, or personal paths
[ ] no _working_docs or agent files
[ ] screenshots cropped
[ ] sample data is synthetic or licensed public
[ ] README has no dates, no CTA, no overclaim
[ ] .env.example placeholders only
[ ] verify command run or gap stated
[ ] history checked for old secrets
```

---

## Final principle

> A public repository is a quiet, complete object: a short true story, a picture if there is something to see, and the smallest set of steps that make the thing run. Everything else is either a linked doc or not the world’s business.

If a line does not help a stranger use the project, delete it.
