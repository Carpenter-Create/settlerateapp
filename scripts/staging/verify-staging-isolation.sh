#!/usr/bin/env bash
# Compatibility wrapper → scripts/deploy/verifyStagingDeploy.mjs (ADR 0014).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec node "$ROOT/scripts/deploy/verifyStagingDeploy.mjs" "$@"
