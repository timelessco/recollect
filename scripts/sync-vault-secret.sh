#!/bin/bash
# Syncs the Supabase vault secret with the edge runtime's service role key.
# Required after `supabase start` because CLI v2.x regenerates keys on each start.

set -e

SERVICE_KEY=$(docker exec supabase_edge_runtime_recollect printenv SUPABASE_SERVICE_ROLE_KEY 2> /dev/null)

if [ -z "$SERVICE_KEY" ]; then
	echo "✗ Edge runtime container not running"
	exit 1
fi

PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -q -c "
  SELECT vault.update_secret(
    (SELECT id FROM vault.secrets WHERE name = 'supabase_service_role_key'),
    '$SERVICE_KEY'
  );" > /dev/null

echo "✓ Vault secret synced with edge runtime"
