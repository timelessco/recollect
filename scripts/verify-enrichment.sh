#!/usr/bin/env bash
# Wide Event Enrichment Audit (D-11/D-12)
# One-shot verification tool — NOT a CI gate. Advisory output only.
# Scans all v2 route handlers for ctx.fields enrichment patterns.
# Bash 3.2 compatible (macOS default — no declare -A).

ROUTE_DIR="src/app/api/v2"
TOTAL=0
ADEQUATE=0
SPARSE=0
PII_VIOLATIONS=0
CONSOLE_CALLS=0
SENTRY_IN_AFTER=0

# Temp files for PII/console/sentry details
pii_detail=$(mktemp)
console_detail=$(mktemp)
sentry_detail=$(mktemp)
trap 'rm -f "$pii_detail" "$console_detail" "$sentry_detail"' EXIT

echo "=== Wide Event Enrichment Audit ==="
echo ""

# Find all route.ts files under v2
while IFS= read -r route_file; do
  TOTAL=$((TOTAL + 1))

  # Extract short route name (e.g., bookmark/fetch-bookmarks-count)
  route_name=$(echo "$route_file" | sed "s|$ROUTE_DIR/||;s|/route\.ts$||")

  # Count ctx.fields assignments
  field_count=$(grep -c 'ctx\.fields\.' "$route_file" 2>/dev/null || echo "0")

  # Extract unique field names
  field_names=$(grep -o 'ctx\.fields\.\([a-z_]*\)' "$route_file" 2>/dev/null | \
    sed 's/ctx\.fields\.//' | sort -u | tr '\n' ', ' | sed 's/,$//')

  # Determine status
  if [ "$field_count" -ge 2 ]; then
    status="OK"
    ADEQUATE=$((ADEQUATE + 1))
  else
    status="SPARSE"
    SPARSE=$((SPARSE + 1))
  fi

  printf "%-50s %s %2d fields [%s]\n" "$route_name:" "$status" "$field_count" "$field_names"

  # Check PII violations (exact patterns to avoid false positives)
  if grep -qE 'ctx\.fields\.email\s*=' "$route_file" 2>/dev/null; then
    if ! grep -q 'ctx\.fields\.has_email' "$route_file" 2>/dev/null; then
      PII_VIOLATIONS=$((PII_VIOLATIONS + 1))
      echo "  PII: ctx.fields.email in $route_name" >> "$pii_detail"
    fi
  fi
  if grep -qE 'ctx\.fields\.username\s*=' "$route_file" 2>/dev/null; then
    if ! grep -q 'ctx\.fields\.username_updated\|ctx\.fields\.username_length' "$route_file" 2>/dev/null; then
      PII_VIOLATIONS=$((PII_VIOLATIONS + 1))
      echo "  PII: ctx.fields.username in $route_name" >> "$pii_detail"
    fi
  fi
  if grep -q 'ctx\.fields\.recipient_email' "$route_file" 2>/dev/null; then
    PII_VIOLATIONS=$((PII_VIOLATIONS + 1))
    echo "  PII: ctx.fields.recipient_email in $route_name" >> "$pii_detail"
  fi
  if grep -q 'ctx\.fields\.collaboration_email' "$route_file" 2>/dev/null; then
    PII_VIOLATIONS=$((PII_VIOLATIONS + 1))
    echo "  PII: ctx.fields.collaboration_email in $route_name" >> "$pii_detail"
  fi

  # Check console.* calls
  console_count=$(grep -cE 'console\.(log|warn|error)\(' "$route_file" 2>/dev/null || true)
  console_count=${console_count:-0}
  if [ "$console_count" -gt 0 ] 2>/dev/null; then
    CONSOLE_CALLS=$((CONSOLE_CALLS + console_count))
    echo "  console.*: $console_count call(s) in $route_name" >> "$console_detail"
  fi

  # Check Sentry in after() context
  if grep -q 'after(' "$route_file" 2>/dev/null; then
    if grep -q 'Sentry' "$route_file" 2>/dev/null; then
      SENTRY_IN_AFTER=$((SENTRY_IN_AFTER + 1))
      echo "  Sentry+after(): $route_name" >> "$sentry_detail"
    fi
  fi

done < <(find "$ROUTE_DIR" -name "route.ts" -type f | sort)

echo ""
echo "=== Summary ==="
echo "Total routes: $TOTAL"
echo "Adequate (2+ fields): $ADEQUATE"
echo "Sparse (< 2 fields): $SPARSE"
echo "PII violations: $PII_VIOLATIONS"
echo "Console calls: $CONSOLE_CALLS"
echo "Sentry in after(): $SENTRY_IN_AFTER"

# Print details if any violations found
if [ -s "$pii_detail" ]; then
  echo ""
  echo "--- PII Details ---"
  cat "$pii_detail"
fi

if [ -s "$console_detail" ]; then
  echo ""
  echo "--- Console Details ---"
  cat "$console_detail"
fi

if [ -s "$sentry_detail" ]; then
  echo ""
  echo "--- Sentry+after() Details ---"
  cat "$sentry_detail"
fi

# Advisory only — always exit 0
exit 0
