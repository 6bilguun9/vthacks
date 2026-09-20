#!/bin/sh
set -eu

# Requires Docker. It creates and removes an isolated PostgreSQL 16 container.
test_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
container="vthacks-storage-it-$$"
scratch=$(mktemp -d)
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT INT TERM

docker run -d --rm --name "$container" -e POSTGRES_PASSWORD=vthacks-it -e POSTGRES_DB=vthacks_it postgres:16-alpine >/dev/null
# pg_isready can succeed while Postgres is completing startup. Wait until the
# same authenticated query the test needs can actually run.
until docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d vthacks_it -c "select 1" >/dev/null 2>&1; do sleep 1; done
docker exec "$container" mkdir -p /work
docker cp "$(dirname "$test_dir")" "$container:/work"
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d vthacks_it -f /work/supabase/tests/verify-storage.sql

# verify-storage leaves owner one at version 3/snapshot s2. Hold its plan lock
# first, then submit two identical commits concurrently. Both must return the
# same saved version (the second sees the idempotency record after it waits).
docker exec "$container" psql -v ON_ERROR_STOP=1 -U postgres -d vthacks_it -c "begin; select 1 from public.plans where owner_id = '11111111-1111-1111-1111-111111111111' for update; select pg_sleep(2); commit;" >/dev/null &
locker=$!
sleep 1
call="select public.commit_plan('11111111-1111-1111-1111-111111111111', 3, 's2', 'concurrent', 'same-hash', '{\"id\":\"current\",\"version\":3,\"snapshotId\":\"s2\"}'::jsonb);"
docker exec "$container" psql -tA -v ON_ERROR_STOP=1 -U postgres -d vthacks_it -c "$call" > "$scratch/one" & one=$!
docker exec "$container" psql -tA -v ON_ERROR_STOP=1 -U postgres -d vthacks_it -c "$call" > "$scratch/two" & two=$!
wait "$locker" "$one" "$two"
grep -q '"version": 4' "$scratch/one"
grep -q '"version": 4' "$scratch/two"
printf '%s\n' 'storage integration checks passed'
