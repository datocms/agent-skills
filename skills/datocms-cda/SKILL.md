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
  reads, cache tags via rawExecuteQuery, and Content Link metadata for visual
  editing. Also use for CDA query type generation with gql.tada or GraphQL Code
  Generator.
---

# DatoCMS Content Delivery API Skill

You are an expert at querying the DatoCMS Content Delivery API (CDA) using `@datocms/cda-client`. The CDA is a **read-only GraphQL API** — it has no mutations. All content changes go through the CMA (Content Management API). Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context

If the project context is already established in this conversation (client package, token variable, framework, type generation setup), skip broad detection below. Re-inspect only when a question cannot be answered from prior context.

Silently examine the project to determine setup and configuration.

1. Read `package.json` and check for `@datocms/cda-client`.
   - If not installed, recommend: `npm install @datocms/cda-client`

2. Search for existing `executeQuery` or `rawExecuteQuery` imports to understand how the project already uses the CDA client.

3. Check `.env`, `.env.local`, or similar files for a DatoCMS API token. Look for variable names like:
   - `DATOCMS_CDA_TOKEN`
   - `DATOCMS_READONLY_TOKEN`
   - `DATOCMS_API_TOKEN`
   - `NEXT_PUBLIC_DATOCMS_CDA_TOKEN`

4. Check the framework context (Next.js, Astro, Remix, Nuxt, SvelteKit, etc.) to determine whether queries run on the server or client. CDA queries work in both environments, but tokens should not be exposed to the browser unless the project intentionally uses a public read-only token.

5. Check for existing type generation setup:
   - **gql.tada:** Look for `gql.tada` in `package.json` dependencies and an `initGraphQLTada` call (typically in `lib/datocms/graphql.ts`)
   - **graphql-codegen:** Look for `@graphql-codegen/cli` in devDependencies and a `graphql.config.ts` file
   - This detection is for context only — use it to write queries that match the project's existing setup (e.g., using the project's `graphql()` function instead of plain strings). Do **not** proactively suggest setting up type generation.

**Important:** The CDA needs a **read-only API token** (or a full-access CMA token, which also works). If you see a token named `DATOCMS_API_TOKEN` used for CMA operations, the user may need a separate read-only token for the CDA, or they can reuse the CMA token if appropriate.

---

## Step 2: Understand the Task

Classify the user's task into one or more categories:

| Category | Examples |
| - | - |
| **Basic querying** | Fetch records by slug/ID, query single-instance models, list collections |
| **Filtering** | Filter by field values, AND/OR logic, meta field filters, deep filtering |
| **Pagination & ordering** | Paginate large collections, sort results, tree/hierarchical queries |
| **Localization** | Query localized fields, fallback locales, all-locale values |
| **Modular content** | Query block fields with GraphQL fragments, nested blocks |
| **Structured text** | Query DAST value/blocks/links, render with framework components |
| **Images & media** | Responsive images, imgix transforms, placeholders, focal points, video |
| **SEO & meta** | `_seoMetaTags`, favicons, `globalSeo`, Open Graph tags |
| **Draft/preview & caching** | Draft mode, strict mode, cache tags, CDN invalidation, Content Link |
| **Type generation** | Set up gql.tada, configure graphql-codegen, generate schema types, typed queries |

If the user's request is clear, skip clarifying questions and proceed directly.

---

## Step 3: Load References

Based on the task classification, read the appropriate reference files from the `references/` directory next to this skill file. **Always** load the core client reference. Only load what is relevant — do not load everything.

**Always load:**

- `references/client-and-config.md` — Client setup, options, error handling, limits, scalars

**Load per category:**

| Task category | Reference file |
| - | - |
| Basic querying (records, collections, meta) | `references/querying-basics.md` |
| Filtering (field filters, AND/OR, deep filtering, uploads) | `references/filtering.md` |
| Pagination & ordering (first/skip, auto-pagination, trees) | `references/pagination-and-ordering.md` |
| Localization | `references/localization.md` |
| Modular content (blocks, fragments) | `references/modular-content.md` |
| Structured text (DAST, rendering) | `references/structured-text.md` |
| Images & media (responsiveImage, video) | `references/images-and-videos.md` |
| SEO & meta tags | `references/seo-and-meta.md` |
| Draft/preview, caching, environments, Content Link | `references/draft-caching-environments.md` |
| Type generation (gql.tada, graphql-codegen, schema types) | `references/type-generation.md` |

**Load cross-cutting references when needed:**

- If filtering localized fields → also load `references/localization.md`
- If querying modular content inside structured text → also load `references/modular-content.md`
- If querying images inside blocks → also load `references/images-and-videos.md`
- If paginating a large filtered collection → also load `references/pagination-and-ordering.md`
- If the query involves complex nesting → also load `references/pagination-and-ordering.md` for complexity costs

---

## Step 4: Generate Code

Write the code following these mandatory rules:

### Client Usage

- **Default to `executeQuery`** from `@datocms/cda-client`, or the repo's existing wrapper around it (not raw `fetch`)
- Use `buildRequestHeaders()` / `buildRequestInit()` when the framework needs integrated `fetch` handling, request tagging, or custom request plumbing
- Use **`executeQueryWithAutoPagination`** when fetching more than 500 records
- Use **`rawExecuteQuery`** only when you need response headers (e.g., cache tags)
- Store the API token in an environment variable — never hardcode it

### GraphQL Queries

- Write queries as **template literal strings** (unless the project uses `TypedDocumentNode` / `gql.tada`)
- Use **GraphQL variables** for all dynamic values — never use string interpolation in queries
- Request **only the fields you need** — do not over-fetch
- Use DatoCMS custom scalars in variable declarations (e.g., `$first: IntType`, `$id: ItemId`)

### Structured Text

- Always query **all relevant sub-fields** (`value`, `blocks`, `links`, `inlineBlocks`) when the structured text field uses them — omitting any causes silent data loss

### Error Handling

- Catch `ApiError` from `@datocms/cda-client` at appropriate boundaries
- Do **not** add custom retry logic — `autoRetry` handles rate limits automatically

### TypeScript

- Follow the TypeScript strictness rules: no `as unknown as`, no unnecessary `as` casts
- Let TypeScript infer types wherever possible
- Use `import type { ... }` for type-only imports

---

## Step 5: Verify

Before presenting the final code:

1. **Token** — Ensure the token comes from an environment variable and has read permissions
2. **Error handling** — Ensure `ApiError` is caught at appropriate boundaries
3. **Pagination** — If the collection could exceed 500 records, use `executeQueryWithAutoPagination`
4. **Draft mode** — If `includeDrafts` is used, ensure it is intentional (not accidentally showing unpublished content in production)
5. **`excludeInvalid`** — Recommend for stable schemas. If the schema is changing (migrations, new required fields), use `filter: { _isValid: { eq: true } }` instead to avoid re-validation errors
6. **Type safety** — No type assertions (`as`) used to silence errors
7. **Imports** — CDA client imports come from `@datocms/cda-client`; keep project-generated GraphQL helper imports when type generation is already wired
8. **Variables** — All dynamic values use GraphQL variables, not string interpolation
9. **Structured text completeness** — If querying structured text, all relevant sub-fields (`value`, `blocks`, `links`, `inlineBlocks`) are included
10. **Fetch integration** — If the solution uses framework-native `fetch`, ensure CDA headers/init come from `buildRequestHeaders()` / `buildRequestInit()` instead of hand-rolled request wiring
11. **Type generation** — If the project uses gql.tada or graphql-codegen, ensure queries use the project's `graphql()` function (not plain template literal strings) and that scalar mappings are configured

---

## Cross-Skill Routing

This skill covers **reading content via the GraphQL CDA**. If the task involves any of the following, activate the companion skill:

| Condition | Route to |
| - | - |
| Mutating content, managing schema/uploads/webhooks, writing scripts (including querying records via REST for scripts) | **datocms-cma** |
| Setting up draft mode endpoints, Web Previews, Content Link, real-time subscriptions, or cache tags in a framework | **datocms-frontend-integrations** |
| Building a DatoCMS plugin | **datocms-plugin-builder** |
