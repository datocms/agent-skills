# Resource gotchas

Use the selected execution mode's endpoint documentation for CRUD signatures. This file covers gotchas, runtime semantics and cross-cutting patterns.

In CLI mode, use `npx datocms cma:docs <resource> <action>`; command options live in `../../datocms-cli/references/direct-cma-calls.md` § cma:docs.

## Contents

- Webhooks (`webhooks`)
- Build triggers (`buildTriggers`)
- Scheduling (`scheduledPublication`, `scheduledUnpublishing`)
- Workflows (`workflows`)
- Saved filters (`itemTypeFilters`, `uploadFilters`)
- Plugins (`plugins`)
- Dashboard and schema menus (`menuItems`, `schemaMenuItems`)
- Upload tracks and tags (`uploadTracks`, `uploadTags`, `uploadSmartTags`)
- Audit log events (`auditLogEvents`)

## Webhooks (`webhooks`)

CLI lookup: `cma:docs webhooks` covers create/update/list/find/destroy, `events`/`filters`/`custom_payload` shape.

Operational notes:

- **Timeouts:** 2s connection, 8s execution per delivery. Heavy work must be deferred — return 200 fast, process async.
- **Auto-retry** (`auto_retry: true`): up to 7 retries — 2 min, 6 min, 30 min, 1 hr, 5 hrs, 1 day, 2 days.
- **Event lifecycle on draft/published:** create → `create`, publish → `publish`, edit-published → `update`, re-publish → `publish`, unpublish → `unpublish`, delete-published → `unpublish` + `delete`. On models without draft/published: create → `create` + `publish`, update → `update` + `publish`, delete → `unpublish` + `delete`.
- **Cache-tag invalidation** (`entity_type: "cda_cache_tags"`, `event_types: ["invalidate"]`): does **not** support filters — always fires for all cache tag changes; cannot narrow to specific models/records. Payload carries `entity.attributes.tags: string[]`. For architectural patterns, see `../../datocms-cda/references/draft-caching-environments.md`.
- **Webhook history:** `client.webhookCalls.listPagedIterator({ filter: { webhook_id } })` lists past deliveries; `client.webhookCalls.resendWebhook(callId)` re-delivers failed call.

## Build triggers (`buildTriggers`)

CLI lookup: `cma:docs buildTriggers` covers create/update/list/find/destroy, adapters (`custom`, `netlify`, `vercel`, `gatsby_cloud`, `circle_ci`, `github_actions`, `travis_ci`, etc.), trigger/abort actions, `build_events`.

Operational notes:

- `autotrigger_on_scheduled_publications: true` bridges scheduling and deploys — without it, scheduled publish/unpublish does **not** trigger build.

## Scheduling (`scheduledPublication`, `scheduledUnpublishing`)

CLI lookup: `cma:docs scheduledPublication`, `cma:docs scheduledUnpublishing` cover create/destroy, `selective_publication` shape (`{ content_in_locales, non_localized_content }`).

Operational notes:

- `publication_scheduled_at` / `unpublishing_scheduled_at` must be ISO 8601 **in the future** — past timestamps rejected.
- Single record can carry both scheduled publication and scheduled unpublishing simultaneously — time-limited visibility window (publish on Christmas, unpublish on New Year's).
- Scheduled publication triggers deploy only if relevant build trigger has `autotrigger_on_scheduled_publications: true`.

## Workflows (`workflows`)

CLI lookup: `cma:docs workflows` covers create/update/list/find/destroy, `stages` array shape.

Operational notes:

- Exactly one stage in `stages` must have `initial: true` — new draft records land there.
- Assign workflow to model via `client.itemTypes.update(modelId, { workflow: { id, type: "workflow" } })` — workflows not linked at creation.
- Move records between stages via `client.items.bulkMoveToStage({ items: [{ id, type: "item" }], stage: "review" })` — bulk endpoint is the only API, even for single record.

## Saved filters (`itemTypeFilters`, `uploadFilters`)

CLI lookup: `cma:docs itemTypeFilters`, `cma:docs uploadFilters` cover create/update/list/find/destroy, `filter` / `columns` / `order_by` / `shared` attributes.

Operational notes:

- `filter` object mirrors **UI's internal filter state** — exact shape depends on which field/meta filters are active in dashboard. Copy from saved view in UI rather than hand-writing.
- `order_by` uses field-name + direction suffix: `"_updated_at_DESC"`, `"_created_at_ASC"`, `"<field_api_key>_ASC"`.
- `shared: true` makes filter visible to all team members; `false` keeps it private to creator. No per-role visibility.

## Plugins (`plugins`)

CLI lookup: `cma:docs plugins` covers create/update/list/find/destroy/fields and plugin attributes.

Operational notes:

- Pass exactly one of `package_name` (marketplace) or `url` (custom) to `client.plugins.create()` — never both.
- `parameters` is project-specific global configuration; modern plugins define its shape in their code. `parameter_definitions` describes legacy plugins only.
- `client.plugins.fields(pluginId)` finds fields using that installation. Duplicating a plugin in the CMS does not copy those editor/addon assignments; reassign the intended test fields explicitly.
- Update `enabled` to disable or re-enable an installation without deleting its configuration. Disabled plugins do not run.

For modern plugins, these updates affect the selected installation; use a [development copy](../../datocms-plugin/references/project-scaffold.md#development-copy) when the original must remain available:

- **Marketplace to private:** update `url`; this clears the package/version association.
- **Private to Marketplace:** update `package_name`; this preserves `parameters` and replaces package metadata and permissions. Send it separately from other attributes except optional `enabled`.
- **Published version:** update `package_version` on a Marketplace installation to select that version.

**SDK compatibility:** Check that the installed SDK supports and serializes `enabled` and `package_name` on update. Older versions can omit these newer attributes; a TypeScript cast does not add serialization support. Use a supporting SDK version or, when an upgrade is unavailable, the documented JSON:API request through `client.request()` or the CMS actions described above.

For that raw fallback, the update is `PUT /plugins/:id` and JSON:API `data.type` is singular `"plugin"`. For example, switching an installation and disabling it while preserving its parameters:

```ts
const pluginId = "EXISTING_INSTALLATION_ID";
await client.request({
  method: "PUT",
  url: `/plugins/${pluginId}`,
  body: {
    data: {
      type: "plugin",
      id: pluginId,
      attributes: {
        package_name: "datocms-plugin-example",
        enabled: false,
      },
    },
  },
});
const affectedFields = await client.plugins.fields(pluginId);
```

Omitting `parameters` retains the saved global settings. The raw request bypasses the older SDK attribute allowlist; casting a simplified `plugins.update()` payload does not.

## Dashboard and schema menus (`menuItems`, `schemaMenuItems`)

CLI lookup: `cma:docs menuItems`, `cma:docs schemaMenuItems` cover create/update/list/find/destroy, `label` / `position` / `parent` / `item_type` / `external_url` attributes.

Operational notes:

- Leaf `menu_item` references either `item_type` **or** `external_url`, never both. Parent folder typically has neither — just groups children by `parent`.
- `position` is **per-parent** — siblings under same `parent` (or top-level when `parent` is null) ordered by `position` numbers; positions across different parents independent.
- Reordering done by updating `position` on each affected sibling — API does not expose "move up/down" or "reorder" action.

## Upload tracks and tags (`uploadTracks`, `uploadTags`, `uploadSmartTags`)

CLI lookup: `cma:docs uploadTracks`, `cma:docs uploadTags`, `cma:docs uploadSmartTags` cover CRUD surface, attributes.

Operational notes:

- **Track creation is async job.** Freshly created track returns with `status: "preparing"`; poll `client.uploadTracks.list(uploadId)` until `status: "ready"` (or `"errored"` with populated `error` field) before treating track as available.
- `language_code` must be **BCP 47** (`"en"`, `"en-US"`, `"fr"`, `"pt-BR"`, …). `type` is `"subtitles"` or `"audio"`. `closed_captions: true` flags SDH (Deaf / Hard-of-hearing) variants.
- **Tags ≠ smart tags.** `client.uploadTags` is user-managed, project-wide tag dictionary; `client.uploadSmartTags` is AI-generated set tied to each upload (read-only, populated by DatoCMS image analysis pipeline). On `upload`, `tags: string[]` carries manual tags; smart tags surfaced through upload's smart-tags endpoint, not on upload object itself.
- Tracks are video-only — adding track to non-video upload errors at create time.

## Audit log events (`auditLogEvents`)

CLI lookup: `cma:docs auditLogEvents` covers `query` / `rawQuery`, filter parameters.

Operational notes:

- **Cursor pagination.** Audit log is the **only** resource that does not use offset/limit. `query()` returns single page, no `meta`; for full traversal use `rawQuery()`, send previous `result.meta.next_token` as `data.attributes.next_token` (no `page` param) until it returns `null`.
- `rawQuery()` returns raw JSON:API — event data sits under `result.data[].attributes`, not flattened like `query()`.
- **Action name prefix matters.** Single-record operations log under `items.*` (`items.create`, `items.publish`, `items.destroy`, …). Bulk operations log under `item_bulk_operations.*` (`item_bulk_operations.publish`, `item_bulk_operations.destroy`, …), emit **single event** with all affected record ids in `request.payload.data.relationships.items` — filtering by request path misses them.
- `detailed_log: true` on `rawQuery` returns full request/response payloads (heavier, useful for forensic debugging).
