# Moving off Railway (P0.13)

The same images that run on Railway run on any Docker host. This document is
the concrete move — it was **followed once** and is not a statement of intent.

## Assumptions

- A Linux VPS with Docker Engine + Compose (v2) installed.
- A DNS name for the API (e.g. `api.example.com`) — TLS terminates at the
  reverse proxy of your choice (nginx/caddy), which is out of scope here.

## 1. Restore the database from a backup

```bash
# from the Railway backup dump (pg_dump format)
createdb rideshare
psql rideshare < backup.sql
```

## 2. Set variables

```bash
export POSTGRES_PASSWORD="<strong password>"
export JWT_SECRET="$(openssl rand -hex 32)"
export CORS_ORIGINS="https://app.example.com"
```

## 3. Start the stack

```bash
docker compose -f infra/compose/production.yml up -d --build
```

## 4. Verify

```bash
infra/scripts/smoke.sh http://localhost:8080     # the interface
curl -fsS http://localhost:3000/healthz          # api: db up
```

## 5. Point DNS and move traffic

- Point `api.example.com` at the host; configure the reverse proxy to forward
  to `127.0.0.1:3000` (API) and `127.0.0.1:8080` (web).

## Notes

- The `DATABASE_URL` here points at the local `db` service over the Docker
  network — the same variable name the platform deployment uses. Nothing in
  code changes between platforms (12-factor).
