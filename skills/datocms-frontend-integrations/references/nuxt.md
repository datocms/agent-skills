# Nuxt — Draft Mode Reference

This reference contains the exact code patterns for implementing draft mode in a Nuxt project with DatoCMS. Sections are organized by feature — always follow `## Core`, then follow optional sections only for features the user selected.

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
server/api/
├── draft-mode/
│   ├── enable.ts
│   └── disable.ts
lib/
├── api/
│   ├── draftMode.ts
│   └── utils.ts
composables/
├── useDraftMode.ts          (create)
└── useQuery.ts              (modify existing or create)
nuxt.config.ts               (modify)
```

### Enable Endpoint

**File:** `server/api/draft-mode/enable.ts`

```ts
import { enableDraftMode } from '~/lib/api/draftMode';
import { ensureHttpMethods, isRelativeUrl } from '~/lib/api/utils';

/*
 * This API route enables Draft Mode. If the token is correct, it writes the API
 * Token into a signed cookie that allows access to DatoCMS draft content.
 */
export default eventHandler(async (event) => {
  ensureHttpMethods(event, 'GET');

  const config = useRuntimeConfig();

  const query = getQuery<{ url?: string; token?: string }>(event);
  const url = query.url || '/';

  if (query.token !== config.secretApiToken) {
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    });
  }

  if (!isRelativeUrl(url)) {
    throw createError({ status: 422, message: 'URL must be relative!' });
  }

  enableDraftMode(event);

  await sendRedirect(event, url);
});
```

Key points:

- Uses Nuxt auto-imports: `eventHandler`, `getQuery`, `useRuntimeConfig`, `sendRedirect`, `createError`
- Uses `url` as the redirect parameter name (not `redirect` like other frameworks)
- Token comes from `useRuntimeConfig().secretApiToken`

### Disable Endpoint

**File:** `server/api/draft-mode/disable.ts`

```ts
import { disableDraftMode } from '~/lib/api/draftMode';
import { ensureHttpMethods, isRelativeUrl } from '~/lib/api/utils';

/*
 * This API route disables Draft Mode, by deleting the signed cookie.
 */
export default eventHandler(async (event) => {
  ensureHttpMethods(event, 'GET');

  const query = getQuery<{ url?: string }>(event);
  const url = query.url || '/';

  if (!isRelativeUrl(url)) {
    throw createError({ status: 422, message: 'URL must be relative!' });
  }

  disableDraftMode(event);

  await sendRedirect(event, url);
});
```

### Draft Mode Helper

**File:** `lib/api/draftMode.ts`

```ts
import type { EventHandlerRequest, H3Event } from 'h3';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { CookieSerializeOptions } from 'cookie-es';

/**
 * Generates a JSON Web Token containing the DatoCMS draft CDA token.
 */
function jwtToken() {
  const config = useRuntimeConfig();
  return jwt.sign(
    { datocmsDraftContentCdaToken: config.datocmsDraftContentCdaToken },
    config.signedCookieJwtSecret,
  );
}

const DRAFT_MODE_SERIALIZE_OPTIONS: CookieSerializeOptions = {
  partitioned: true,
  secure: true,
  sameSite: 'none',
};

/**
 * Sets the signed cookie required to enter Draft Mode.
 */
export function enableDraftMode(event: H3Event<EventHandlerRequest>) {
  const config = useRuntimeConfig();
  setCookie(event, config.public.draftModeCookieName, jwtToken(), DRAFT_MODE_SERIALIZE_OPTIONS);
}

/**
 * Disables Draft Mode by deleting the cookie.
 */
export function disableDraftMode(event: H3Event<EventHandlerRequest>) {
  const config = useRuntimeConfig();
  deleteCookie(event, config.public.draftModeCookieName, DRAFT_MODE_SERIALIZE_OPTIONS);
}

/**
 * Checks if Draft Mode is enabled for a given request by verifying the JWT.
 */
export function isDraftModeEnabled(event: H3Event<EventHandlerRequest>) {
  const config = useRuntimeConfig();
  const cookie = getCookie(event, config.public.draftModeCookieName);

  if (!cookie) {
    return false;
  }

  try {
    const payload = jwt.verify(cookie, config.signedCookieJwtSecret) as JwtPayload;
    return !!payload.datocmsDraftContentCdaToken;
  } catch (e) {
    return false;
  }
}

/**
 * Returns the HTTP headers needed to enable Draft Mode.
 */
export function draftModeHeaders(): HeadersInit {
  const config = useRuntimeConfig();
  return {
    Cookie: `${config.public.draftModeCookieName}=${jwtToken()};`,
  };
}
```

Key points:

- The JWT payload contains the actual draft CDA token (`datocmsDraftContentCdaToken`). This is decoded on the client to use for real-time subscriptions.
- Uses `setCookie`, `deleteCookie`, `getCookie` from Nuxt/H3 auto-imports
- Cookie options: `partitioned: true`, `secure: true`, `sameSite: 'none'`

### Utils

**File:** `lib/api/utils.ts`

```ts
import type { EventHandlerRequest, H3Event, HTTPMethod } from 'h3';
import { serializeError } from 'serialize-error';

/**
 * Ensure that an incoming request method matches one of the allowed methods.
 */
export function ensureHttpMethods(event: H3Event<EventHandlerRequest>, ...methods: HTTPMethod[]) {
  const normalizedMethods = Array.isArray(methods) ? methods : [methods];

  if (normalizedMethods.includes(event.method)) {
    return;
  }

  throw createError({
    statusCode: 401,
    message: `Invalid HTTP method, only the following methods are accepted: ${normalizedMethods.join(', ')}`,
  });
}

/**
 * Handle any unexpected errors in an API route.
 */
export function handleUnexpectedError(error: unknown) {
  try {
    throw error;
  } catch (e) {
    console.error(e);
  }

  const { message, ...data } = serializeError(error);

  throw createError({
    statusCode: 500,
    message: message ?? 'An unexpected error occurred',
    data,
  });
}

export function isRelativeUrl(path: string): boolean {
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

- Uses `createError` from Nuxt auto-imports (H3)
- Error handling uses `throw createError()` instead of returning a Response (Nuxt pattern)
- The `ensureHttpMethods` helper validates HTTP methods

### `useDraftMode` Composable

**File:** `composables/useDraftMode.ts`

```ts
import { jwtDecode } from 'jwt-decode';

export function useDraftMode() {
  const config = useRuntimeConfig();
  const cookie = useCookie(config.public.draftModeCookieName);

  if (!cookie.value) {
    return false;
  }

  try {
    return jwtDecode<{ datocmsDraftContentCdaToken: string }>(cookie.value);
  } catch (e) {
    return false;
  }
}
```

Key points:

- Decodes the JWT cookie on the client side to extract the draft CDA token
- Returns `false` if no cookie or invalid JWT
- Returns the decoded payload (with `datocmsDraftContentCdaToken`) if valid

### Query Composable

**File:** `composables/useQuery.ts`

```ts
import { buildRequestInit } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';
import { hash } from 'ohash';

type Options<Variables> = {
  variables?: Variables;
};

export async function useQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: Options<Variables>,
) {
  const config = useRuntimeConfig();
  const draftMode = useDraftMode();

  const apiToken = draftMode
    ? draftMode.datocmsDraftContentCdaToken
    : config.public.datocmsPublishedContentCdaToken;

  if (!apiToken) {
    throw new Error('Missing API token');
  }

  const data = await useFetch('https://graphql.datocms.com/', {
    ...buildRequestInit(query, {
      token: apiToken,
      includeDrafts: Boolean(draftMode),
      excludeInvalid: true,
      variables: options?.variables,
    }),
    key: hash([query, options]),
    transform: (response: { data: Result; errors?: any[] }) => {
      if (response.errors)
        throw new Error(
          `Something went wrong while executing the query: ${JSON.stringify(response.errors)}`,
        );
      return response.data;
    },
  });

  return data.data;
}
```

Key points:

- Uses `buildRequestInit` from `@datocms/cda-client` with Nuxt's `useFetch`
- Token switching: draft token from decoded JWT cookie, published token from public runtime config
- Returns the data directly (no real-time subscription in core version)

### Nuxt Config Additions

Add the following to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // set by NUXT_DATOCMS_DRAFT_CONTENT_CDA_TOKEN env variable
    datocmsDraftContentCdaToken: '',
    // set by NUXT_SECRET_API_TOKEN env variable
    secretApiToken: '',
    // set by NUXT_SIGNED_COOKIE_JWT_SECRET env variable
    signedCookieJwtSecret: '',

    public: {
      // set by NUXT_PUBLIC_DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN env variable
      datocmsPublishedContentCdaToken: '',
      // set by NUXT_PUBLIC_DRAFT_MODE_COOKIE_NAME env variable
      draftModeCookieName: '',
    },
  },
});
```

Key points:

- Private config keys are set by `NUXT_` prefixed env vars
- Public config keys are set by `NUXT_PUBLIC_` prefixed env vars

### Core Environment Variables

```
NUXT_PUBLIC_DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=   # Published content CDA token (public)
NUXT_DATOCMS_DRAFT_CONTENT_CDA_TOKEN=               # Draft content CDA token (private)
NUXT_SECRET_API_TOKEN=                               # Shared secret for endpoint auth (private)
NUXT_SIGNED_COOKIE_JWT_SECRET=                       # JWT signing secret (private)
NUXT_PUBLIC_DRAFT_MODE_COOKIE_NAME=                  # Cookie name, e.g. "datocms-draft-mode" (public)
```

### Core Dependencies

Required (install if missing):

- `jsonwebtoken` — For signing/verifying JWT cookies
- `@types/jsonwebtoken` — TypeScript types (dev dependency)
- `serialize-error` — For serializing error objects
- `jwt-decode` — For decoding JWT on the client side (used in `useDraftMode` composable)

Optional for Web Previews helpers:

- `@datocms/cma-client` — For `RawApiTypes` and `ApiTypes`

---

## Web Previews (Optional)

### Preview Links Endpoint

**File:** `server/api/preview-links/index.ts`

```ts
import type { ApiTypes, RawApiTypes } from '@datocms/cma-client';
import { ensureHttpMethods, handleUnexpectedError } from '~/lib/api/utils';
import { recordToWebsiteRoute } from '~/lib/datocms/recordInfo';

type WebPreviewsRequestBody = {
  item: RawApiTypes.Item;
  itemType: ApiTypes.ItemType;
  locale: string;
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
export default eventHandler(async (event) => {
  try {
    ensureHttpMethods(event, 'OPTIONS', 'POST');

    if (event.method === 'OPTIONS') {
      return {};
    }

    const config = useRuntimeConfig();

    const { token } = getQuery(event);

    if (token !== config.secretApiToken) {
      throw createError({ message: 'Invalid token', status: 401 });
    }

    const { item, itemType, locale } = await readBody<WebPreviewsRequestBody>(event, {
      strict: true,
    });

    const url = recordToWebsiteRoute(item, locale, itemType.id);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (url) {
      if (item.meta.status !== 'published') {
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(
            `/api/draft-mode/enable?url=${url}&token=${token}`,
            getRequestURL(event),
          ).toString(),
        });
      }

      if (item.meta.status !== 'draft') {
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(
            `/api/draft-mode/disable?url=${url}`,
            getRequestURL(event),
          ).toString(),
        });
      }
    }

    return response;
  } catch (error) {
    handleUnexpectedError(error);
  }
});
```

Key points:

- Uses `readBody` to parse the request body (Nuxt auto-import)
- Uses `getRequestURL(event)` for the base URL
- Uses `url` as the redirect query parameter (matching the enable/disable endpoints)
- Receives `itemType` in the body and passes `itemType.id` to `recordToWebsiteRoute`
- CORS is handled via `nuxt.config.ts` route rules (see below), not manual headers

### `recordToWebsiteRoute`

**File:** `lib/datocms/recordInfo.ts`

```ts
import type { RawApiTypes } from '@datocms/cma-client';

/**
 * Maps a DatoCMS record to its frontend URL. Used by the preview-links endpoint.
 *
 * Fill in cases for each of your content models. You can find model IDs
 * in DatoCMS under Settings → Models → click a model → the ID is in the URL.
 */
export function recordToWebsiteRoute(
  item: RawApiTypes.Item,
  _locale: string,
  itemTypeId: string,
) {
  switch (itemTypeId) {
    // Scaffolded example cases. Replace them before calling
    // the Web Previews setup production-ready.
    // TODO: Add your models here. Examples:
    //
    // case 'YOUR_PAGE_MODEL_ID': {
    //   return `/page/${item.attributes.slug}`;
    // }
    //
    // case 'YOUR_BLOG_POST_MODEL_ID': {
    //   return `/blog/${item.attributes.slug}`;
    // }

    default:
      return null;
  }
}
```

Key points:

- Nuxt passes `itemTypeId` as a separate parameter (from `itemType.id` in the request body)
- Switches on model ID strings (not api\_key)

### Nuxt Config CORS Addition

Add the CORS route rule to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  // ... existing config ...
  routeRules: {
    // Add CORS headers on API routes
    '/api/**': { cors: true },
  },
});
```

### Web Previews Dependencies

No additional dependencies beyond what Core requires.

---

## Content Link (Optional)

### Note on Nuxt Content Link Support

The Nuxt starter kit pattern does NOT currently use `contentLink` or `baseEditingUrl` in its query function. The `useDraftMode` composable decodes the JWT to get the token for real-time subscriptions, but does not pass Content Link options.

To add Content Link support to Nuxt, modify the `useQuery` composable to include Content Link options when in draft mode:

```ts
import { buildRequestInit } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';
import { hash } from 'ohash';

type Options<Variables> = {
  variables?: Variables;
};

export async function useQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: Options<Variables>,
) {
  const config = useRuntimeConfig();
  const draftMode = useDraftMode();

  const apiToken = draftMode
    ? draftMode.datocmsDraftContentCdaToken
    : config.public.datocmsPublishedContentCdaToken;

  if (!apiToken) {
    throw new Error('Missing API token');
  }

  const data = await useFetch('https://graphql.datocms.com/', {
    ...buildRequestInit(query, {
      token: apiToken,
      includeDrafts: Boolean(draftMode),
      excludeInvalid: true,
      variables: options?.variables,
      contentLink: draftMode ? 'v1' : undefined,
      baseEditingUrl: draftMode ? config.public.datocmsBaseEditingUrl : undefined,
    }),
    key: hash([query, options]),
    transform: (response: { data: Result; errors?: any[] }) => {
      if (response.errors)
        throw new Error(
          `Something went wrong while executing the query: ${JSON.stringify(response.errors)}`,
        );
      return response.data;
    },
  });

  return data.data;
}
```

### Nuxt Config Content Link Addition

Add the `baseEditingUrl` to the public runtime config in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // ... existing config ...
    public: {
      // ... existing public config ...
      // set by NUXT_PUBLIC_DATOCMS_BASE_EDITING_URL env variable
      datocmsBaseEditingUrl: '',
    },
  },
});
```

### ContentLink Component Setup

Create a client component that initializes Content Link with routing support for the Web Previews Visual tab. Wrap it in `<ClientOnly>` since it requires browser APIs:

**File:** `components/ContentLink.vue`

```vue
<script setup lang="ts">
import { createController } from '@datocms/content-link';
import { onMounted, onUnmounted, watch } from 'vue';

const router = useRouter();
const route = useRoute();

let controller: ReturnType<typeof createController> | null = null;

onMounted(() => {
  controller = createController({
    onNavigateTo: (path) => {
      router.push(path);
    },
  });
  controller.enableClickToEdit();
});

watch(
  () => route.path,
  (newPath) => {
    controller?.setCurrentPath(newPath);
  },
);

onUnmounted(() => {
  controller?.dispose();
  controller = null;
});
</script>

<template>
  <div />
</template>
```

Then add it to your layout, only rendering when draft mode is enabled. Wrap in `<ClientOnly>` since `createController` requires browser APIs:

```vue
<script setup lang="ts">
const draftMode = useDraftMode();
</script>

<template>
  <ClientOnly>
    <ContentLink v-if="draftMode" />
  </ClientOnly>
  <slot />
</template>
```

### Structured Text with Content Link

When rendering Structured Text fields with `vue-datocms`, wrap the component in a group and add boundaries to embedded blocks and inline records:

```vue
<script setup lang="ts">
import { StructuredText } from 'vue-datocms';
import { stripStega } from '@datocms/content-link';
import { h } from 'vue';

const props = defineProps<{ page: any }>();
</script>

<template>
  <div data-datocms-content-link-group>
    <StructuredText
      :data="page.content"
      :render-block="({ record }) =>
        h('div', { 'data-datocms-content-link-boundary': '' }, [
          h(BlockComponent, { block: record }),
        ])
      "
      :render-inline-record="({ record }) =>
        h('span', { 'data-datocms-content-link-boundary': '' }, [
          h(InlineRecordComponent, { record }),
        ])
      "
      :render-link-to-record="({ record, children, transformedMeta }) =>
        h('a', { ...transformedMeta, href: `/posts/${stripStega(record.slug)}` }, children)
      "
    />
  </div>
</template>
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

```vue
<template>
  <span :data-datocms-content-link-url="product._editingUrl">
    ${{ product.price }}
  </span>
</template>
```

### CSP Header for Web Previews Visual Tab

Nuxt already handles CORS via `routeRules`. For CSP (needed for the Visual tab iframe), add a route rule to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  // ... existing config ...
  routeRules: {
    '/api/**': { cors: true },
    '/**': {
      headers: {
        'Content-Security-Policy': "frame-ancestors 'self' https://plugins-cdn.datocms.com",
      },
    },
  },
});
```

### Stega Stripping

Content Link embeds invisible characters in text fields. Use `stripStega()` from `@datocms/content-link` before string comparisons, SEO metadata, analytics, or URL generation. See `content-link-concepts.md` for full details and examples.

### Content Link Environment Variables

```
NUXT_PUBLIC_DATOCMS_BASE_EDITING_URL=   # For Content Link, e.g. https://your-project.admin.datocms.com/environments/main
```

### Content Link Dependencies

- `@datocms/content-link` — For click-to-edit overlays and stega utilities

---

## Real-Time Updates (Optional)

### Query Composable with Real-Time Subscription

Replace the Core `useQuery` composable with this version that adds real-time subscription support:

**File:** `composables/useQuery.ts`

```ts
import type { AsyncData } from '#app';
import { buildRequestInit } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';
import { hash } from 'ohash';
import { useQuerySubscription } from 'vue-datocms';

const isServer = typeof window === 'undefined';

type Options<Variables> = {
  variables?: Variables;
};

export async function useQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: Options<Variables>,
) {
  const config = useRuntimeConfig();
  const draftMode = useDraftMode();

  const apiToken = draftMode
    ? draftMode.datocmsDraftContentCdaToken
    : config.public.datocmsPublishedContentCdaToken;

  if (!apiToken) {
    throw new Error('Missing API token');
  }

  const initialData = await useFetch('https://graphql.datocms.com/', {
    ...buildRequestInit(query, {
      token: apiToken,
      includeDrafts: Boolean(draftMode),
      excludeInvalid: true,
      variables: options?.variables,
    }),
    key: hash([query, options]),
    transform: (response: { data: Result; errors?: any[] }) => {
      if (response.errors)
        throw new Error(
          `Something went wrong while executing the query: ${JSON.stringify(response.errors)}`,
        );
      return response.data;
    },
  });

  if (!draftMode || isServer) {
    return initialData.data;
  }

  return useQuerySubscription<Result, Variables>({
    query,
    variables: options?.variables,
    token: apiToken,
    initialData: (initialData as AsyncData<Result, null>).data.value,
    includeDrafts: true,
    excludeInvalid: true,
  }).data;
}
```

Key points:

- When draft mode is ON and running client-side, uses `useQuerySubscription` from `vue-datocms`
- When draft mode is OFF or running server-side, returns data directly

**Note: Combining with Content Link** — If the user also selected Content Link, add `contentLink` and `baseEditingUrl` to the `buildRequestInit` options (see Content Link section).

### Real-Time Dependencies

- `vue-datocms` — For `useQuerySubscription` composable

---

## Cache Tags (Optional)

CDN-first cache tag invalidation for Nuxt. Instead of revalidating all content on every change, this forwards DatoCMS cache tags to your CDN, which purges only the affected pages when content changes.

### When to Use

- Your Nuxt site is deployed behind a CDN that supports tag-based purging (Netlify, Cloudflare, Fastly, Bunny)
- You want per-record granularity in cache invalidation

For the webhook payload structure and CDN header table, see `skills/datocms-cda/references/draft-caching-environments.md` → "Cache Tags".

### Modified Query Composable

Switch from `executeQuery` to `rawExecuteQuery` to access the `x-cache-tags` response header. This version returns both data and cache tags:

**File:** `composables/useQueryWithCacheTags.ts`

```ts
import { rawExecuteQuery } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';

type Options<Variables> = {
  variables?: Variables;
};

export async function useQueryWithCacheTags<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: Options<Variables>,
) {
  const config = useRuntimeConfig();

  const [data, response] = await rawExecuteQuery(query, {
    token: config.public.datocmsPublishedContentCdaToken,
    excludeInvalid: true,
    variables: options?.variables,
    returnCacheTags: true,
  });

  const cacheTags = response.headers.get('x-cache-tags') ?? '';

  return { data, cacheTags };
}
```

Alternatively, use `rawExecuteQuery` directly in a Nuxt server route or server middleware to set CDN headers on the response:

**File:** `server/middleware/cache-tags.ts` (example pattern)

```ts
import { rawExecuteQuery } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';

export async function fetchWithCacheTags<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  variables?: Variables,
) {
  const config = useRuntimeConfig();

  const [data, response] = await rawExecuteQuery(query, {
    token: config.public.datocmsPublishedContentCdaToken,
    excludeInvalid: true,
    variables,
    returnCacheTags: true,
  });

  const cacheTags = response.headers.get('x-cache-tags') ?? '';

  return { data, cacheTags };
}
```

### Setting CDN Headers

In your Nuxt server routes or pages, set the CDN-specific header on the response:

```ts
// In a server route (server/api/...)
export default eventHandler(async (event) => {
  const { data, cacheTags } = await fetchWithCacheTags(myQuery);

  // Set the CDN-specific header — choose the one matching your CDN:
  // Netlify / Cloudflare: 'Cache-Tag'
  // Fastly:               'Surrogate-Key'
  // Bunny:                'CDN-Tag'
  setResponseHeader(event, 'Cache-Tag', cacheTags);

  return data;
});
```

For pages using `useResponseHeaders` in Nitro:

```ts
// In a Nuxt page or layout (server-side rendering)
const { data, cacheTags } = await fetchWithCacheTags(myQuery);

// In server middleware or via useRequestEvent():
const event = useRequestEvent();
if (event) {
  setResponseHeader(event, 'Cache-Tag', cacheTags);
}
```

### Webhook Handler

**File:** `server/api/invalidate-cache.ts`

Receives the DatoCMS cache tag invalidation webhook and calls your CDN's purge API:

```ts
import { ensureHttpMethods } from '~/lib/api/utils';

export default eventHandler(async (event) => {
  ensureHttpMethods(event, 'POST');

  const config = useRuntimeConfig();

  const authHeader = getHeader(event, 'authorization');
  if (authHeader !== `Bearer ${config.cacheInvalidationWebhookSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const body = await readBody(event);
  const tags: string[] = body?.entity?.attributes?.tags ?? [];

  if (tags.length === 0) {
    return { purged: false };
  }

  // Call your CDN's purge API. Example for Fastly:
  //
  // await fetch(`https://api.fastly.com/service/${config.fastlyServiceId}/purge`, {
  //   method: 'POST',
  //   headers: {
  //     'Fastly-Key': config.fastlyKey,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ surrogate_keys: tags }),
  // });
  //
  // For Netlify, Cloudflare, or Bunny, use their respective purge APIs.

  return { purged: true, tags };
});
```

### Nuxt Config Cache Tags Addition

Add the webhook secret and CDN-specific vars to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    // ... existing config ...
    // set by NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET env variable
    cacheInvalidationWebhookSecret: '',
    // CDN-specific (example for Fastly):
    // set by NUXT_FASTLY_SERVICE_ID env variable
    // fastlyServiceId: '',
    // set by NUXT_FASTLY_KEY env variable
    // fastlyKey: '',
  },
});
```

### Cache Tags Environment Variables

```
NUXT_CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
# CDN-specific vars (uncomment for your CDN):
# NUXT_FASTLY_SERVICE_ID=                 # Fastly service ID
# NUXT_FASTLY_KEY=                        # Fastly API key
```

### Cache Tags Dependencies

No additional dependencies — `rawExecuteQuery` is provided by `@datocms/cda-client` which should already be installed.
