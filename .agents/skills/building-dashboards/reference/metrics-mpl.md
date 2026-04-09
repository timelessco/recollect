# Metrics/MPL Chart Contract

This reference documents the chart query contract for *metrics-backed* dashboard charts.

Metrics charts place the MPL pipeline string in the `query.apl` field (the same field used for APL queries). Do not send `query.metricsDataset` or `query.mpl` in create payloads — the create API rejects both even though GET responses for existing dashboards may include them.

> **CRITICAL:** Run `scripts/metrics/metrics-spec <deployment> <dataset>` before composing your first MPL query in a session. NEVER guess MPL syntax.

## Canonical JSON Shape

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| align to 1m using avg\n| group by `service.name` using avg"
  }
}
```

### Required and Optional Fields

| Field | Required? | Description |
|-------|-----------|-------------|
| `apl` | ✅ Yes | The MPL pipeline string. Use this field even for MPL content. |
| `metricsDataset` | ❌ No | Readback/UI field. Do not send in create payloads; the create API rejects it. |
| `mpl` | ❌ No | Readback field. GET may return it, but create expects the same string in `apl`. |
| `metricsMetric` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |
| `metricsFilter` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |
| `metricsTransformations` | ❌ No | UI/editor metadata; not needed for hand-authored create payloads |

> **Why `apl`?** The dashboard create API uses `apl` as the query text field for both APL and MPL queries. The dataset/metric selector is embedded in the MPL string itself (for example, `` `otel-metrics`:`http.server.duration` ``).

## Authoring Checklist

When generating metrics chart JSON:

1. Confirm dataset kind is `otel:metrics:v1` via `scripts/metrics/datasets <deploy>`.
2. Run `scripts/metrics/metrics-spec` to learn the full MPL syntax — **mandatory, never guess**.
3. Discover available metrics and tags with `scripts/metrics/metrics-info`. If results are empty, retry with `--start` set to 7 days ago (sparse metrics may not have data in the default 24h window).
4. Put the full MPL pipeline in `query.apl` only. Do not set `query.metricsDataset` or `query.mpl` in create payloads.
5. Validate your query with `scripts/metrics/metrics-query` before embedding in the dashboard.

> **Note:** `find-metrics <value>` searches tag values, not metric names. Use `metrics-info <deploy> <dataset> metrics` to list metric names.

## Metrics Discovery & Query Scripts

| Script | Usage |
|--------|-------|
| `scripts/metrics/datasets <deploy> [--kind <kind>]` | List datasets (with edge deployment info) |
| `scripts/metrics/metrics-spec <deploy> <dataset>` | Fetch MPL query specification |
| `scripts/metrics/metrics-info <deploy> <dataset> ...` | Discover metrics, tags, and values |
| `scripts/metrics/metrics-query <deploy> <mpl> <start> <end>` | Execute a metrics query |

> These scripts are vendored from `query-metrics`. Keep in sync if upstream behavior changes.
