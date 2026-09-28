#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="https://github.com/androoAGI/starnet.git"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-feat/harness-backend}"
TARGET="vendor/starnet"

if [ -d "$TARGET/.git" ]; then
  echo "Upstream already present at $TARGET"
  exit 0
fi

mkdir -p vendor
git clone --depth 1 --branch "$UPSTREAM_BRANCH" "$UPSTREAM_URL" "$TARGET"

echo "Upstream runtime cloned to $TARGET"
echo "Crown & Core configuration remains in this repository root."
