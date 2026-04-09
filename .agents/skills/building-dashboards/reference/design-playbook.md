# Dashboard Design Playbook

## Decision-First Design

Every dashboard exists to help someone make a decision. Before adding panels, answer:

1. **Who is the audience?**
   - Oncall engineer (needs fast triage, error focus)
   - Team lead (needs weekly trends, SLO tracking)
   - Executive (needs high-level health, business impact)

2. **What decisions will they make?**
   - "Should I page someone?"
   - "Which service is causing this?"
   - "Are we meeting our SLOs?"
   - "What changed after the deploy?"

3. **What actions follow?**
   - Rollback, scale, investigate, escalate, ignore

If a panel doesn't inform a decision → remove it.

---

## The Overview → Drilldown → Evidence Pattern

Structure dashboards in layers:

```
┌─────────────────────────────────────────────────────────┐
│ OVERVIEW: Is anything broken? (Stats + TimeSeries)      │
│ Answer in <5 seconds                                    │
├─────────────────────────────────────────────────────────┤
│ DRILLDOWN: Where is it broken? (Tables + Pies)          │
│ Identify the component/route/customer                   │
├─────────────────────────────────────────────────────────┤
│ EVIDENCE: What exactly happened? (LogStream)            │
│ Raw events for root cause                               │
└─────────────────────────────────────────────────────────┘
```

Users should be able to:
1. Glance at overview → "something's wrong with errors"
2. Scan drilldown → "it's the /checkout route"
3. Dive into evidence → "null pointer in payment handler"

---

## Audience-Specific Defaults

### Oncall Dashboard
- **Time window:** 15m–1h
- **Refresh:** 30s–1m
- **Focus:** Errors, latency spikes, recent changes
- **Stats:** Current error rate, p95, traffic
- **Priority:** Speed over completeness

### Team Health Dashboard
- **Time window:** 24h–7d
- **Refresh:** 5m–15m
- **Focus:** SLO tracking, trends, regression detection
- **Stats:** SLO budget remaining, weekly error rate
- **Priority:** Context over immediacy

### Executive Dashboard
- **Time window:** 7d–30d
- **Refresh:** 1h
- **Focus:** Business metrics, availability, cost
- **Stats:** Uptime %, request volume, top customers
- **Priority:** Clarity over detail

---

## Anti-Patterns

### Too Many Panels
**Problem:** Cognitive overload, slow rendering, no clear hierarchy.
**Fix:** Limit to 8–12 panels max. If more needed, split into multiple dashboards.

### Pie Charts for High Cardinality
**Problem:** 50+ slices = unreadable rainbow.
**Fix:** Use tables for high cardinality. Pies only for ≤6 categories.

### Missing Time Filters (Ad-hoc Queries Only)
**Problem:** Ad-hoc queries scan entire dataset history.
**Fix:** Always `where _time between (...)` as first filter in Query tab.
**Note:** Dashboard panel queries don't need this—they inherit time from the UI picker.

### Averages Without Percentiles
**Problem:** Averages hide tail latency that affects real users.
**Fix:** Show p50, p95, p99 together. If only one, show p95 or p99.

### Unbounded GROUP BY
**Problem:** `summarize by user_id` returns millions of rows.
**Fix:** Always add `| top N by ...` after high-cardinality groupings.

### No Drilldown Path
**Problem:** Dashboard shows "errors are high" but no way to find where.
**Fix:** Always include breakdown tables that show top contributors.

### Stale Data with Fast Refresh
**Problem:** Dashboard refreshes every 30s but queries 7 days.
**Fix:** Match refresh to time window. Fast refresh = short window.

### Generic Panel Names
**Problem:** "Errors", "Latency", "Traffic" don't explain what you're looking at.
**Fix:** Question-style names: "Error rate by route", "p95 latency trend", "Requests per minute".

---

## Golden Signals Coverage

Every service dashboard should cover the four golden signals:

| Signal | What to show | Chart type |
|--------|--------------|------------|
| **Traffic** | Requests/sec over time | TimeSeries |
| **Errors** | Error rate %, error count by type | TimeSeries + Table |
| **Latency** | p50/p95/p99 over time | TimeSeries |
| **Saturation** | CPU, memory, connections, queue depth | TimeSeries |

If you can't show all four, prioritize: Errors > Latency > Traffic > Saturation.

---

## Time Window Guidelines

| Use case | Window | Bin size |
|----------|--------|----------|
| Active incident | 15m–1h | 10s–1m |
| Recent regression | 6h–24h | 5m–15m |
| Weekly review | 7d | 1h |
| Capacity planning | 30d | 6h–1d |

**Rule of thumb:** Aim for 50–200 data points per series.
- 1h window ÷ 1m bins = 60 points ✓
- 24h window ÷ 1m bins = 1440 points ✗ (too dense)
- 24h window ÷ 15m bins = 96 points ✓

---

## Refresh Rate Guidelines

| Dashboard type | Refresh |
|----------------|---------|
| Oncall/incident | 30s–1m |
| Operational | 1m–5m |
| Daily health | 5m–15m |
| Reporting | Manual or 1h |

Fast refresh on long time windows wastes resources. Match them.

---

## Panel Ordering Principles

1. **Most critical at top-left** (Stats row)
2. **Time series below stats** (context for the numbers)
3. **Breakdowns in middle** (drilldown path)
4. **Raw logs at bottom** (evidence, least used)

Visual flow should match investigation flow: notice → narrow → verify.

---

## Naming Conventions

### Dashboard Names
- Include service/scope: "API Gateway - Oncall"
- Include purpose: "Payment Service - SLO Tracking"
- Avoid generic: "Dashboard 1", "Main"

### Panel Titles
- Question format: "What is the error rate by route?"
- Include units: "Latency (ms)", "Traffic (req/s)"
- Include scope if multi-service: "[API] Error Rate"

### Field Aliases
In APL, use `project` or aliases to create readable column names:
```apl
| project Route = route, Errors = error_count, "Error Rate %" = error_rate
```
