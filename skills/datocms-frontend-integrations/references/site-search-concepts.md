# Site Search Concepts

Shared concepts for DatoCMS Site Search widgets across React and Vue. For framework-specific hooks/composables and rendering patterns, see the dedicated framework reference.

## How It Works

The `useSiteSearch` hook/composable manages all search form logic: query text, pagination, and locale filtering. It calls the DatoCMS Search API internally via a CMA client. You control the rendering.

## Required Dependencies

Both React and Vue implementations require `@datocms/cma-client-browser`:

```js
import { buildClient } from '@datocms/cma-client-browser';

// siteSearchToken: the search-only token, read from a browser-visible env var, never inlined.
const client = buildClient({ apiToken: siteSearchToken });
```

Use a dedicated search-only token and role, configured as described in [Site Search API prerequisites](site-search-api.md#dato-side-prerequisites). The token's CMA transport flag must be enabled even though its role grants no content-management actions.

## Initialization Options

| Option | Type | Required | Default | Description |
| - | - | - | - | - |
| `client` | CMA Client instance | Yes | — | Instance from `buildClient()` of `@datocms/cma-client-browser` |
| `searchIndexId` | string | Yes | — | Search index ID, read from a browser-visible env var like the token |
| `fuzzySearch` | boolean | No | `false` | Enable approximate matching |
| `resultsPerPage` | number | No | `8` | Results per page |

## State Behavior

The hook/composable returns a `state` object with the current query, locale, and page. Changing any state value triggers a new API request automatically.

On localized pages, initialize the locale filter from the validated route locale. Keep it in sync when navigation changes that locale, and reset pagination when the query or locale changes. A language selector alone does not make `/it/search` default to Italian results.

- **React:** Use setter functions (`state.setQuery()`, `state.setPage()`, `state.setLocale()`)
- **Vue:** Use direct assignment or `v-model` (`state.query = ...`, `state.page = ...`)

## Loading and Error States

- If both `error` and `data` are `undefined`/`null`, the search is loading — show a spinner
- `error` is a string message on API failure
- `data` contains `pageResults`, `totalResults`, and `totalPages` when available
