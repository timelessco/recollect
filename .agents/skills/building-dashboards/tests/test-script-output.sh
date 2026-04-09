#!/usr/bin/env bash
# test-script-output.sh: Ensure deployment scripts keep machine-readable stdout
#
# Usage: ./test-script-output.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/../scripts"

passed=0
failed=0

ok() {
    ((passed++)) || true
    echo "  ✓ $1"
}

fail() {
    ((failed++)) || true
    echo "  ✗ $1: $2"
}

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cp "$SCRIPTS_DIR/dashboard-create" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-update" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-validate" "$TMPDIR/"
cp "$SCRIPTS_DIR/dashboard-normalize.jq" "$TMPDIR/"

chmod +x "$TMPDIR/dashboard-create" "$TMPDIR/dashboard-update" "$TMPDIR/dashboard-validate"

cat > "$TMPDIR/input.json" <<'JSON'
{
  "id": "dashboard-root-id",
  "version": "v1",
  "createdAt": "2026-02-01T10:00:00Z",
  "updatedAt": "2026-02-02T11:00:00Z",
  "createdBy": "alice@example.com",
  "updatedBy": "bob@example.com",
  "schemaVersion": 2,
  "name": "Test Dashboard",
  "description": "Test",
  "owner": "user-123",
  "charts": [
    {
      "id": "error-rate",
      "name": "Error Rate",
      "type": "Statistic",
      "query": { "apl": "['logs'] | summarize c=count()" }
    }
  ],
  "layout": [
    { "i": "error-rate", "x": 0, "y": 0, "w": 3, "h": 2 }
  ]
}
JSON

cat > "$TMPDIR/axiom-api" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
METHOD="${2:-}"
PATH_="${3:-}"

case "$METHOD:$PATH_" in
  "POST:/dashboards")
    echo '{"status":"created","dashboard":{"uid":"created-uid","id":"created-id","version":1,"dashboard":{"name":"Test Dashboard"},"createdAt":"2026-02-01T10:00:00Z","updatedAt":"2026-02-01T10:00:00Z","createdBy":"alice@example.com","updatedBy":"alice@example.com"}}'
    ;;
  "PUT:/dashboards/uid/dashboard-root-id")
    echo '{"status":"updated","dashboard":{"uid":"dashboard-root-id","id":"dashboard-root-id","version":2,"dashboard":{"name":"Test Dashboard","updated":true},"createdAt":"2026-02-01T10:00:00Z","updatedAt":"2026-02-02T11:00:00Z","createdBy":"alice@example.com","updatedBy":"bob@example.com"}}'
    ;;
  *)
    echo "Unexpected call: $METHOD $PATH_" >&2
    exit 1
    ;;
esac
BASH

chmod +x "$TMPDIR/axiom-api"

echo "Script Stdout Contract"
echo "======================"

create_out=$("$TMPDIR/dashboard-create" prod "$TMPDIR/input.json")
if [[ "$create_out" == "created-uid" ]]; then
    ok "dashboard-create outputs only dashboard UID"
else
    fail "dashboard-create outputs only dashboard UID" "got: $create_out"
fi

update_out=$("$TMPDIR/dashboard-update" prod dashboard-root-id "$TMPDIR/input.json")
if echo "$update_out" | jq -e '.dashboard.uid == "dashboard-root-id" and .dashboard.dashboard.updated == true' > /dev/null 2>&1; then
    ok "dashboard-update outputs valid JSON only"
else
    fail "dashboard-update outputs valid JSON only" "got: $update_out"
fi

echo ""
echo "======================"
echo "Passed: $passed | Failed: $failed"

[[ $failed -eq 0 ]]
