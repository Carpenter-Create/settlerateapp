#!/usr/bin/env bash
# Compatibility wrapper → scripts/deploy/applyStagingMigrations.sh (ADR 0014).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec bash "$ROOT/scripts/deploy/applyStagingMigrations.sh"
