---
name: datocms-cda
description: >-
  Query the DatoCMS Content Delivery API (CDA) — the read-only GraphQL API —
  using @datocms/cda-client. Use when users ask for GraphQL content reads:
  fetching posts/pages/projects, filtering by date/text/fields, sorting/order,
  pagination/load-more, text pattern matching via regex filters, localization and fallback locales,
  modular content fragments, Structured Text (DAST) with blocks/inline records,
  responsive images (srcset/blur-up/imgix), SEO metadata (_seoMetaTags, favicons,
  global SEO), video/Mux fields, draft or preview reads, environment-targeted
  reads, cache tags via rawExecuteQuery, why responses miss the CDN cache or
  hit rate limits, and Content Link metadata for visual editing. Also use for CDA query type generation with gql.tada or GraphQL Code
  Generator.
---

# DatoCMS Content Delivery API Skill

Expert at querying DatoCMS CDA (read-only GraphQL) using `@datocms/cda-client`. Follow steps in order.

## Step 1: Detect Context

If context already established, skip broad detection. Re-inspect only when needed.

Examine project setup:

1. Read `package.json` for `@datocms/cda-client`. Not installed? `npm install @datocms/cda-client`

2. Find existing `executeQuery` or `rawExecuteQuery` imports to understand usage patterns.

3. Check `.env*` files (incl. `.env.example`) for `*DATOCMS*TOKEN*` vars; reuse those names. Starters: `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`, `DATOCMS_DRAFT_CONTENT_CDA_TOKEN`.

4. Check framework (Next.js, Astro, Remix, Nuxt, SvelteKit) to determine server vs client queries. Don't expose tokens to browser unless using public read-only token.

5. Check type generation setup:
   - **gql.tada:** `gql.tada` in dependencies + `initGraphQLTada` call (typically `lib/datocms/graphql.ts`)
   - **graphql-codegen:** `@graphql-codegen/cli` in devDependencies + `graphql.config.ts`
   - Context only — match existing setup. Don't suggest setting up type generation.

**CDA only needs read-only token**. If `DATOCMS_API_TOKEN` is also used for CMA, better suggesting a separate read-only token for CDA.

## Step 2: Load References

Clear request? Proceed directly. Read only relevant references from `references/`:

| Task | Reference |
| - | - |
| Basic (fetch by slug/ID, single-instance, collections, meta) | `references/querying-basics.md` |
| Filtering (field/meta filters, AND/OR, deep, uploads) | `references/filtering.md` |
| Pagination & ordering (first/skip, auto, sort, trees) | `references/pagination-and-ordering.md` |
| Localization (localized fields, fallback, all-locale values) | `references/localization.md` |
| Modular content (blocks, fragments, nested blocks) | `references/modular-content.md` |
| Structured text (DAST value/blocks/links, render) | `references/structured-text.md` |
| Images & media (responsiveImage, imgix, placeholders, focal, video) | `references/images-and-videos.md` |
| SEO & meta (`_seoMetaTags`, favicons, `globalSeo`, OG tags) | `references/seo-and-meta.md` |
| Draft/preview, strict mode, reading cache tags, CDN, environments, Content Link query options | `references/draft-caching-environments.md` |
| Type generation (gql.tada, graphql-codegen, schema types, typed queries) | `references/type-generation.md` |
| gql.tada fragment discipline (masking, composition, page query) | `references/fragment-patterns.md` |
| Client setup/wrappers, options, token permissions, `ApiError` handling, 429/complexity/CDN diagnostics, custom scalars | `references/client-and-config.md` |

**Cross-cutting:**

- Filtering localized → `references/localization.md`
- Structured text with modular content → `references/modular-content.md`
- Images in blocks → `references/images-and-videos.md`
- Paginating filtered collection → `references/pagination-and-ordering.md`
- Complex nesting → `references/pagination-and-ordering.md` for complexity costs
- Writing/extending fragments in a `gql.tada` project → `references/fragment-patterns.md`

## Step 3: Mandatory Rules to Generate Code

Also apply every Step 4 check while writing.

### Client Usage

- **Default: `executeQuery`** from `@datocms/cda-client` (or repo's existing wrapper around it)
- Use **`rawExecuteQuery`** only if response headers are needed (cache tags)

### GraphQL Queries

- Write as **template literal strings** (unless project uses `TypedDocumentNode` / `gql.tada`)
- Request **only needed fields** — don't over-fetch
- Use DatoCMS custom scalars in declarations (`$first: IntType`, `$id: ItemId`)
- Match project convention; `/* GraphQL */` prefix enables editor highlighting/validation

```js
const query = /* GraphQL */ `query { ... }`
```

### Error Handling

- **No custom retry logic** — `autoRetry` handles rate limits

## Step 4: Verify

Before presenting final code:

1. **Token** — env variable (never hardcode), read permissions
2. **Error handling** — `ApiError` caught at boundaries
3. **Pagination** — 500+ records? use `executeQueryWithAutoPagination`
4. **Draft mode** — `includeDrafts` intentional (not exposing unpublished in prod)
5. **`excludeInvalid`** — recommend for stable schemas. Changing schema? use `filter: { _isValid: { eq: true } }` instead
6. **Type safety** — no `as` / `as unknown as` to silence errors
7. **Imports** — CDA from `@datocms/cda-client`; keep generated GraphQL helpers if type-gen wired
8. **Variables** — all dynamic via GraphQL variables, no interpolation
9. **Structured text** — all relevant sub-fields (`value`, `blocks`, `links`, `inlineBlocks`); omitting = silent data loss
10. **Fetch integration** — framework-native `fetch`, tagging, custom plumbing? use `buildRequestHeaders()` / `buildRequestInit()`
11. **Type generation** — gql.tada or graphql-codegen? use project's `graphql()` function, check scalar mappings
12. **gql.tada fragments** — composition array mirrors every `...Fragment` spread; follow project's masking setup (see `references/fragment-patterns.md`)

## Cross-Skill Routing

This skill covers **reading via GraphQL CDA**. Route to companion skill for:

| Condition | Route to |
| - | - |
| DAST structure or validation | **datocms-structured-text** — [document model](../datocms-structured-text/references/document-model.md) |
| DAST traversal/editing; Markdown/HTML import or format export | **datocms-structured-text** — [editing](../datocms-structured-text/references/editing.md) or [conversion](../datocms-structured-text/references/conversion.md) |
| Mutating content, schema/uploads/webhooks, scripts (including REST queries) | **datocms-cma** |
| App wiring: draft mode endpoints, Web Previews, Content Link overlays, realtime subscriptions, cache-tag invalidation (revalidation, CDN purge) | **datocms-frontend-integrations** |
| Building plugin | **datocms-plugin** |

Query side of that wiring stays here: `includeDrafts`, `contentLink` / `baseEditingUrl` / `_editingUrl`, reading `x-cache-tags` via `rawExecuteQuery`.

Load the specialist only for a DAST task; ordinary GraphQL selection stays here. Missing sibling reference → install that skill from `datocms/agent-skills` or update the full bundle.
