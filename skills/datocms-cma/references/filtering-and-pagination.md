# Filtering and Pagination

Covers querying patterns for listing records: pagination, filtering, sorting, counting.

> In CLI mode, endpoint shapes / payloads / TS signatures: `npx datocms cma:docs {items|uploads|webhookCalls|buildEvents|itemVersions} instances` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Use `listPagedIterator` for paginated reads

Every paginated resource (`items`, `uploads`, `webhookCalls`, `buildEvents`, `itemVersions`) exposes `listPagedIterator()` alongside `list()`. Prefer the iterator to hand-written offset/limit loops. It still uses offset pagination: changes to the matching records or their order during traversal can skip or repeat records.

```ts
for await (const record of client.items.listPagedIterator<Schema.BlogPost>(
  { filter: { type: "blog_post" } },
  { perPage: 100, concurrency: 5 },
)) { /* ... */ }
```

When writes change the query's filters or sort order — for example, publishing filtered drafts, deleting records, or changing the sort field — finish collecting the authorized record IDs before starting those writes. Then process that fixed selection, reading current values again when a transformation needs them. `concurrency: 1` does not prevent offset shifts; concurrent changes by other clients can also affect selection.

### `concurrency` — the one rule that matters

Default is `1` (sequential). Higher values fetch pages in parallel — great for read-only scans, dangerous when the loop body writes.

- **Read-only loop** (export, count, audit): set `concurrency: 5`–`10`. Pages arrive faster, the rate limiter still protects you (60 req / 3s).
- **Loop that writes** (backfill, transformation): leave `concurrency: 1`. Each iteration's read + write spends two requests against the budget; parallel fetches just race the writes for the same budget and burn it faster, often hitting 429s without going faster overall.

### Page size cap with `nested: true`

`perPage` defaults to 30, max 500. **But** when the query includes `nested: true` (Modular Content / Structured Text / Single Block returned as full payloads), the API rejects page size > **30** (`INVALID_PARAMS`). The iterator doesn't lower `perPage` — keep default or ≤ 30. A 5,000-record nested scan does \~167 round-trips instead of 10. Plan timeouts and progress logging accordingly.

### Audit log is the exception

`client.auditLogEvents` uses cursor pagination (not offset/limit) and has no `listPagedIterator`. See `references/resource-gotchas.md` § Audit log events for the `rawQuery` + `meta.next_token` loop.

## Filter combinations that bite

The `filter` object accepts `ids`, `type`, `query`, `fields`, `only_valid`, but not all combinations are valid. The errors here are runtime-only — TypeScript will not catch them:

- `filter.fields` (model-specific fields) and `order_by` on a field require a **single** `filter.type` value. Comma-separated multi-type filters disallow them.
- `filter.ids` cannot be combined with `filter.type` or `filter.fields` (model-specific). It can be combined with meta-field filters like `_published_at`, `_status`.
- For block models, only `filter.type` works — `query`, `filter.fields`, and `filter.ids` are rejected.

Default to a model-scoped `filter.type`. Omit it deliberately for a cross-model query, such as an audit of records created by a specific collaborator or API token; use supported meta-field filters rather than model-specific fields.

## Filter by creator (CMA only)

`filter.fields._creator` accepts `eq`, `neq`, `in`, and `notIn`. References contain both `type` and `id`; copy the record's `creator` value rather than assuming every creator is a user. If the input is a record ID, fetch that record first and use its `creator`; the record ID string itself is not a creator reference. Types are `user`, `account`, `organization`, `sso_user`, or `access_token`. `in` / `notIn` accept arrays and may mix creator types. This filter is not available in CDA GraphQL.

For equality, send `{ filter: { fields: { _creator: { eq: creatorReference } } } }`. Use `Schema.AnyModel` for a cross-model result and narrow by model before reading model-specific fields. For a scoped query, retain the matching model generic and `filter.type`.

### Compatibility with missing SDK declarations

Use the installed SDK's filter types when they include `_creator`. If its declarations reject that field, apply a narrow extension such as the following example for `@datocms/cma-client` 6.1.3, whose declarations omit it. Use the runtime-provided `ApiTypes`, or import it from the client package:

```ts
const source = await client.items.find<Schema.BlogPost>(recordId);
if (!source.creator) throw new Error("Record has no creator reference");

type Fields = NonNullable<NonNullable<ApiTypes.ItemInstancesHrefSchema<Schema.AnyModel>["filter"]>["fields"]>;
const fields: Fields & { _creator: { eq: NonNullable<typeof source.creator> } } = {
  _creator: { eq: source.creator },
};

// Intentional cross-model audit. Add filter.type for a single-model query.
for await (const record of client.items.listPagedIterator<Schema.AnyModel>(
  { filter: { fields }, version: "current" },
  { concurrency: 5 },
)) {
  console.log(record.id, record.creator);
}
```

## Full-text search lag

`filter.query` runs against a search index that lags writes by \~30 seconds. Newly created or updated records won't appear in `query` results immediately. Don't read-back via `query` in tests or workflows that just wrote — either filter on `_created_at`/`ids` instead, or wait.

When using `filter.query`, sort by `order_by: "_rank_DESC"` to get relevance ordering — the default order is undefined for text search.

## Counting without fetching

The simplified `list()` drops the JSON:API envelope, so the total count is not exposed. Use `rawList` with `page.limit: 0`:

```ts
const { meta } = await client.items.rawList({
  filter: { type: "blog_post" },
  page: { limit: 0 },
});
const total = meta.total_count;
```

This is the canonical zero-read count — no records fetched, just the count header. See `references/client-types-and-behaviors.md` § When to Use Raw vs Simplified.

## Filtering with typed schemas

`items.list<Schema.Article>` (and `listPagedIterator<Schema.Article>`) constrain `filter.fields` keys to that model's actual fields, and constrain `order_by` to its sortable fields. Without the generic, those keys are `string` and typos compile silently. If the project has generated `Schema` markers, always pass them — see `references/type-generation.md`.
