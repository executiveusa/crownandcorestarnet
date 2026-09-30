# Upstream runtime reference

Engineering reference:

- Repository: `androoAGI/starnet`
- Default branch observed during setup: `feat/harness-backend`
- License: MIT for code
- Upstream name, logo, station artwork, sprites, and other brand identity are not part of the MIT code grant.

## Crown & Core integration strategy

Crown & Core StarNet is an independent deployment, not a blind fork and not a Pauli StarNet dependency.

The upstream runtime is an engineering reference/source. Crown & Core owns its own:
- ICM filesystem architecture;
- district contracts;
- agent contracts;
- runtime scopes;
- business truth;
- approval gates;
- receipts;
- integrations.

## Bootstrap

Canonical scripts:

- `_system/scripts/bootstrap-upstream.sh`
- `_system/scripts/bootstrap-upstream.ps1`

No secrets belong in git.
