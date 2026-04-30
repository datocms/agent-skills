# Real-Time Updates Concepts

This reference covers real-time content updates for DatoCMS — enabling live content streaming so editors see changes without page reload.

---

## What Real-Time Updates Are

DatoCMS provides a Real-time Updates API that pushes content changes to the frontend via Server-Sent Events (SSE). When an editor modifies a record in DatoCMS, the frontend receives the updated data and re-renders without requiring a page reload.

---

## How It Works

1. **Client sends a POST request** with the GraphQL query to `https://graphql-listen.datocms.com`
2. **Server returns an ephemeral channel URL** (expires in 15 seconds)
3. **Client connects via EventSource** (SSE) to the channel URL
4. **Server pushes events:**
   - `update` — Contains the new query result data
   - `channelError` — An error occurred; includes a `fatal` flag

The DatoCMS client libraries abstract away the SSE connection, reconnection, and event parsing.

---

## When to Use

- **Draft mode previews** — Editors see content changes as they type, without refreshing the page
- **Visitor-facing live content** — Optionally, show live updates to site visitors (e.g., live events, breaking news)

Most commonly used in draft mode only, where the real-time subscription is enabled alongside the draft token.

---

## Client Libraries

Each framework has a dedicated library that wraps the SSE subscription:

| Framework | Package | API |
| - | - | - |
| React / Next.js | `react-datocms` | `useQuerySubscription` hook |
| SvelteKit | `@datocms/svelte` | `querySubscription` store |
| Nuxt (Vue) | `vue-datocms` | `useQuerySubscription` composable |
| Astro | `@datocms/astro` | `QueryListener` component |

---

## Pattern: Fetch Initial + Subscribe

The standard pattern is:

1. **Server-side:** Execute the GraphQL query normally to get initial data
2. **Client-side:** Pass the initial data + query + token to the subscription library
3. **The subscription takes over:** It uses the initial data immediately, then listens for live updates

This ensures fast initial page loads (server-rendered) with seamless live updates after hydration.

```
Server: executeQuery(query, { token, includeDrafts: true })
         ↓ initialData
Client: useQuerySubscription({ query, token, initialData, includeDrafts: true })
         ↓ live data
Render: display data (auto-updates on changes)
```

---

## Initialization Options

All framework implementations accept the same core options:

| Option | Type | Required | Default | Description |
| - | - | - | - | - |
| `enabled` | boolean | No | `true` | Whether the subscription is active |
| `query` | string \| `TypedDocumentNode` | Yes | — | The GraphQL query to subscribe to |
| `token` | string | Yes | — | DatoCMS API token |
| `variables` | Object | No | — | GraphQL variables for the query |
| `includeDrafts` | boolean | No | — | If true, returns draft records |
| `excludeInvalid` | boolean | No | — | If true, filters out invalid records |
| `environment` | string | No | primary | DatoCMS environment name |
| `contentLink` | `'v1'` \| undefined | No | — | Enables Content Link metadata embedding |
| `baseEditingUrl` | string | No | — | Base URL of the DatoCMS project (for Content Link) |
| `cacheTags` | boolean | No | — | If true, receives Cache Tags with the query |
| `initialData` | Object | No | — | Initial data for first render (e.g., server-fetched data) |
| `reconnectionPeriod` | number | No | `1000` | Milliseconds to wait before reconnecting on network error |
| `fetcher` | fetch-like function | No | `window.fetch` | Custom fetch function for the registration query |
| `eventSourceClass` | EventSource-like class | No | `window.EventSource` | Custom EventSource class for SSE connection |
| `baseUrl` | string | No | `https://graphql-listen.datocms.com` | Base URL for the subscription endpoint |

---

## Connection Status

| Status | Description |
| - | - |
| `connecting` | Subscription channel is trying to connect |
| `connected` | Channel is open, receiving live updates |
| `closed` | Channel permanently closed due to fatal error (e.g., invalid query) |

---

## Error Object

| Property | Type | Description |
| - | - | - |
| `code` | string | Error code (e.g., `INVALID_QUERY`) |
| `message` | string | Human-friendly error description |
| `response` | Object | Raw response from endpoint (if available) |

---

## Critical: The `fetcher` Gotcha

**Always define `fetcher` as a stable reference outside the component render cycle.** If defined inline, it creates a new function reference on every render/re-evaluation, causing an infinite reconnection loop.

- **React:** Define `fetcher` as a `const` outside the component function
- **Vue:** Define `fetcher` as a `const` before calling `useQuerySubscription`
- **Svelte:** Define `fetcher` at the top of the `<script>` block
- **Astro:** Define `fetcher` before passing it to `<QueryListener>`

---

## Rate Limiting

- **Max 500 concurrent SSE connections** per DatoCMS project
- **Update events consume CDA API requests** — each update re-executes the query
- **Homogeneous connections** (same query + same token) share load efficiently — DatoCMS deduplicates identical subscriptions

---

## Error Handling

The subscription libraries surface errors with a `fatal` flag:

- **`fatal: true`** — The connection cannot be recovered. Reconnection won't help. Display an error to the user.
- **`fatal: false`** — A transient error. The library will automatically attempt to reconnect.

See the [Error Object](#error-object) table above for the full error shape.
