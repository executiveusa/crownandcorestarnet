# Upstream runtime

Engineering reference:

- Repository: `androoAGI/starnet`
- Default branch observed during setup: `feat/harness-backend`
- License: MIT for code
- Upstream name, logo, station artwork, sprites, and other brand identity are not part of the MIT code grant.

## Integration strategy

This repository is a client overlay, not a blind fork.

Why:
- keeps Crown & Core business logic isolated,
- keeps client data and workflows portable,
- makes upstream updates easier to inspect,
- avoids coupling the offer to one runtime,
- avoids redistributing upstream brand assets.

## Bootstrap

`scripts/bootstrap-upstream.sh` and `scripts/bootstrap-upstream.ps1` clone the upstream runtime into `vendor/starnet`.

No secrets are stored in this repository.
