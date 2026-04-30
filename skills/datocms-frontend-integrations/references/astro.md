# Astro — Draft Mode Reference

This reference contains the exact code patterns for implementing draft mode in an Astro project with DatoCMS. Sections are organized by feature — always follow `## Core`, then follow optional sections only for features the user selected.

## Contents

- [Core](#core)
- [Web Previews (Optional)](#web-previews-optional)
- [Content Link (Optional)](#content-link-optional)
- [Real-Time Updates (Optional)](#real-time-updates-optional)
- [Cache Tags (Optional)](#cache-tags-optional)

---

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
    if (token !== SECRET_API_TOKEN) {
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

- Uses `astro:env/server` for environment variables (type-safe env access)
- Uses `event.redirect(url, 307)` for redirects (Astro's API context method)
- Exports `GET` as an `APIRoute`
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

- JWT payload is `{ enabled: true }` (same as SvelteKit)
- Cookie name from `astro:env/client`, JWT secret from `astro:env/server`
- `partitioned: true` is spread with a cast `as AstroCookieSetOptions` because Astro's cookie types may not include `partitioned` yet
- `isDraftModeEnabled` accepts both `APIContext` (API routes) and `AstroCookies` (Astro components via `Astro.cookies`)
- Cookie value is accessed via `cookie.value` (Astro's `AstroCookie` object, not a raw string)

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

export function isRelativeUrl(path: string) {
  try {
    new URL(path);
    return false;
  } catch {
    try {
      new URL(path, 'http://example.com');
      return true;
    } catch {
      return false;
    }
  }
}
```

Key points:

- Astro does NOT have a built-in `json()` response helper, so we define our own using `new Response(JSON.stringify(...))`
- Same `withCORS`, `handleUnexpectedError`, `isRelativeUrl` pattern as other frameworks

### Query Function Modification

**File:** `src/lib/datocms/executeQuery.ts`

If the project already has an `executeQuery` wrapper, modify it. If not, create this file:

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

Add the following to `astro.config.mjs`:

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

- `output: 'server'` — Required for API routes to work (Astro defaults to static)
- `env.schema` — Defines type-safe env vars with `envField.string()`
  - `context: 'server'` + `access: 'secret'` → only available server-side via `astro:env/server`
  - `context: 'client'` + `access: 'public'` → available on both client and server via `astro:env/client`
- `validateSecrets: true` — Validates that all secret env vars are set at startup

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

---

## Web Previews (Optional)

### Preview Links Endpoint

**File:** `src/pages/api/preview-links/index.ts`

```ts
import type { APIRoute } from 'astro';
import { SECRET_API_TOKEN } from 'astro:env/server';
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

    if (token !== SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    const { item, itemType, locale } = await request.json();

    // Astro uses itemType.attributes.api_key (the model's API key string)
    const recordUrl = recordToWebsiteRoute(item, itemType.attributes.api_key, locale);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (recordUrl) {
      if (item.meta.status !== 'published') {
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(
            `/api/draft-mode/enable?redirect=${recordUrl}&token=${token}`,
            request.url,
          ).toString(),
        });
      }

      if (item.meta.status !== 'draft') {
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(
            `/api/draft-mode/disable?redirect=${recordUrl}`,
            request.url,
          ).toString(),
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

- **Astro uses `itemType.attributes.api_key`** (the model's API key string like `'blog_post'`), NOT the model ID. This differs from Next.js/Nuxt/SvelteKit which use the numeric model ID — the `api_key` approach is preferred because it is human-readable and stable across environments
- Uses the custom `json()` helper from utils

### `recordToWebsiteRoute`

**File:** `src/lib/datocms/recordInfo.ts`

```ts
import type { RawApiTypes } from '@datocms/cma-client';

/**
 * Maps a DatoCMS record to its frontend URL. Used by the preview-links endpoint.
 *
 * Fill in cases for each of your content models. Use the model's API key
 * (the name you gave the model in DatoCMS, e.g., 'blog_post', 'page').
 */
export function recordToWebsiteRoute(
  item: RawApiTypes.Item,
  itemTypeApiKey: string,
  locale: string,
): string | null {
  switch (itemTypeApiKey) {
    // Scaffolded example cases. Replace them before calling
    // the Web Previews setup production-ready.
    // TODO: Add your models here. Examples:
    //
    // case 'page': {
    //   return `/page/${item.attributes.slug}`;
    // }
    //
    // case 'blog_post': {
    //   return `/blog/${item.attributes.slug}`;
    // }

    default:
      return null;
  }
}
```

Key points:

- **Switches on API key strings** (e.g., `'page'`, `'blog_post'`), NOT model IDs
- This is different from Next.js, Nuxt, and SvelteKit which use model IDs

### Astro Config Web Previews Addition

Add the security config to `astro.config.mjs` to allow DatoCMS to POST to the preview-links endpoint:

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

No additional dependencies beyond what Core requires.

---

## Content Link (Optional)

### Query Function Content Link Addition

Modify the `executeQuery` function from the Core section to add Content Link support. Add these two options inside the `libExecuteQuery` call:

```ts
contentLink: options?.includeDrafts ? 'v1' : undefined,
baseEditingUrl: options?.includeDrafts ? DATOCMS_BASE_EDITING_URL : undefined,
```

The full query function with Content Link enabled:

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
    baseEditingUrl: options?.includeDrafts ? DATOCMS_BASE_EDITING_URL : undefined,
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

### Astro Config Content Link Addition

Add the `DATOCMS_BASE_EDITING_URL` env field to the Astro config:

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

Create an Astro component that initializes Content Link. Since Astro uses MPA (multi-page app) routing by default, client-side routing support via `onNavigateTo` / `setCurrentPath` is typically not needed. Use an inline `<script>` to initialize the controller:

**File:** `src/components/ContentLink.astro`

```astro
<div id="content-link-init"></div>

<script>
  import { createController } from '@datocms/content-link';

  const controller = createController();
  controller.enableClickToEdit();
</script>
```

Then add it to your layout, only rendering when draft mode is enabled:

```astro
---
import ContentLink from '~/components/ContentLink.astro';
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

**Note:** If using Astro with View Transitions or a client-side router (e.g., `@astrojs/react` with React Router), add `onNavigateTo` and `setCurrentPath` routing support similar to the Next.js pattern. See `content-link-concepts.md` for the `createController()` API details.

### Structured Text with Content Link

When rendering Structured Text fields with `@datocms/astro`, wrap the component in a group and add boundaries to embedded blocks and inline records. The `@datocms/astro` `StructuredText` component uses named props for custom renderers:

```astro
---
import { StructuredText } from '@datocms/astro/StructuredText';
import { stripStega } from '@datocms/content-link';
import BlockComponent from './BlockComponent.astro';
import InlineRecordComponent from './InlineRecordComponent.astro';
---

<div data-datocms-content-link-group>
  <StructuredText
    data={page.content}
    blockComponents={{ my_block: BlockComponent }}
    inlineBlockComponents={{ my_inline_block: InlineRecordComponent }}
  />
</div>
```

For the block and inline record components, add the boundary attribute at the component level:

**`BlockComponent.astro`:**

```astro
---
const { record } = Astro.props;
---

<div data-datocms-content-link-boundary>
  <!-- Block content here -->
</div>
```

**`InlineRecordComponent.astro`:**

```astro
---
const { record } = Astro.props;
---

<span data-datocms-content-link-boundary>
  <!-- Inline record content here -->
</span>
```

Note: `renderLinkToRecord` does **not** need a boundary — record links wrap text that belongs to the structured text field, so clicking them correctly opens the structured text field editor.

### Non-Text Field Example

For fields that cannot contain stega encoding (numbers, booleans, dates, JSON), use `data-datocms-content-link-url` with the record's `_editingUrl`:

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

To allow your site to be loaded in the Web Previews Visual tab iframe, add a Content-Security-Policy header. In Astro, use middleware:

**File:** `src/middleware.ts`

```ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://plugins-cdn.datocms.com",
  );

  return response;
});
```

### Stega Stripping

Content Link embeds invisible characters in text fields. Use `stripStega()` from `@datocms/content-link` before string comparisons, SEO metadata, analytics, or URL generation. See `content-link-concepts.md` for full details and examples.

### Content Link Environment Variables

```
DATOCMS_BASE_EDITING_URL=             # For Content Link, e.g. https://your-project.admin.datocms.com/environments/main
```

### Content Link Dependencies

- `@datocms/content-link` — For click-to-edit overlays and stega utilities

---

## Real-Time Updates (Optional)

For real-time updates in draft mode, create a wrapper around `@datocms/astro`'s `QueryListener`:

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

**Note: Combining with Content Link** — If the user also selected Content Link, add these props to the `QueryListener`:

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

- Only renders the `QueryListener` when draft mode is enabled
- Automatically injects `token`, `includeDrafts`, `excludeInvalid`
- The `Props` type omits these fields so callers cannot override them
- Uses `@datocms/astro` package for the `QueryListener` component

### Real-Time Dependencies

- `@datocms/astro` — For `QueryListener` component

---

## Cache Tags (Optional)

CDN-first cache tag invalidation for Astro. Instead of revalidating all content on every change, this forwards DatoCMS cache tags to your CDN, which purges only the affected pages when content changes.

### When to Use

- Your Astro site is deployed behind a CDN that supports tag-based purging (Netlify, Cloudflare, Fastly, Bunny)
- You want per-record granularity in cache invalidation
- Your Astro config uses `output: 'server'` or `output: 'hybrid'` (SSR is required to set response headers)

For the webhook payload structure and CDN header table, see `skills/datocms-cda/references/draft-caching-environments.md` → "Cache Tags".

### Modified Query Function

Switch from `executeQuery` to `rawExecuteQuery` to access the `x-cache-tags` response header:

**File:** `src/lib/datocms/executeQuery.ts`

```ts
import { rawExecuteQuery } from '@datocms/cda-client';
import {
  DATOCMS_DRAFT_CONTENT_CDA_TOKEN,
  DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
} from 'astro:env/server';
import type { TadaDocumentNode } from 'gql.tada';

export async function executeQueryWithCacheTags<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryWithCacheTagsOptions<Variables>,
) {
  const [data, response] = await rawExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? DATOCMS_DRAFT_CONTENT_CDA_TOKEN
      : DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN,
    returnCacheTags: true,
  });

  const cacheTags = response.headers.get('x-cache-tags') ?? '';

  return { data, cacheTags };
}

type ExecuteQueryWithCacheTagsOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

### Setting CDN Headers

In `.astro` pages (SSR mode), use `Astro.response.headers.set()` to set the CDN-specific header:

```astro
---
import { executeQueryWithCacheTags } from '~/lib/datocms/executeQuery';
import { isDraftModeEnabled } from '~/lib/draftMode';

const { data, cacheTags } = await executeQueryWithCacheTags(myQuery, {
  includeDrafts: isDraftModeEnabled(Astro.cookies),
});

// Set the CDN-specific header — choose the one matching your CDN:
// Netlify / Cloudflare: 'Cache-Tag'
// Fastly:               'Surrogate-Key'
// Bunny:                'CDN-Tag'
Astro.response.headers.set('Cache-Tag', cacheTags);
---

<!-- Render data -->
```

### Webhook Handler

**File:** `src/pages/api/invalidate-cache.ts`

Receives the DatoCMS cache tag invalidation webhook and calls your CDN's purge API:

```ts
import type { APIRoute } from 'astro';
import { CACHE_INVALIDATION_WEBHOOK_SECRET } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${CACHE_INVALIDATION_WEBHOOK_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const tags: string[] = body?.entity?.attributes?.tags ?? [];

  if (tags.length === 0) {
    return new Response(JSON.stringify({ purged: false }));
  }

  // Call your CDN's purge API. Example for Fastly:
  //
  // await fetch(`https://api.fastly.com/service/${FASTLY_SERVICE_ID}/purge`, {
  //   method: 'POST',
  //   headers: {
  //     'Fastly-Key': FASTLY_KEY,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ surrogate_keys: tags }),
  // });
  //
  // For Netlify, Cloudflare, or Bunny, use their respective purge APIs.

  return new Response(JSON.stringify({ purged: true, tags }));
};
```

### Astro Config Cache Tags Addition

Add the webhook secret and CDN-specific env vars to `astro.config.mjs`:

```js
export default defineConfig({
  env: {
    schema: {
      // ... existing schema ...
      CACHE_INVALIDATION_WEBHOOK_SECRET: envField.string({
        context: 'server',
        access: 'secret',
      }),
      // CDN-specific (example for Fastly):
      // FASTLY_SERVICE_ID: envField.string({
      //   context: 'server',
      //   access: 'secret',
      // }),
      // FASTLY_KEY: envField.string({
      //   context: 'server',
      //   access: 'secret',
      // }),
    },
  },
});
```

### Cache Tags Environment Variables

```
CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
# CDN-specific vars (uncomment for your CDN):
# FASTLY_SERVICE_ID=                 # Fastly service ID
# FASTLY_KEY=                        # Fastly API key
```

### Cache Tags Dependencies

No additional dependencies — `rawExecuteQuery` is provided by `@datocms/cda-client` which should already be installed.
