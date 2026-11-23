---
name: datocms-cma
description: >-
  Load BEFORE the first command of any task that reads or changes DatoCMS
  records, uploads or schema through the Content Management API (CMA), the
  `datocms` CLI (`cma:call`, `cma:script`) or a DatoCMS MCP, even a one-record
  edit: writes to blocks, Structured Text and localized fields replace whole
  values, what a payload leaves out is deleted, and some operations publish.
  Covers records, blocks, locales, uploads, publishing, scheduling, restore,
  bulk imports/exports; direct changes to models, blocks and fields (types,
  validators, editors); roles/tokens, webhooks, installed plugins, environments;
  API errors; typed CMA scripts; the token or OAuth login such work needs.
  Includes short follow-ups ("publish them", "fix those slugs"). Building or
  rewriting a Structured Text document: also load `datocms-structured-text`.
  Schema inspection only, migrations, CLI setup, WordPress or Contentful
  imports: `datocms-cli`. GraphQL reads: `datocms-cda`. Modeling advice:
  `datocms-content-modeling`. Guided setup: `datocms-setup`.
---

# DatoCMS Content Management API Skill

CMA operations and scripts. For advice or code explanations, skip execution and setup. A short follow-up ("publish them") keeps the earlier task, route, project, environment and scope.

## 1. Select execution before setup

**Retired MCP request: no execution.** If the user requests a retired/legacy MCP or reports that their old local integration no longer works, reply: "That integration is retired. Use the [current DatoCMS MCP setup](https://www.datocms.com/docs/mcp-server)." Keep that link in the final answer and end the task without calling legacy or current DatoCMS tools, probing or repairing the old integration. Apply this stop condition before the normal route rules below, unless the user asks for the CLI or current MCP instead. A connection/authentication error alone does not establish that an integration is retired.

**CLI is the default whenever usable, even with MCP connected.** Override this only for the user's explicit tool choice or a route already used in this conversation. Usable means usable now, not merely installable; don't run startup connection checks or scan MCP client configuration.

- **Route lock:** once chosen, the live-operation route holds for the whole conversation, later requests on other topics included, until the user explicitly switches. MCP chosen → don't load **datocms-cli** or run CLI commands for live work, even schema lookups; CLI chosen → don't load `references/mcp.md` or call DatoCMS MCP tools.
- **Only the current MCP usable:** use it (`references/mcp.md`; its tools state their own contract), with no package installation, CLI login or project linking. **Neither usable:** name the missing prerequisite for this environment; MCP is optional, never a prerequisite. Missing CLI setup: **datocms-cli**, confirming the target project before linking (a single inferred candidate is not consent).
- **Local deliverable:** migrations, repo configuration and application code keep their local workflow; a remote call cannot stand in for a versioned migration or a file. Code that builds its own client (app/server, CI, cron): `references/client-setup-and-errors.md`, reusing existing client configuration and generated types.

**CLI quick path.** Look first with plain commands, which have nothing to type-check:

```bash
npx datocms schema:inspect <model_api_key> --fields-details=complete --environment=<env>   # fields, validators, editors, allowed blocks (the default prints fields only)
npx datocms cma:call items find <RECORD_ID> --params '{"nested": true}' --environment=<env>
```

Then change with ONE script that reads, builds the new values and writes once:

```bash
npx datocms cma:script --environment=<env> <<'EOF'
const record = await client.items.find<Schema.Article>("RECORD_ID", { nested: true });
// build the new field values from `record`, then:
await client.items.update<Schema.Article>(record.id, { /* changed fields only */ });
EOF
```

A single write of plain values (no blocks, locales or Structured Text) needs no script: `cma:call items update <RECORD_ID> --data '{"title": "New"}'`. Schema changes too: `cma:call itemTypes create`, `cma:call fields create <MODEL_ID>`.

- `client`, `Schema.*` and every export of `@datocms/cma-client-node`, `datocms-structured-text-utils` and `datocms-structured-text-dastdown`, functions and types (`buildBlockRecord`, `mapNodes`, `Span`, `Paragraph`…), are ambient: no imports, top-level `await`, no `export default`, no `node:` modules.
- A script containing `any`, `unknown`, `as never` or `@ts-ignore` is rejected before it runs, and it is type-checked against an ES2020 library (no `.at()`, no `replaceAll`). Let types be inferred from `record`. Type a helper's parameters with `typeof record.field`, a `Schema.X` or a node type. Narrow blocks and nodes with the guards (`isBlockOfType(Schema.X.ID, block)`, `isSpan(node)`), never with property checks or casts.
- `Schema.<Model>` is the model or block API key in PascalCase (`faq_entry` → `Schema.FaqEntry`). Put it on every `items` call: without it every field is `unknown`. Field values are nullable, and one locale of a localized value can be `undefined`: guard before use.
- Print what you need with `console.log`; nothing else comes back. A project must be linked or a token set.

`../datocms-cli/references/direct-cma-calls.md` documents `cma:call` and `cma:docs <resource> <action>` (the signature and payload of any method); `../datocms-cli/references/cma-script.md` only for file mode, flags, or a script the quick path does not get running. CLI hints in shared references apply to CLI work only: an MCP task never acquires a CLI prerequisite through them.

## 2. Establish scope and schema approach

Reuse the known project and environment; ask only when the target or the operation is ambiguous. Another tool never authorizes more actions, a different environment or publication. Inspect only the models and records the task touches (`../datocms-cli/references/schema-inspect.md` for `schema:inspect` filters; the schema tools in MCP mode).

- **Destructive schema change** (dropping fields or models, lossy field-type changes, narrowing a link or block validator's `item_types`, `bulk_destroy`): **datocms-cli** migration against a forked sandbox first. Never against primary without explicit, repeated user confirmation.
- **Other schema change:** needs `can_edit_schema`; confirm before changing primary directly. Unless already decided, ask whether the user wants a reviewable migration or a direct sandbox change; prefer migrations when the repo uses them; after an opt-out do not suggest them again. Versioned and replayable across environments → **datocms-cli** migration and local files.
- **Content operation** (publish/unpublish, record edits and deletion, bulk value updates, upload metadata): the selected route, no migration. Touch only the authorized records, fields, locales and publication state.

Load sibling guidance yourself; do not send the user from skill to skill. A local deliverable that cannot be produced here is reported as such, never replaced by a remote mutation.

## 3. Rules that reject writes or lose data

The API is strict where guesses usually go wrong. Hold these before building anything; the reference named in each group has the full rule and the exact names.

**Schema** — `references/schema.md`; every field type, validator and editor with parameters in `references/field-types.md`.

- Modular Content's `field_type` is `rich_text`. `link`, `links`, `rich_text`, `single_block` and `structured_text` fields are rejected without their item-type validator; `structured_text` needs `structured_text_blocks` and `structured_text_links`, and allows inline blocks only when `structured_text_inline_blocks` lists them.
- Validators and editors are per field type and their names and parameters are exact (`string_select` takes `options`, `string_radio_group` takes `radios`; `boolean`, `gallery`, `links` and `rich_text` have no `required`). Look them up, don't infer them. `appearance` always carries `editor`, `parameters` and `addons`.
- `fields.update` replaces the whole `validators` object. Removing a model from a link or block validator deletes the existing links or blocks. `field_type` converts only within five pairs, ignores every other attribute of that request, and drops validators and editor settings the new type does not carry over (`references/schema.md`): re-apply them in a second request.
- Model `api_key` must be singular; no key may have `_` right before a digit. Block models cannot have localized fields, `unique`, or fieldsets, and a model never converts to or from a block model.

**Content** — values per field type and limits in `references/records.md`; blocks, Structured Text and locales in `references/editing-records.md`.

- Odd value shapes: `json` is a JSON string, `color` is `{ red, green, blue, alpha }` 0–255, `file` is `{ upload_id, ... }`, a `null` string reads back as `""`, slugs are never generated by the API.
- A field you send replaces its whole value: blocks you leave out are deleted, and so is a locale left out of every localized field of the record, all sent together (left out of some only, with a localized field not sent, or on an `all_locales_required` model: rejected with `INVALID_LOCALES`). In a block field an ID string keeps a block, `{ id, ...changes }` edits it, an object with `item_type` adds one. When creating a record every block is an object. A block ID cannot move to another field, locale or record.
- All localized fields of a record share one set of locales: adding a locale means sending every localized field.
- Per record: 1,000 blocks, 5 block levels, 1 MB by default (`TECHNICAL_LIMIT_REACHED`; the project's real limits come from `client.publicInfo.find()`).
- Structured Text: `block` nodes only under `root`, `inlineBlock` inside text. Marks are `strong`, `emphasis`, `code`, `underline`, `strikethrough`, `highlight` (never `bold` / `italic`: the API stores an unknown name as a custom mark instead of rejecting it). The API normalizes the document it stores and does not enforce the editor's `nodes` / `marks` / `heading_levels`.
- `update` never publishes a draft-mode record. Blocks cannot be written, published or deleted on their own, only through their record.
- Publishing a record "with what it needs": publish that record only. When its link fields use `publish_references` the API publishes the linked records in the same transaction, all or nothing. Publishing them yourself one by one leaves the earlier ones live when a later one is refused; do it only when the strategy is `fail`, after checking every one is valid (`meta.is_valid`).
- Publishing some locales (`content_in_locales`) of a record with no published version: send `non_localized_content: true` too. The non-localized fields belong to that first version, so this is still "only that locale", not an extra publication (`references/records.md`).
- A model without draft mode (`draft_mode_active: false`) has no drafts: every write is live at once, and `itemVersions.restore` publishes the version it restores (with draft mode it adds an unpublished version). Read the model's setting before a restore or an edit that must not reach the website; when it cannot be done without going live, say so and change nothing.
- Rejections are `INVALID_FIELD` errors: `details.field` is the path (`sections.0.ctas.0.title`), `details.code` the reason (`VALIDATION_REQUIRED`, `INVALID_FORMAT`…).

## 4. Load only the relevant workflow

Method documentation gives API shapes; these references give DatoCMS workflows and gotchas. Load what the operation needs, once.

| Task | Reference |
| - | - |
| Record lifecycle, publication, versions, value of each field type, per-record limits, write errors | `references/records.md` |
| Modular Content, Single Block, nested blocks, Structured Text edits | `references/editing-records.md` (sections stand alone). Pure DAST work: `../datocms-structured-text/references/document-model.md` |
| Models, block models, fields, fieldsets | `references/schema.md` |
| Validators and editors per field type, their parameters, `default_value`, `api_key` rules | `references/field-types.md` |
| Localized fields, adding or backfilling a locale | `references/localization.md` with `references/editing-records.md` |
| Uploads and asset metadata | `references/uploads.md` |
| Filtering (creator audits included), querying, pagination | `references/filtering-and-pagination.md`, even when the SDK type accepts a broad object |
| Environments · roles, tokens, collaborators | `references/environments.md` · `references/access-control.md` |
| Migration scripts · local generated types | `references/migration-patterns.md` plus **datocms-cli** · `references/type-generation.md` |
| Raw methods, client behavior, platform limits · project settings, maintenance mode, usage | `references/client-types-and-behaviors.md` · `references/project-settings-and-usage.md` |
| Webhooks/build triggers, scheduling/workflows, menus, plugins, saved filters, upload tracks/tags, audit logs | Matching section of `references/resource-gotchas.md` |

## 5. Build the operation

- Complete collections: `listPagedIterator()` with `for await...of`. For `items` with `nested: true`, keep `perPage` ≤ 30 (default): API rejects larger pages; iterator won't lower it. Nested records: own fields flattened (`record.title`), embedded blocks keep theirs under `block.attributes`.
- Never rebuild a record from a partial read: read with `nested: true`, change what was asked, keep the rest (fields, locales, blocks, links, upload metadata). Structured Text: text round-trip, then typed node/block changes, then root appends, as `references/editing-records.md` orders them.
- Simplified API by default; raw methods only for JSON:API payloads or relationship metadata. Client code of your own reads credentials from environment variables, uses least privilege and targets the sandbox explicitly; CLI globals and file-mode conventions do not carry into another runtime.
- Errors: `ApiError` and `TimeoutError` at the operation boundary. Report authentication and permission failures as they are; never route around them. After a timeout or a missing write response the outcome is unknown: read the state before any retry, and never replay the write through another route or tool.

## 6. Verify and report

To check that validators reject and accept what they should, use `client.items.validateNew(...)`: nothing is saved (`references/records.md`). Delete any record created only as a test before finishing (a leftover blocks later records through `unique`), and confirm it is gone.

Read back from the same project and environment: the requested change, and that unrelated content, locales, links and publication state are as they were (compare saved values with a snapshot of the original read; object identity and the payload sent prove nothing, since nested reads expand IDs and partial updates). Publishing requires its own authorization. Report what was executed and verified, partial or uncertain outcomes included; for local code, say whether it was validated or run live.

## Other tasks

**datocms-cli**: CLI configuration, migrations, schema generation, environments, imports, plugin management, multi-project sync, CI/CD. **datocms-setup**: a setup planned or walked through. **datocms-structured-text**: pure DAST construction, inspection, editing, conversion (combine with this skill when a CMA operation persists the document). **datocms-cda**: GraphQL reads. **datocms-frontend-integrations**: framework code. **datocms-plugin**: plugins. **datocms-content-modeling**: modeling decisions.

Missing sibling reference → install that skill from `datocms/agent-skills` or update the full bundle.
