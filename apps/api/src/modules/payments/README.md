# payments module

**Owns:** wallet, ledger, refunds, payouts, providers
**Must never be touched by others:** the ledger, absolutely

Layered per CH8a §8a.2: `contracts/` (the only public surface), `domain/`
(business rules — never imports infra), `application/` (use cases),
`infra/` (repositories, provider adapters), `api/` (controllers/DTOs),
`tests/`. Layers are created with the module's first code.
