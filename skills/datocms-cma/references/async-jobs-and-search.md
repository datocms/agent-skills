# Async Jobs, Search Results, and Audit Log Events

Covers three utility resources: retrieving async job results, searching records via the CMA, and querying the audit log for project activity history.

## Quick Navigation

- [Job Results](#job-results)
- [When You Need Job Results Directly](#when-you-need-job-results-directly)
- [CMA Search Results](#cma-search-results)
- [Audit Log Events](#audit-log-events)
- [Audit Log Filter Parameters](#audit-log-filter-parameters)
- [Cursor-Based Pagination for Audit Logs](#cursor-based-pagination-for-audit-logs)
- [Complete Example: Query Audit Log for Recent Schema Changes](#complete-example-query-audit-log-for-recent-schema-changes)

---

## Job Results

Many CMA operations are asynchronous — `environments.fork()`, `fields.create()`, `items.bulkPublish()`, and others return a job that must complete before the result is available. The DatoCMS client automatically polls these jobs and resolves the promise only when the job finishes. This means you rarely need to interact with `jobResults` directly.

```ts
const jobResult = await client.jobResults.find("some-job-id");

console.log(jobResult.id);
console.log(jobResult.status);  // 200 for success, 422 for failure
console.log(jobResult.payload); // The result data from the completed job
```

### Job Result Attributes

| Attribute | Type | Description |
|---|---|---|
| `id` | `string` | The job ID |
| `status` | `number` | HTTP-style status code: `200` for success, `422` for failure |
| `payload` | `object` | The result data returned by the completed operation |

---

## When You Need Job Results Directly

Although the client handles job polling automatically, there are scenarios where you need `jobResults.find()` yourself:

**Monitoring long-running jobs externally:** When a separate process or service needs to check the status of a job started elsewhere.

```ts
const jobResult = await client.jobResults.find(jobIdFromExternalSource);

const jobSucceeded = jobResult.status === 200;

if (jobSucceeded) {
  console.log("Job completed successfully:", jobResult.payload);
} else {
  console.error("Job failed with status:", jobResult.status);
}
```

**Using `immediate_return: true` with environment forks:** When you pass `immediate_return: true`, the fork call returns immediately without waiting for the job to finish. You must then poll the job yourself.

```ts
const forkResponse = await client.environments.fork(
  "main",
  { id: "my-sandbox" },
  { immediate_return: true },
);

// Poll until the environment is ready
const completedJob = await client.jobResults.find(forkResponse.id);

console.log("Fork job status:", completedJob.status);
```

**Building a progress dashboard:** When you want to display job status in a UI or report progress to users.

---

## CMA Search Results

The `searchResults` resource lets you search records from the CMA side. This performs a full-text search across your project's records.

```ts
const results = await client.searchResults.list({
  query: "hello world",
});

for (const result of results) {
  console.log(result.title, result.url);
  console.log("Highlights:", result.highlight?.body);
}
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `query` | `string` | The search string to match against records |
| `build_trigger_id` | `string` | Optional. Restrict results to a specific build trigger's indexed content |
| `locale` | `string` | Optional. Search within a specific locale |
| `page.offset` | `number` | Pagination offset (starting record index) |
| `page.limit` | `number` | Max results per page (maximum `100`) |

### Paginated Search

```ts
const firstPage = await client.searchResults.list({
  query: "blog post",
  locale: "en",
  page: { offset: 0, limit: 20 },
});

const secondPage = await client.searchResults.list({
  query: "blog post",
  locale: "en",
  page: { offset: 20, limit: 20 },
});
```

**Important:** This is the CMA-side search endpoint, which is different from the frontend Site Search API. It requires a search index to be configured via a build trigger with `indexing_enabled: true`. Without an active search index, queries will return no results.

---

## Audit Log Events

The `auditLogEvents` resource lets you query a history of all actions performed in your DatoCMS project. Use it to track who made changes, when, and to which entities.

```ts
const events = await client.auditLogEvents.query({
  filter: {
    event_type: "publish",
    entity_type: "item",
  },
  page: { limit: 10 },
});

for (const event of events) {
  console.log(event.event_type, event.entity_type, event.entity_id);
  console.log("Performed at:", event.created_at);
}
```

### Common Action Names

Individual record operations use the `items.*` prefix:

`items.create`, `items.update`, `items.destroy`, `items.publish`, `items.unpublish`, `items.duplicate`

Bulk record operations use a different prefix — `item_bulk_operations.*`:

`item_bulk_operations.destroy`, `item_bulk_operations.publish`, `item_bulk_operations.unpublish`

**Important:** Bulk operations log a single event with all affected record IDs in `request.payload.data.relationships.items`, not in the request path. The path for bulk operations is `/items/bulk/destroy` (or `/publish`, `/unpublish`). To find which records were affected by a bulk operation, inspect the payload rather than filtering by path.

Other common action names:

`environments.fork`, `environments.promote`, `roles.update`, `uploads.create`, `uploads.destroy`

### Common Entity Types

`item`, `item_type`, `field`, `upload`, `role`, `access_token`, `environment`, `webhook`, `build_trigger`

---

## Audit Log Filter Parameters

| Parameter | Type | Description |
|---|---|---|
| `filter.event_type` | `string` | Filter by event type (e.g. `"create"`, `"publish"`, `"destroy"`) |
| `filter.entity_type` | `string` | Filter by entity type (`item`, `item_type`, `field`, `upload`, etc.) |
| `filter.entity_id` | `string` | Filter by specific entity ID |
| `filter.user_type` | `string` | Filter by user type (`account`, `access_token`, `sso_user`) |
| `filter.user_id` | `string` | Filter by specific user ID |
| `filter.date_from` | `string` | ISO 8601 date — only events after this date |
| `filter.date_to` | `string` | ISO 8601 date — only events before this date |
| `page.limit` | `number` | Max results per page |

**Important:** Audit log events use cursor-based pagination, not offset/limit. The `query()` method returns a single page of results. To paginate through all results, use `rawQuery()` with cursor tokens as shown below.

---

## Cursor-Based Pagination for Audit Logs

The `rawQuery()` method gives you manual control over cursor-based pagination. Each response includes a `meta.next_token` when more results are available.

```ts
let nextToken: string | undefined;

do {
  const result = await client.auditLogEvents.rawQuery({
    filter: { entity_type: "item_type" },
    page: { limit: 50, ...(nextToken ? { token: nextToken } : {}) },
  });

  for (const event of result.data) {
    console.log(event.attributes.event_type, event.attributes.entity_id);
  }

  nextToken = result.meta?.next_token;
} while (nextToken);
```

**Important:** The `rawQuery()` response uses the raw JSON:API format. Event data lives under `result.data[].attributes` rather than being flattened like with `query()`.

### Filtering by Date Range

```ts
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const recentEvents = await client.auditLogEvents.query({
  filter: {
    entity_type: "field",
    date_from: sevenDaysAgo.toISOString(),
  },
  page: { limit: 50 },
});

for (const event of recentEvents) {
  console.log(event.event_type, event.entity_id, event.created_at);
}
```

---

## Type Reference

All types are imported from `@datocms/cma-client`:

```ts
import type {
  JobResult,
  SearchResult,
  SearchResultInstancesHrefSchema,
  AuditLogEvent,
  AuditLogEventQuerySchema,
} from "@datocms/cma-client";
```

> **Note:** These types are auto-generated from the DatoCMS API schema. Always refer to the installed package version as the source of truth, since fields may change between releases.

### Response Types

#### `JobResult`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | The job ID |
| `type` | `'job_result'` | JSON:API resource type |
| `status` | `number` | HTTP-style status code of the delayed response (`200` for success, `422` for failure) |
| `payload` | `null \| { [k: string]: unknown }` | JSON:API response body of the completed operation, or `null` if not yet available |

#### `SearchResult`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | The search result ID |
| `type` | `'search_result'` | JSON:API resource type |
| `title` | `string` | Title of the page |
| `body_excerpt` | `string` | First 200 characters of the page body, unformatted |
| `url` | `string` | URL of the matching page |
| `score` | `number` | Relevance score for the match |
| `highlight` | `{ title?: string[] \| null; body?: string[] \| null }` | Highlighted snippets from the title and body that matched the query |

#### `AuditLogEvent`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | The event ID |
| `type` | `'audit_log_event'` | JSON:API resource type |
| `action_name` | `string` | The actual action performed (e.g. `"create"`, `"publish"`, `"destroy"`) |
| `actor` | `{ type: string; id: string; name: string }` | The actor who performed the action. `type` can be `"account"`, `"user"`, `"sso_user"`, or `"access_token"`. `name` is a human-readable representation (name, email, or username depending on actor type) |
| `role` | `null \| { name: string; id: string }` | The role of the actor at the time the action was performed, or `null` if not applicable |
| `environment` | `{ id: string; primary: boolean }` | The environment inside which the action was performed. `primary` indicates whether it was the primary environment at the time |
| `request` | `{ path: string; method: string; id?: string; payload?: null \| { [k: string]: unknown } }` | The HTTP request that triggered the event. `path` is the full request path, `method` is the HTTP verb, `id` is the `X-Request-ID` header, and `payload` is the full request body |
| `response` | `null \| { status: number; payload: { [k: string]: unknown } }` | The HTTP response returned by DatoCMS, or `null`. Includes the status code and the full response body |
| `meta` | `{ occurred_at: string }` | Metadata for the event. `occurred_at` is the ISO 8601 date of when the event occurred |

### Input Types

#### `SearchResultInstancesHrefSchema`

Used as the parameter object for `client.searchResults.list()`.

| Field | Type | Required | Description |
|---|---|---|---|
| `page` | `{ offset?: number; limit?: number }` | No | Pagination parameters. `offset` is the zero-based index of the first result (defaults to `0`). `limit` is the maximum number of results to return (defaults to `20`, maximum `100`) |
| `filter` | `object` | Yes | Filter attributes (see sub-fields below) |
| `filter.query` | `string` | Yes | The text to search for |
| `filter.fuzzy` | `boolean` | No | When set, enables fuzzy search using Levenshtein Edit Distance to match more results |
| `filter.build_trigger_id` | `string` | No | The build trigger ID to search within. Required if more than one build trigger exists in the project |
| `filter.locale` | `string` | No | Restrict the search to pages in a specific locale |

#### `AuditLogEventQuerySchema`

Used as the parameter object for `client.auditLogEvents.rawQuery()`.

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `'audit_log_query'` | No | JSON:API resource type (automatically set by the client) |
| `filter` | `string` | No | An SQL-like expression to filter the events |
| `next_token` | `string` | No | Set this value to get remaining results when a `meta.next_token` was returned in the previous query response |
| `detailed_log` | `boolean` | No | Whether to return a detailed log complete with full request and response payloads |

---

## Complete Example: Query Audit Log for Recent Schema Changes

```ts
import { buildClient, ApiError } from "@datocms/cma-client-node";

const client = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN!,
});

async function queryRecentSchemaChanges() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateFromISO = sevenDaysAgo.toISOString();

  const schemaEntityTypes = ["item_type", "field"];
  const eventSummary: Record<string, number> = {};
  let totalEvents = 0;

  for (const entityType of schemaEntityTypes) {
    console.log(`\nQuerying ${entityType} events since ${dateFromISO}...`);

    let nextToken: string | undefined;

    do {
      const result = await client.auditLogEvents.rawQuery({
        filter: {
          entity_type: entityType,
          date_from: dateFromISO,
        },
        page: { limit: 50, ...(nextToken ? { token: nextToken } : {}) },
      });

      for (const event of result.data) {
        const eventType = event.attributes.event_type;
        const entityId = event.attributes.entity_id;
        const createdAt = event.attributes.created_at;

        const summaryKey = `${entityType}:${eventType}`;
        eventSummary[summaryKey] = (eventSummary[summaryKey] || 0) + 1;
        totalEvents++;

        console.log(
          `  [${createdAt}] ${eventType} ${entityType} (ID: ${entityId})`,
        );
      }

      nextToken = result.meta?.next_token;
    } while (nextToken);
  }

  console.log("\n--- Summary ---");
  console.log(`Total schema events in the last 7 days: ${totalEvents}`);

  const sortedSummaryKeys = Object.keys(eventSummary).sort(
    (a, b) => eventSummary[b] - eventSummary[a],
  );

  for (const key of sortedSummaryKeys) {
    const [entityType, eventType] = key.split(":");
    console.log(`  ${entityType} ${eventType}: ${eventSummary[key]}`);
  }

  if (totalEvents === 0) {
    console.log("  No schema changes detected in the last 7 days.");
  }
}

queryRecentSchemaChanges().catch((error) => {
  if (error instanceof ApiError) {
    console.error("API error:", error.response.status, error.errors);
  } else {
    console.error(error);
  }
  process.exit(1);
});
```
