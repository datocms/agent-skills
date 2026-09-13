# Content Delivery API

Query the read-only GraphQL CDA with `@datocms/cda-client`. Use [frontend](frontend.md) for framework endpoints/rendering and [CMA](cma.md) for REST content operations.

## Inspect the existing query code

Check the client dependency, existing `executeQuery`/`rawExecuteQuery` wrapper, framework runtime, and token variable names. Install the client only when implementation needs it. Keep tokens server-side unless the project intentionally uses a public read-only token.

Match existing query typing: plain strings, `TypedDocumentNode`, gql.tada, or GraphQL Code Generator. Do not introduce type generation during a narrow query task unless requested.

## Read the relevant references

Always read [client configuration](cda/client-and-config.md) for query implementation. Then select only the applicable rows:

| Need | Reference |
| - | - |
| Records, collections, meta fields | [Querying basics](cda/querying-basics.md) |
| Field filters, AND/OR, deep filters, uploads | [Filtering](cda/filtering.md) |
| Pagination, sorting, trees, complexity | [Pagination and ordering](cda/pagination-and-ordering.md) |
| Locales, fallback locales, all-locale values | [Localization](cda/localization.md) |
| Blocks, unions, nested modular content | [Modular content](cda/modular-content.md) |
| DAST, blocks, linked and inline records | [Structured Text](cda/structured-text.md) |
| Responsive images, imgix, placeholders, videos | [Images and videos](cda/images-and-videos.md) |
| Meta tags, favicons, global SEO | [SEO and meta](cda/seo-and-meta.md) |
| Draft reads, environments, cache tags, Content Link metadata | [Drafts, caching, environments](cda/draft-caching-environments.md) |
| gql.tada or GraphQL Code Generator | [Type generation](cda/type-generation.md) |
| Writing fragments in an existing gql.tada project | [Fragment patterns](cda/fragment-patterns.md) |

Combine references when concerns overlap, such as localized filters, images in blocks, or paginated filtered collections.

## Query conventions

- Default to `executeQuery` or the project's wrapper. Use `rawExecuteQuery` when response headers are needed.
- For native framework `fetch` integration, use `buildRequestHeaders()` or `buildRequestInit()`.
- Use `executeQueryWithAutoPagination` for collections above the per-page limit. Check complexity when expanding large nested queries.
- Use GraphQL variables for dynamic values. Do not interpolate values into the query string.
- Request only needed fields and use the documented custom scalars, such as `IntType` and `ItemId`.
- Use comment-tagged `/* GraphQL */` template strings unless existing typed helpers own the query.
- Structured Text queries include every relevant selection: `value`, `blocks`, `links`, and `inlineBlocks`.
- Catch `ApiError` at an appropriate boundary. The client handles rate-limit retries; do not add another retry loop.
- In gql.tada projects, preserve fragment masking, call `readFragment()` at the owning component boundary, and keep imports/composition arrays aligned with fragment spreads.

## Verify

Check read permissions and environment targeting, intentional draft visibility, query variables, pagination, error handling, and relevant Structured Text selections. Preserve the project's generated query helper and scalar mappings.

Recommend `excludeInvalid` for stable production schemas. During schema changes, consider `_isValid` filtering instead of narrowing the schema unexpectedly. Framework cache integration and visual-editing endpoints belong to [frontend](frontend.md); a complete requested installation uses [setup](setup.md).
