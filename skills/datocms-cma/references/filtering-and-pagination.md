# Filtering and Pagination

Covers querying patterns for listing records: pagination, filtering, sorting, counting.

> Endpoint shapes / payloads / TS sigs: `npx datocms cma:docs {items|uploads|webhookCalls|buildEvents|itemVersions} instances` (add `--expand-types '*'` for full TS definitions). Only what docs don't carry below.

## Always use `listPagedIterator`

Every paginated resource (`items`, `uploads`, `webhookCalls`, `buildEvents`, `itemVersions`) exposes `listPagedIterator()` alongside `list()`. Reach for the iterator unconditionally — manual offset/limit loops are an anti-pattern: they are easy to get wrong (off-by-one, infinite loop on empty pages, no resilience to mid-iteration deletions) and you do not need them.

```ts
for await (const record of client.items.listPagedIterator<Schema.BlogPost>(
  { filter: { type: "blog_post" } },
  { perPage: 100, concurrency: 5 },
)) { /* ... */ }
```

### `concurrency` — the one rule that matters

Default is `1` (sequential). Higher values fetch pages in parallel — great for read-only scans, dangerous when the loop body writes.

- **Read-only loop** (export, count, audit): set `concurrency: 5`–`10`. Pages arrive faster, the rate limiter still protects you (60 req / 3s).
- **Loop that writes** (backfill, transformation): leave `concurrency: 1`. Each iteration's read + write spends two requests against the budget; parallel fetches just race the writes for the same budget and burn it faster, often hitting 429s without going faster overall.

### Page size cap with `nested: true`

`perPage` defaults to 30, max 500. **But** when the query includes `nested: true` (Modular Content / Structured Text / Single Block returned as full payloads), the API caps page size at **30**. The iterator handles this transparently — but it means a 5,000-record nested scan does \~167 round-trips instead of 10. Plan timeouts and progress logging accordingly.

### Audit log is the exception

`client.auditLogEvents` uses cursor pagination (not offset/limit) and has no `listPagedIterator`. See `references/resource-gotchas.md` § Audit log events for the `rawQuery` + `meta.next_token` loop.

## Filter combinations that bite

The `filter` object accepts `ids`, `type`, `query`, `fields`, `only_valid`, but not all combinations are valid. The errors here are runtime-only — TypeScript will not catch them:

- `filter.fields` (model-specific fields) and `order_by` on a field require a **single** `filter.type` value. Comma-separated multi-type filters disallow them.
- `filter.ids` cannot be combined with `filter.type` or `filter.fields` (model-specific). It can be combined with meta-field filters like `_published_at`, `_status`.
- For block models, only `filter.type` works — `query`, `filter.fields`, and `filter.ids` are rejected.

Default to a model-scoped `filter.type`. Omit it deliberately for a cross-model query, such as an audit of records created by a specific collaborator or API token; use supported meta-field filters rather than model-specific fields.

## Filter by creator (CMA only)

`filter.fields._creator` accepts `eq`, `neq`, `in`, and `notIn`. References contain both `type` and `id`; copy the record's `creator` value rather than assuming every creator is a user. Types are `user`, `account`, `organization`, `sso_user`, or `access_token`. `in` / `notIn` accept arrays and may mix creator types. This filter is not available in CDA GraphQL.

The published `@datocms/cma-client` 6.1.3 declarations omit `_creator`. This narrow extension keeps the query typed with that version while sending the supported API filter (`ApiTypes` comes from the client package, or is ambient in `cma:script`):

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

With generated schemas, use `Schema.AnyModel` for the cross-model result and narrow by model before reading model-specific fields. For a scoped query, retain the matching model generic and `filter.type`.

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

This is the canonical zero-read count — no records fetched, just the count header. See `references/client-types-and-behaviors.md` § Raw vs Simplified.

## Filtering with typed schemas

`items.list<Schema.Article>` (and `listPagedIterator<Schema.Article>`) constrain `filter.fields` keys to that model's actual fields, and constrain `order_by` to its sortable fields. Without the generic, those keys are `string` and typos compile silently. If the project has generated `Schema` markers, always pass them — see `references/type-generation.md`.
