# Resource gotchas

For the resources below, the routine CRUD surface (payload shapes, attributes, validators, examples, client TypeScript signatures) lives in `npx datocms cma:docs <resource> <action>` — always up to date, generated live.

> **For the `cma:docs` command itself** (flags, naming convention, when to pass `--expand-types`, etc.), load the **datocms-cli** skill and read `../../datocms-cli/references/direct-cma-calls.md` § cma:docs. That is the single source of truth for the command surface.

This file is an index of *what is not obvious from `cma:docs` alone* — gotchas, runtime semantics, cross-cutting patterns. Do not duplicate signatures here.

---

## Webhooks (`webhooks`)

`cma:docs webhooks` covers create/update/list/find/destroy and the `events`/`filters`/`custom_payload` shape.

What `cma:docs` does **not** spell out:

- **Timeouts:** 2s connection timeout, 8s execution timeout per delivery. Heavy work must be deferred — return 200 fast, process async.
- **Auto-retry schedule** (when `auto_retry: true`): up to 7 retries — 2 min, 6 min, 30 min, 1 hr, 5 hrs, 1 day, 2 days.
- **Event lifecycle on draft/published models:** create → `create`, publish → `publish`, edit-published → `update`, re-publish → `publish`, unpublish → `unpublish`, delete-published → `unpublish` + `delete`. On models without draft/published: create → `create` + `publish`, update → `update` + `publish`, delete → `unpublish` + `delete`.
- **Cache-tag invalidation webhook** (`entity_type: "cda_cache_tags"`, `event_types: ["invalidate"]`): does **not** support filters — it always fires for all cache tag changes; you cannot narrow it to specific models/records. Payload carries `entity.attributes.tags: string[]`. For the architectural patterns (CDN-first vs framework-centric), see `skills/datocms-cda/references/draft-caching-environments.md`.
- **Webhook history:** `client.webhookCalls.listPagedIterator({ filter: { webhook_id } })` lists past deliveries; `client.webhookCalls.resendWebhook(callId)` re-delivers a failed call.

## Build triggers (`buildTriggers`)

`cma:docs buildTriggers` covers create/update/list/find/destroy, adapters (`custom`, `netlify`, `vercel`, `gatsby_cloud`, `circle_ci`, `github_actions`, `travis_ci`, etc.), trigger/abort actions, and `build_events`.

What `cma:docs` does **not** spell out:

- `autotrigger_on_scheduled_publications: true` is the bridge between scheduling and deploys — without it, scheduled publish/unpublish does **not** trigger a build.
- Indexed CMA search requires a build trigger with `indexing_enabled: true` configured before `searchResults.list()` returns anything (see "CMA search results" below).

---

## Scheduling (`scheduledPublication`, `scheduledUnpublishing`)

`cma:docs scheduledPublication`, `cma:docs scheduledUnpublishing` cover create/destroy and the `selective_publication` shape (`{ content_in_locales, non_localized_content }`).

What `cma:docs` does **not** spell out:

- `publication_scheduled_at` / `unpublishing_scheduled_at` must be ISO 8601 **in the future** — past timestamps are rejected.
- A single record can carry both a scheduled publication and a scheduled unpublishing simultaneously, creating a time-limited visibility window (e.g. publish on Christmas, unpublish on New Year's).
- For a scheduled publication to trigger a deploy, the relevant build trigger must have `autotrigger_on_scheduledPublications: true`.

## Workflows (`workflows`)

`cma:docs workflows` covers create/update/list/find/destroy and the `stages` array shape.

What `cma:docs` does **not** spell out:

- Exactly one stage in `stages` must have `initial: true` — that's where new draft records land.
- Assign a workflow to a model via `client.itemTypes.update(modelId, { workflow: { id, type: "workflow" } })` — workflows are not linked at creation time.
- Move records between stages via `client.items.bulkMoveToStage({ items: [{ id, type: "item" }], stage: "review" })` — the bulk endpoint is the only API, even for a single record.

---

## Saved filters (`itemTypeFilters`, `uploadFilters`)

`cma:docs itemTypeFilters`, `cma:docs uploadFilters` cover create/update/list/find/destroy and the `filter` / `columns` / `order_by` / `shared` attributes.

What `cma:docs` does **not** spell out:

- The `filter` object mirrors the **UI's internal filter state** — its exact shape depends on which field/meta filters are active in the dashboard. Copy it from a saved view in the UI rather than hand-writing it.
- `order_by` uses field-name + direction suffix: `"_updated_at_DESC"`, `"_created_at_ASC"`, `"<field_api_key>_ASC"`.
- `shared: true` makes the filter visible to all team members; `false` keeps it private to the creator. There is no per-role visibility.

---

## Plugins (`plugins`)

`cma:docs plugins` covers create/update/list/find/destroy and the `parameters` / `parameter_definitions` shape.

What `cma:docs` does **not** spell out:

- Pass exactly one of `package_name` (marketplace) or `url` (custom) to `client.plugins.create()` — never both.
- `parameters` is project-specific instance configuration; its shape derives from the plugin's `parameter_definitions` schema (set by the plugin author).
- "Find fields using a plugin" requires listing all fields and inspecting `appearance.editor` / `appearance.addons[].id` against the plugin id — there is no dedicated endpoint.

---

## Dashboard and schema menus (`menuItems`, `schemaMenuItems`)

`cma:docs menuItems`, `cma:docs schemaMenuItems` cover create/update/list/find/destroy and the `label` / `position` / `parent` / `item_type` / `external_url` attributes.

What `cma:docs` does **not** spell out:

- A leaf `menu_item` references either `item_type` **or** `external_url`, never both. A parent folder typically has neither — it just groups children by `parent`.
- `position` is **per-parent** — siblings under the same `parent` (or top-level when `parent` is null) are ordered by their `position` numbers; positions across different parents are independent.
- Reordering is done by updating `position` on each affected sibling — the API does not expose a "move up/down" or "reorder" action.

---

## Upload tracks and tags (`uploadTracks`, `uploadTags`, `uploadSmartTags`)

`cma:docs uploadTracks`, `cma:docs uploadTags`, `cma:docs uploadSmartTags` cover the CRUD surface and attributes.

What `cma:docs` does **not** spell out:

- **Track creation is an async job.** A freshly created track returns with `status: "preparing"`; poll `client.uploadTracks.list(uploadId)` until `status: "ready"` (or `"errored"` with a populated `error` field) before treating the track as available.
- `language_code` must be **BCP 47** (`"en"`, `"en-US"`, `"fr"`, `"pt-BR"`, …). `type` is `"subtitles"` or `"audio"`. `closed_captions: true` flags SDH (Deaf / Hard-of-hearing) variants.
- **Tags are not the same as smart tags.** `client.uploadTags` is the user-managed, project-wide tag dictionary; `client.uploadSmartTags` is the AI-generated set tied to each upload (read-only, populated by the DatoCMS image analysis pipeline). On an `upload`, `tags: string[]` carries the manual tags, and the smart tags are surfaced through the upload's smart-tags endpoint, not on the upload object itself.
- Tracks are video-only — adding a track to a non-video upload errors at create time.

---

## Audit log events (`auditLogEvents`)

`cma:docs auditLogEvents` covers `query` / `rawQuery` and the filter parameters.

What `cma:docs` does **not** spell out:

- **Cursor pagination.** Audit log is the **only** resource that does not use offset/limit. `query()` returns a single page; for full traversal use `rawQuery()` and feed `result.meta.next_token` back as `page.token` until it stops appearing.
- `rawQuery()` returns raw JSON:API — event data sits under `result.data[].attributes`, not flattened like with `query()`.
- **Action name prefix matters.** Single-record operations log under `items.*` (`items.create`, `items.publish`, `items.destroy`, …). Bulk operations log under `item_bulk_operations.*` (`item_bulk_operations.publish`, `item_bulk_operations.destroy`, …) and emit a **single event** with all affected record ids in `request.payload.data.relationships.items` — filtering by request path will miss them.
- `detailed_log: true` on `rawQuery` returns full request/response payloads (heavier, useful for forensic debugging).
