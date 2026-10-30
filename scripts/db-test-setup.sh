#!/usr/bin/env bash
# Builds the database the DB test suite runs against: all migrations,
# the reference seed, and the demo seed (which the fixtures reference).
set -euo pipefail

export DB_NAME="${TEST_DB_NAME:-evently_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL_BIN="${PSQL_BIN:-psql}"

bash "$ROOT/scripts/db-verify.sh" >/dev/null

echo "▸ demo seed"
"$PSQL_BIN" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/seed_demo.sql" 2>&1 \
  | grep -v -E 'NOTICE:.*(already exists|skipping)' || true

echo "✓ test database ready: ${DB_NAME}"
