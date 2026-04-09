# Chart Configuration Options

Charts support JSON configuration options beyond the query. These are set at the chart level.

## Common Options (All Charts)

```json
{
  "overrideDashboardTimeRange": false,
  "overrideDashboardCompareAgainst": false,
  "hideHeader": false
}
```

## Metrics/MPL Query (MetricsDB Charts)

Metrics charts put the full MPL pipeline string in `query.apl` only. Do not send `query.metricsDataset` or `query.mpl` in create payloads — the create API rejects both even though GET responses for existing dashboards may include them. Run `scripts/metrics/metrics-spec` to learn the full syntax before composing queries.

### Minimal Metrics Query

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`system.cpu.utilization`"
  }
}
```

### Metrics Query with Filters and Transformations

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "`otel-metrics`:`http.server.duration`\n| where `service.name` == \"api\"\n| where `deployment.environment` == \"prod\"\n| align to 1m using avg\n| group by `service.name` using avg"
  }
}
```

For full contract details, see `reference/metrics-mpl.md`.

## Statistic Options

```json
{
  "type": "Statistic",
  "colorScheme": "Blue",
  "customUnits": "req/s",
  "unit": "Auto",
  "showChart": true,
  "hideValue": false,
  "errorThreshold": "Above",
  "errorThresholdValue": "100",
  "warningThreshold": "Above",
  "warningThresholdValue": "50",
  "invertTheme": false
}
```

> **API gotcha:** `decimals` is returned by GET and may appear in existing dashboards, but the create API rejects it. Omit `decimals` from create payloads.

| Option | Values | Description |
|--------|--------|-------------|
| `colorScheme` | Blue, Orange, Red, Purple, Teal, Yellow, Green, Pink, Grey, Brown | Color theme |
| `customUnits` | string | Unit suffix (e.g., "ms", "req/s") |
| `unit` | Auto, Abbreviated, Byte, KB, MB, GB, TimeMS, TimeSec, Percent, etc. | Value formatting |
| `decimals` | number | Decimal places in readback/GET payloads; omit on create because the API rejects it |
| `showChart` | boolean | Show sparkline |
| `hideValue` | boolean | Hide the main value |
| `errorThreshold` | Above, AboveOrEqual, Below, BelowOrEqual, AboveOrBelow | Error condition |
| `errorThresholdValue` | string | Error threshold value |
| `warningThreshold` | same as error | Warning condition |
| `warningThresholdValue` | string | Warning threshold value |
| `invertTheme` | boolean | Invert colors |

### Available Units

- **Numbers**: `Auto`, `Abbreviated`
- **Data**: `Byte`, `Kilobyte`, `Megabyte`, `Gigabyte`
- **Data rates**: `BitsSec`, `BytesSec`, `KilobitsSec`, `KilobytesSec`, `MegabitsSec`, `MegabytesSec`, `GigabitsSec`, `GigabytesSec`
- **Time**: `TimeNS`, `TimeUS`, `TimeMS`, `TimeSec`, `TimeMin`, `TimeHour`, `TimeDay`
- **Percent**: `Percent` (0-1), `Percent100` (0-100)
- **Currency**: `CurrencyUSD`, `CurrencyEUR`, `CurrencyGBP`, `CurrencyCAD`, `CurrencyAUD`, `CurrencyJPY`, `CurrencyINR`, `CurrencyCZK`, `CurrencyPLN`
- **Date**: `DateDateTime`, `DateFromNow`, `DateYYYYMMDDHHmmss`

## TimeSeries Options

TimeSeries chart options are stored in `query.queryOptions.aggChartOpts` as a JSON string.

### Key Formats

**Important:** The `"*"` wildcard is unreliable. Always use the specific key format derived from your query.

#### Deriving the Key

The key format depends on how the column is computed:

| Query Pattern | Key Format |
|---------------|------------|
| `summarize count()` | `{"alias":"count_","op":"count"}` |
| `summarize sum(field)` | `{"alias":"sum_field","op":"sum"}` |
| `summarize ['Name'] = sum(field) / 1000` | `{"alias":"Name","field":"field","op":"computed"}` |
| `summarize ['Name'] = round(sum(field), 1)` | `{"alias":"Name","field":"field","op":"computed"}` |

**Rule:** If the column uses any expression (math, `round()`, etc.), use `"op":"computed"` and include the source `"field"`.

#### Simple Aggregation Example

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "['logs'] | summarize count() by bin_auto(_time)",
    "queryOptions": {
      "aggChartOpts": "{\"{\\\"alias\\\":\\\"count_\\\",\\\"op\\\":\\\"count\\\"}\":{\"variant\":\"bars\"}}"
    }
  }
}
```

#### Computed Column Example

For `['Ingest GB'] = round(sum(['properties.hourly_ingest_bytes']) / 1e9, 1)`:

```json
{
  "aggChartOpts": "{\"{\\\"alias\\\":\\\"Ingest GB\\\",\\\"field\\\":\\\"properties.hourly_ingest_bytes\\\",\\\"op\\\":\\\"computed\\\"}\":{\"variant\":\"bars\",\"displayNull\":\"auto\"}}"
}
```

**Note:** The `field` value is the source field name without brackets or the `properties.` prefix path as written in the query.

### View Mode (timeSeriesView)

Controls what the TimeSeries panel displays. Set in `query.queryOptions.timeSeriesView`.

| Value | Description |
|-------|-------------|
| `charts` | Chart only (default) |
| `resultsTable` | Summary totals table only |
| `charts\|resultsTable` | Chart with totals table below — shows both the time series and an aggregated summary |

```json
{
  "type": "TimeSeries",
  "query": {
    "apl": "['logs'] | summarize count() by bin_auto(_time), service",
    "queryOptions": {
      "timeSeriesView": "charts|resultsTable"
    }
  }
}
```

### Per-Series Options (inside aggChartOpts)

| Option | Values | Description |
|--------|--------|-------------|
| `variant` | `line`, `area`, `bars` | Chart display mode |
| `scaleDistr` | `linear`, `log` | Y-axis scale |
| `displayNull` | `auto`, `null`, `span`, `zero` | Missing data handling |

### displayNull Values

- `auto`: Best representation based on chart type
- `null`: Skip/ignore missing values (gaps in chart)
- `span`: Join adjacent values across gaps
- `zero`: Fill missing with zeros

## LogStream / Table Options

```json
{
  "type": "LogStream",
  "tableSettings": {
    "columns": [
      {"name": "_time", "width": 150},
      {"name": "message", "width": 400}
    ],
    "settings": {
      "fontSize": "12px",
      "highlightSeverity": true,
      "showRaw": true,
      "showEvent": true,
      "showTimestamp": true,
      "wrapLines": true,
      "hideNulls": true
    }
  }
}
```

| Option | Type | Description |
|--------|------|-------------|
| `columns` | array | Column order and widths (objects with `name` and `width`) |
| `fontSize` | string | Font size (e.g., "12px") |
| `highlightSeverity` | boolean | Color-code by log level |
| `showRaw` | boolean | Show raw JSON |
| `showEvent` | boolean | Show event column |
| `showTimestamp` | boolean | Show timestamp column |
| `wrapLines` | boolean | Wrap long lines |
| `hideNulls` | boolean | Hide null values |

## Pie Options

```json
{
  "type": "Pie",
  "hideHeader": false
}
```

## Note Options

```json
{
  "type": "Note",
  "text": "## Section Header\n\nMarkdown content here.",
  "variant": "default"
}
```

Note content supports GitHub Flavored Markdown.

## Heatmap Options

Heatmap charts use the default options. Color scheme is fixed to blue gradient.

```json
{
  "type": "Heatmap",
  "query": {
    "apl": "['logs'] | summarize histogram(duration_ms, 15) by bin_auto(_time)"
  }
}
```

## Annotations

Display deployment markers, incidents, or custom events on charts.

Annotations are managed via the Axiom API `/v2/annotations` endpoint:

```bash
curl -X 'POST' 'https://api.axiom.co/v2/annotations' \
  -H 'Authorization: Bearer $AXIOM_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2024-03-18T08:39:28.382Z",
    "type": "deploy",
    "datasets": ["http-logs"],
    "title": "Production deployment",
    "description": "Deploy v2.1.0",
    "url": "https://github.com/org/repo/releases/tag/v2.1.0"
  }'
```

Or use GitHub Actions:
```yaml
- name: Add annotation
  uses: axiomhq/annotation-action@v0.1.0
  with:
    axiomToken: ${{ secrets.AXIOM_TOKEN }}
    datasets: http-logs
    type: "deploy"
    title: "Production deployment"
```

## Comparison Period (Against)

Compare current time range against a historical period:
- `-1D`: Same time yesterday
- `-1W`: Same time last week
- Custom offset

Use in dashboard URL: `?t_qr=24h&t_against=-1d`

## Custom Time Range per Panel

Individual panels can override the dashboard time range:
- Set `overrideDashboardTimeRange: true` in chart config
- Via UI: Edit panel → Time range → Custom
