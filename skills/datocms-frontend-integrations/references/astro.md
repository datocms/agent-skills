# Astro — Draft Mode Reference

Exact code patterns for draft mode in Astro with DatoCMS. Sections organized by feature — follow `## Core`, then optional sections only for selected features.

## Contents

- Core
- Web Previews (Optional)
- Content Link (Optional)
- Real-Time Updates (Optional)
- Cache Tags (Optional)

## Core

### File Structure

```
src/pages/api/
├── draft-mode/
│   ├── enable/index.ts
│   └── disable/index.ts
└── utils.ts
src/lib/
├── draftMode.ts
└── datocms/
    └── executeQuery.ts       (modify existing or create)
astro.config.mjs              (modify)
```

### Enable Endpoint

**File:** `src/pages/api/draft-mode/enable/index.ts`

```ts
import type { APIRoute } from 'astro';
import { SECRET_API_TOKEN } from 'astro:env/server';
import { enableDraftMode } from '~/lib/draftMode';
import { handleUnexpectedError, invalidRequestResponse, isRelativeUrl } from '../../utils';

/**
 * This route handler enables Draft Mode and redirects to the given URL.
 */
export const GET: APIRoute = (event) => {
  const { url } = event;

  const token = url.searchParams.get('token');
  const redirectUrl = url.searchParams.get('redirect') || '/';

  try {
    if (!SECRET_API_TOKEN || token !== SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    if (!isRelativeUrl(redirectUrl)) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    enableDraftMode(event);
  } catch (error) {
    return handleUnexpectedError(error);
  }

  return event.redirect(redirectUrl, 307);
};
```

Key points:

- Uses `astro:env/server` for env vars (type-safe)
- Uses `event.redirect(url, 307)` for redirects (Astro's API context method)
- Exports `GET` as `APIRoute`
- Import path alias: `~/lib/draftMode` (Astro uses `~` or `@` for src)

### Disable Endpoint

**File:** `src/pages/api/draft-mode/disable/index.ts`

```ts
import type { APIRoute } from 'astro';
import { disableDraftMode } from '~/lib/draftMode';
import { handleUnexpectedError, invalidRequestResponse, isRelativeUrl } from '../../utils';

/**
 * This route handler disables Draft Mode and redirects to the given URL.
 */
export const GET: APIRoute = (event) => {
  const { url } = event;
  const redirectUrl = url.searchParams.get('redirect') || '/';

  try {
    if (!isRelativeUrl(redirectUrl)) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    disableDraftMode(event);
  } catch (error) {
    return handleUnexpectedError(error);
  }

  return event.redirect(redirectUrl, 307);
};
```

### Draft Mode Helper

**File:** `src/lib/draftMode.ts`

```ts
import type { APIContext, AstroCookieSetOptions, AstroCookies } from 'astro';
import { DRAFT_MODE_COOKIE_NAME } from 'astro:env/client';
import { SIGNED_COOKIE_JWT_SECRET } from 'astro:env/server';
import jwt, { type JwtPayload } from 'jsonwebtoken';

/**
 * Generates a JSON Web Token (JWT) that is used as a signed cookie for
 * entering Draft Mode.
 */
function jwtToken() {
  return jwt.sign({ enabled: true }, SIGNED_COOKIE_JWT_SECRET);
}

/**
 * Sets the signed cookie required to enter Draft Mode.
 */
export function enableDraftMode(context: APIContext) {
  context.cookies.set(DRAFT_MODE_COOKIE_NAME, jwtToken(), {
    path: '/',
    sameSite: 'none',
    httpOnly: false,
    secure: true,
    ...({ partitioned: true } as AstroCookieSetOptions),
  });
}

/**
 * Disables Draft Mode by deleting the cookie.
 */
export function disableDraftMode(context: APIContext) {
  context.cookies.delete(DRAFT_MODE_COOKIE_NAME, {
    path: '/',
    sameSite: 'none',
    httpOnly: false,
    secure: true,
    ...({ partitioned: true } as AstroCookieSetOptions),
  });
}

/**
 * Checks if Draft Mode is enabled for a given request by verifying the JWT.
 * Accepts both an APIContext and raw AstroCookies (for use in Astro components).
 */
export function isDraftModeEnabled(contextOrCookies: APIContext | AstroCookies) {
  const cookies = 'cookies' in contextOrCookies ? contextOrCookies.cookies : contextOrCookies;

  const cookie = cookies.get(DRAFT_MODE_COOKIE_NAME);

  if (!cookie) {
    return false;
  }

  try {
    const payload = jwt.verify(cookie.value, SIGNED_COOKIE_JWT_SECRET) as JwtPayload;
    return payload.enabled as boolean;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the HTTP headers needed to enable Draft Mode.
 */
export function draftModeHeaders(): HeadersInit {
  return {
    Cookie: `${DRAFT_MODE_COOKIE_NAME}=${jwtToken()};`,
  };
}
```

Key points:

- JWT payload `{ enabled: true }` (same as SvelteKit)
- Cookie name from `astro:env/client`, JWT secret from `astro:env/server`
- `partitioned: true` spread with cast `as AstroCookieSetOptions` (Astro's types may not include it)
- `isDraftModeEnabled` accepts both `APIContext` (API routes) and `AstroCookies` (Astro components via `Astro.cookies`)
- Cookie value accessed via `cookie.value` (Astro's `AstroCookie` object, not raw string)

### Utils

**File:** `src/pages/api/utils.ts`

```ts
import { serializeError } from 'serialize-error';

export function withCORS(responseInit?: ResponseInit): ResponseInit {
  return {
    ...responseInit,
    headers: {
      ...responseInit?.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  };
}

/**
 * Custom json() helper since Astro does not have a built-in json response helper.
 */
export function json(response: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(response), init);
}

export function handleUnexpectedError(error: unknown) {
  try {
    throw error;
  } catch (e) {
    console.error(e);
  }

  return invalidRequestResponse(serializeError(error), 500);
}

export function invalidRequestResponse(error: unknown, status = 422) {
  return json(
    {
      success: false,
      error,
    },
    withCORS({ status }),
  );
}

export function successfulResponse(data?: unknown, status = 200) {
  return json(
    {
      success: true,
      data,
    },
    withCORS({ status }),
  );
}

export function isRelativeUrl(path: string): boolean {
  if (
    path !== path.trim() ||
    /[\u0000-\u001F\u007F\\]/.test(path) ||
    path.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(path)
  ) {
    return false;
  }

  try {
    const base = new URL('https://preview.invalid/');
    return new URL(path, base).origin === base.origin;
  } catch {
    return false;
  }
}
```

Key points:

- Astro does NOT have built-in `json()` helper, define custom one using `new Response(JSON.stringify(...))`
- Same `withCORS`, `handleUnexpectedError`, `isRelativeUrl` pattern as other frameworks

### Query Function Modification

**File:** `src/lib/datocms/executeQuery.ts`

If project already has `executeQuery` wrapper, modify it. If not, create this file:

```ts
import { executeQuery as libExecuteQuery } from '@datocms/cda-client';
import {
  DATOCMS_DRAFT_CONTENT_CDA_TOKEN,
  DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
} from 'astro:env/server';
import type { TadaDocumentNode } from 'gql.tada';

export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>,
) {
  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? DATOCMS_DRAFT_CONTENT_CDA_TOKEN
      : DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

### Usage in Astro pages

```astro
---
import { executeQuery } from '~/lib/datocms/executeQuery';
import { isDraftModeEnabled } from '~/lib/draftMode';

const data = await executeQuery(myQuery, {
  includeDrafts: isDraftModeEnabled(Astro.cookies),
});
---

<!-- Render data -->
```

### Astro Config Additions

Add to `astro.config.mjs`:

```js
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  // Required: Astro must run in server mode for API routes
  output: 'server',

  // Type-safe environment variables
  env: {
    schema: {
      DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
      }),
      DATOCMS_DRAFT_CONTENT_CDA_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SECRET_API_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
      }),
      SIGNED_COOKIE_JWT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
      }),
      DRAFT_MODE_COOKIE_NAME: envField.string({
        context: 'client',
        access: 'public',
      }),
    },
    validateSecrets: true,
  },
});
```

Key points:

- `output: 'server'` — Required for API routes (Astro defaults to static)
- `env.schema` — Defines type-safe env vars with `envField.string()`
  - `context: 'server'` + `access: 'secret'` → server-only via `astro:env/server`
  - `context: 'client'` + `access: 'public'` → client+server via `astro:env/client`
- `validateSecrets: true` — Validates all secret env vars at startup

### Core Environment Variables

```
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=   # Published content CDA token
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=       # Draft content CDA token (with "Include drafts")
SECRET_API_TOKEN=                       # Shared secret for endpoint auth
SIGNED_COOKIE_JWT_SECRET=              # JWT signing secret
DRAFT_MODE_COOKIE_NAME=               # Cookie name, e.g. "datocms-draft-mode"
```

### Core Dependencies

Required (install if missing):

- `jsonwebtoken` — For signing/verifying JWT cookies
- `@types/jsonwebtoken` — TypeScript types (dev dependency)
- `serialize-error` — For serializing error objects

Optional for Web Previews helpers:

- `@datocms/cma-client` — For `RawApiTypes`

## Web Previews (Optional)

### Preview Links Endpoint

**File:** `src/pages/api/preview-links/index.ts`

```ts
import type { APIRoute } from 'astro';
import { SECRET_API_TOKEN } from 'astro:env/server';
import { deserializeRawItem } from '@datocms/rest-client-utils';
import { recordToWebsiteRoute } from '~/lib/datocms/recordInfo';
import { handleUnexpectedError, invalidRequestResponse, json, withCORS } from '../utils';

export const OPTIONS: APIRoute = () => {
  return new Response('OK', withCORS());
};

type PreviewLink = {
  label: string;
  url: string;
  reloadPreviewOnRecordUpdate?: boolean | { delayInMs: number };
};

type WebPreviewsResponse = {
  previewLinks: PreviewLink[];
};

/**
 * Implements the Previews webhook required for the "Web Previews" plugin:
 *
 * https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews#the-previews-webhook
 */
export const POST: APIRoute = async ({ url, request }) => {
  try {
    const token = url.searchParams.get('token');

    if (!SECRET_API_TOKEN || token !== SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    const { item, locale } = await request.json();

    const recordUrl = await recordToWebsiteRoute(deserializeRawItem(item), locale);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (recordUrl) {
      if (item.meta.status !== 'published') {
        const draftUrl = new URL('/api/draft-mode/enable', request.url);
        draftUrl.searchParams.set('redirect', recordUrl);
        draftUrl.searchParams.set('token', token);
        response.previewLinks.push({
          label: 'Draft version',
          url: draftUrl.toString(),
        });
      }

      if (item.meta.status !== 'draft') {
        const publishedUrl = new URL('/api/draft-mode/disable', request.url);
        publishedUrl.searchParams.set('redirect', recordUrl);
        response.previewLinks.push({
          label: 'Published version',
          url: publishedUrl.toString(),
        });
      }
    }

    return json(response, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
};
```

Key points:

- Uses custom `json()` helper from utils

### `recordToWebsiteRoute`

**File:** `src/lib/datocms/recordInfo.ts`

Requires generated `cma-types` ([how](./web-previews-concepts.md#recordtowebsiteroute-pattern)).

```ts
import type { RawApiTypes } from '@datocms/cma-client';
import * as Schema from '@/lib/datocms/cma-types';

/**
 * Maps a DatoCMS record to its frontend URL. Used by the preview-links endpoint.
 */
export async function recordToWebsiteRoute(
  item: RawApiTypes.Item<Schema.AnyModel>,
  _locale: string,
): Promise<string | null> {
  switch (item.__itemTypeId) {
    // Replace with your project's models. Each `case Schema.X.ID` narrows
    // `item.attributes` to that model's fields — no `as` casts needed.
    //
    // case Schema.Page.ID:
    //   return `/${item.attributes.slug}`;
    //
    // case Schema.BlogPost.ID:
    //   return `/blog/${item.attributes.slug}`;

    default:
      return null;
  }
}
```

### Astro Config Web Previews Addition

Add security config to `astro.config.mjs` to allow DatoCMS to POST to preview-links endpoint:

```js
export default defineConfig({
  // ... existing config ...

  // Required: Disable origin checking so DatoCMS can POST to preview-links
  security: {
    checkOrigin: false,
  },
});
```

### Web Previews Dependencies

Required: `@datocms/rest-client-utils`

## Content Link (Optional)

### Query Function Content Link Addition

Modify `executeQuery` function from Core section to add Content Link support. Add these two options inside `libExecuteQuery` call:

```ts
contentLink: options?.includeDrafts ? 'v1' : undefined,
baseEditingUrl: DATOCMS_BASE_EDITING_URL,
```

Full query function with Content Link enabled:

```ts
import { executeQuery as libExecuteQuery } from '@datocms/cda-client';
import {
  DATOCMS_DRAFT_CONTENT_CDA_TOKEN,
  DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
  DATOCMS_BASE_EDITING_URL,
} from 'astro:env/server';
import type { TadaDocumentNode } from 'gql.tada';

export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>,
) {
  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? DATOCMS_DRAFT_CONTENT_CDA_TOKEN
      : DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
    contentLink: options?.includeDrafts ? 'v1' : undefined,
    baseEditingUrl: DATOCMS_BASE_EDITING_URL,
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

### Astro Config Content Link Addition

Add `DATOCMS_BASE_EDITING_URL` env field to Astro config:

```js
export default defineConfig({
  env: {
    schema: {
      // ... existing schema ...
      DATOCMS_BASE_EDITING_URL: envField.string({
        context: 'server',
        access: 'public',
      }),
    },
  },
});
```

### ContentLink Component Setup

Use `<ContentLink />` from `@datocms/astro/ContentLink` (props: `astro-content-link.md`) — don't hand-roll `createController()`: bare controller ignores Web Previews Visual-tab navigation requests (no `onNavigateTo`); component wires `onNavigateTo` → `navigate()` plus `setCurrentPath` on `astro:page-load`. Render in layout only when draft mode enabled:

```astro
---
import { ContentLink } from '@datocms/astro/ContentLink';
import { isDraftModeEnabled } from '~/lib/draftMode';

const draftMode = isDraftModeEnabled(Astro.cookies);
---

<html>
  <body>
    {draftMode && <ContentLink />}
    <slot />
  </body>
</html>
```

### Structured Text with Content Link

Group/boundary rules and example: [astro-content-link.md § Structured Text Integration](./astro-content-link.md#structured-text-integration).

### Non-Text Field Example

For fields that cannot contain stega encoding (numbers, booleans, dates, JSON), use `data-datocms-content-link-url` with record's `_editingUrl`:

```graphql
query {
  product {
    name
    price
    _editingUrl
  }
}
```

```astro
<span data-datocms-content-link-url={product._editingUrl}>
  ${product.price}
</span>
```

### CSP Header for Web Previews Visual Tab

If the site already sends a `frame-ancestors` directive, make sure it allows both the exact DatoCMS project origin and the plugin CDN. Browsers check every ancestor in the nested iframe chain. If the directive is absent, do not add it solely for Web Previews.

For example, update the existing Content-Security-Policy header in Astro middleware, replacing `your-project` with the project's actual subdomain (or use its custom DatoCMS admin origin):

**File:** `src/middleware.ts`

```ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://your-project.admin.datocms.com https://plugins-cdn.datocms.com",
  );

  return response;
});
```

### Stega Stripping

Content Link embeds invisible characters in text fields. Use `stripStega()` from `@datocms/content-link` before string comparisons, SEO metadata, analytics, or URL generation from stega-carrying text. DatoCMS `slug` field type never carries stega — use directly. See `content-link-concepts.md` for full details and field-type exception list.

### Content Link Environment Variables

```
DATOCMS_BASE_EDITING_URL=             # For Content Link, e.g. https://your-project.admin.datocms.com
```

### Content Link Dependencies

- `@datocms/astro` — `<ContentLink />`; `@datocms/content-link` — stega utilities

## Real-Time Updates (Optional)

For real-time updates in draft mode, create wrapper around `@datocms/astro`'s `QueryListener`:

### `DraftModeQueryListener` Component

**File:** `src/components/DraftModeQueryListener/Component.astro`

```astro
---
import { QueryListener } from '@datocms/astro/QueryListener';
import { DATOCMS_DRAFT_CONTENT_CDA_TOKEN } from 'astro:env/server';
import { isDraftModeEnabled } from '~/lib/draftMode';

interface Props {
  query: unknown;
  variables?: Record<string, unknown>;
  environment?: string;
  contentLink?: 'v1';
  baseEditingUrl?: string;
  cacheTags?: boolean;
  initialData?: unknown;
  reconnectionPeriod?: number;
  baseUrl?: string;
}

const props: Props = Astro.props;
const draftModeEnabled = isDraftModeEnabled(Astro.cookies);
---

{
  draftModeEnabled && (
    <QueryListener
      {...props}
      token={DATOCMS_DRAFT_CONTENT_CDA_TOKEN}
      excludeInvalid
      includeDrafts
    />
  )
}
```

**Note: Combining with Content Link** — If user also selected Content Link, add these props to `QueryListener`:

```astro
contentLink="v1"
baseEditingUrl={DATOCMS_BASE_EDITING_URL}
```

And import `DATOCMS_BASE_EDITING_URL` from `astro:env/server`.

### Usage

```astro
---
import DraftModeQueryListener from '~/components/DraftModeQueryListener/Component.astro';
import { executeQuery } from '~/lib/datocms/executeQuery';
import { isDraftModeEnabled } from '~/lib/draftMode';

const data = await executeQuery(myQuery, {
  includeDrafts: isDraftModeEnabled(Astro.cookies),
});
---

<DraftModeQueryListener query={myQuery} initialData={data}>
  <!-- Your content here, will auto-update in draft mode -->
</DraftModeQueryListener>
```

Key points:

- Only renders `QueryListener` when draft mode enabled
- Automatically injects `token`, `includeDrafts`, `excludeInvalid`
- `Props` type omits these fields so callers cannot override them
- Uses `@datocms/astro` package for `QueryListener` component

### Real-Time Dependencies

- `@datocms/astro` — For `QueryListener` component

## Cache Tags (Optional)

Use native route caching when the installed Astro 7+ version and hosting adapter support it. Preserve a working older integration; adding cache tags does not require an Astro upgrade or hosting migration. SSR/on-demand rendering is needed to tag request-time responses; prerendered pages still need their existing rebuild strategy.

### Astro 7 provider configuration

Keep the current adapter and add its compatible cache provider. For example, on Netlify:

```ts
import { defineConfig } from 'astro/config';
import { cacheNetlify } from '@astrojs/netlify/cache';

export default defineConfig({
  // Preserve the existing adapter, output, env schema, and other configuration.
  cache: { provider: cacheNetlify() },
});
```

Cloudflare and Vercel expose corresponding `cacheCloudflare` / `cacheVercel` helpers from their adapter's `/cache` entrypoint. Check installed adapter compatibility; these CDN providers may still be experimental even though Astro 7's route-cache API is stable. A memory provider is only suitable for a single instance and needs its own preview bypass before a cache lookup. Do not substitute it for a distributed production cache.

Configure the hosting cache to bypass requests carrying the project's preview cookie **before lookup**, and keep preview/authentication endpoints uncached. Origin response headers cannot undo a hit already served by a CDN. Preserve the existing authenticated draft-mode cookie; do not grant preview access from a query parameter.

### Collect every query dependency

Adapt the existing query wrapper to accept the request context. `cache.set({ tags })` accumulates tags from page, layout, and nested-component queries within that request. Keep tags opaque and do not store them in module-global state. The example uses a string query for brevity; retain existing typed documents, environment selection, and Content Link options when extending a working wrapper.

The examples below assume preview mode exists. For a published-only project, omit the draft helper, draft token, and draft-specific branches in the query wrapper and middleware; use the published token with `includeDrafts: false`. Preserve authenticated preview handling when already configured; do not add preview mode just to enable caching.

**File:** `src/lib/datocms/executeQueryWithCacheTags.ts`

```ts
import type { APIContext } from 'astro';
import { rawExecuteQuery } from '@datocms/cda-client';
import { DATOCMS_DRAFT_CONTENT_CDA_TOKEN, DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN } from 'astro:env/server';
import { isDraftModeEnabled } from '../draftMode';

type QueryContext = Pick<APIContext, 'cookies' | 'cache'>;

export async function executeQueryWithCacheTags<Result, Variables = Record<string, unknown>>(
  context: QueryContext, query: string, variables?: Variables,
): Promise<Result> {
  const includeDrafts = isDraftModeEnabled(context.cookies);
  const [data, response] = await rawExecuteQuery<Result, Variables>(query, {
    variables, includeDrafts, excludeInvalid: true,
    token: includeDrafts ? DATOCMS_DRAFT_CONTENT_CDA_TOKEN : DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
    returnCacheTags: !includeDrafts,
    requestInitOptions: { cache: 'no-store' },
  });
  if (includeDrafts) {
    context.cache.set(false);
  } else if (context.cache.enabled) {
    const tags = (response.headers.get('x-cache-tags') ?? '').split(/\s+/).filter(Boolean);
    context.cache.set({ maxAge: 3600, tags }); // Keep the project's chosen freshness policy.
  }
  return data;
}
```

Call `executeQueryWithCacheTags(Astro, query, variables)` from pages **and nested components** contributing to the response. Keep draft responses private and tag-free. Do not subsequently call `cache.set({...})` on a draft request: it can re-enable caching.

### Finalize headers after nested queries

Astro can stream a response before nested components finish. Integrate this step into existing middleware for GET HTML responses on routes using the cache-tagged query wrapper. Replace the illustrative `/articles` route predicate with those application routes, including routes with nested-component queries. Buffering delays the first byte and is unsuitable for streaming endpoints or large downloads; other responses pass through without buffering.

**File:** `src/middleware.ts`

```ts
import { defineMiddleware } from 'astro:middleware';
import { isDraftModeEnabled } from './lib/draftMode';

// Adapt this predicate to the application's cache-tagged content routes.
function usesDatoCacheTags(pathname: string): boolean {
  return pathname === '/articles' || pathname.startsWith('/articles/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const shouldBuffer = context.request.method === 'GET' && usesDatoCacheTags(context.url.pathname);
  const draft = isDraftModeEnabled(context.cookies);
  if (draft) context.cache.set(false);
  const response = await next();
  const isHtml = response.headers.get('content-type')?.includes('text/html');
  if (!isHtml) return response;
  const body = shouldBuffer ? await response.arrayBuffer() : undefined;
  if (draft || response.status !== 200) {
    context.cache.set(false);
    response.headers.set('Cache-Control', 'private, no-store');
  }
  if (!shouldBuffer) return response;
  return new Response(body, {
    status: response.status, statusText: response.statusText, headers: response.headers,
  });
});
```

### Authenticated invalidation

Keep `CACHE_INVALIDATION_WEBHOOK_SECRET` as a secret server-side field in the existing Astro env schema. Configure the DatoCMS `cda_cache_tags` / `invalidate` webhook to use `Authorization: Bearer <secret>`. Use the installed provider's invalidation support; batch requests to its limits and configure any required provider credentials. Do not swallow provider failures or mark an unconfigured adapter complete.

**File:** `src/pages/api/invalidate-cache.ts`

```ts
import type { APIRoute } from 'astro';
import { CACHE_INVALIDATION_WEBHOOK_SECRET } from 'astro:env/server';

export const POST: APIRoute = async ({ request, cache }) => {
  cache.set(false);
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!CACHE_INVALIDATION_WEBHOOK_SECRET || request.headers.get('authorization') !== `Bearer ${CACHE_INVALIDATION_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401, headers });
  }
  let body;
  try { body = await request.json(); } catch { return new Response('Invalid JSON', { status: 400, headers }); }
  const tags = body?.entity?.attributes?.tags;
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string' || !tag)) {
    return new Response('Invalid tags', { status: 400, headers });
  }
  if (!cache.enabled) return new Response('Cache provider unavailable', { status: 503, headers });
  try {
    await cache.invalidate({ tags: [...new Set<string>(tags)] });
  } catch {
    return new Response('Invalidation failed', { status: 502, headers });
  }
  return Response.json({ invalidated: tags.length > 0 }, { headers });
};
```

The selected provider owns serialization and API calls. If it does not handle the provider's purge limits/retries, add a bounded adapter at that boundary; a failed purge must remain an error for webhook redelivery. Content webhooks do not cover deployments: preserve automatic host deployment invalidation or the existing deployment purge workflow.

### Older integrations and verification

For older Astro versions, retain the existing request wrapper, CDN response headers, and authenticated purge adapter. Collect the union from all contributing queries before setting headers, serialize according to the selected CDN, and exclude drafts. Do not add a second independent cache/purge mechanism beside a working one.

For this manual CDN path, use the [collector and purge adapter reference](cache-tag-adapters.md): share `createPageCacheTags` across the request, finalize headers after every contributing query, and use `purgeInBatches` with the selected provider's concrete adapter. Keep draft requests uncached and propagate purge failures. Skip these manual helpers when using the native provider above.

Run a production build and the adapter's production preview/runtime: development mode does not exercise caching. Verify tags from both a page query and a delayed nested-component query, authenticated invalidation and provider failures, then warm a published URL and request the **same URL** with the preview cookie to verify lookup bypass and uncached draft output. Check the deployed host's rules separately; a local fixture cannot prove CDN configuration.

See [DatoCMS's Astro cache guide](https://www.datocms.com/docs/astro/using-cache-tags) and [Astro route caching](https://docs.astro.build/en/guides/caching/) for the current provider APIs.
