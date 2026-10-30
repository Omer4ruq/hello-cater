#!/usr/bin/env bash
# Rebuild a scratch PostgreSQL database from the versioned migrations.
# Used in development/CI to prove the migrations apply cleanly and in order
# against a stock PostgreSQL 17 server, with a shim standing in for the
# Supabase-managed auth/storage schemas.
set -euo pipefail

PSQL_BIN="${PSQL_BIN:-psql}"
DB_NAME="${DB_NAME:-evently_check}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$PSQL_BIN" -d postgres -v ON_ERROR_STOP=1 -q \
  -c "drop database if exists ${DB_NAME}" \
  -c "create database ${DB_NAME}"

run() {
  echo "  → $(basename "$1")"
  "$PSQL_BIN" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f "$1" 2>&1 \
    | grep -v -E 'NOTICE:.*(already exists|skipping)' || true
  # shellcheck disable=SC2181
  if [ "${PIPESTATUS[0]}" -ne 0 ]; then echo "FAILED: $1" >&2; exit 1; fi
}

echo "▸ shim"
run "$ROOT/supabase/tests/00_supabase_shim.sql"

echo "▸ migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do run "$f"; done

if [ "${WITH_SEED:-1}" = "1" ] && [ -f "$ROOT/supabase/seed.sql" ]; then
  echo "▸ seed"
  run "$ROOT/supabase/seed.sql"
fi

echo "✓ schema verified on ${DB_NAME}"
