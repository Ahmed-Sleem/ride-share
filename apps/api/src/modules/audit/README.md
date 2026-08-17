# audit module

**Owns:** append-only audit log
**Must never be touched by others:** append-only, no deletes

Layered per CH8a §8a.2: `contracts/` (the only public surface), `domain/`
(business rules — never imports infra), `application/` (use cases),
`infra/` (repositories, provider adapters), `api/` (controllers/DTOs),
`tests/`. Layers are created with the module's first code.
