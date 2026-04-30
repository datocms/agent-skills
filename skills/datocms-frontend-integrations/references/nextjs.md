# Next.js App Router — Draft Mode Reference

This reference contains the exact code patterns for implementing draft mode in a Next.js App Router project with DatoCMS. Sections are organized by feature — always follow `## Core`, then follow optional sections only for features the user selected.

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
src/app/api/
├── draft-mode/
│   ├── enable/route.ts
│   └── disable/route.ts
└── utils.ts
src/lib/datocms/
└── executeQuery.ts          (modify existing or create)
```

### Enable Endpoint

**File:** `src/app/api/draft-mode/enable/route.ts`

```ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import {
  handleUnexpectedError,
  invalidRequestResponse,
  isRelativeUrl,
  makeDraftModeWorkWithinIframes,
} from '../../utils';

export const dynamic = 'force-dynamic';

/**
 * This route handler enables Next.js Draft Mode.
 *
 * https://nextjs.org/docs/app/building-your-application/configuring/draft-mode
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';

  try {
    if (token !== process.env.SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    if (!isRelativeUrl(redirectTo)) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    const draft = await draftMode();
    draft.enable();

    await makeDraftModeWorkWithinIframes();
  } catch (error) {
    return handleUnexpectedError(error);
  }

  redirect(redirectTo);
}
```

Key points:

- Uses Next.js built-in `draftMode()` from `next/headers`
- No JWT needed — Next.js manages the `__prerender_bypass` cookie
- Must call `makeDraftModeWorkWithinIframes()` after enable/disable to add `partitioned: true`
- `export const dynamic = 'force-dynamic'` prevents caching of this route

### Disable Endpoint

**File:** `src/app/api/draft-mode/disable/route.ts`

```ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import {
  handleUnexpectedError,
  invalidRequestResponse,
  isRelativeUrl,
  makeDraftModeWorkWithinIframes,
} from '../../utils';

export const dynamic = 'force-dynamic';

/**
 * This route handler disables Next.js Draft Mode.
 *
 * https://nextjs.org/docs/app/building-your-application/configuring/draft-mode
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';

  try {
    if (!isRelativeUrl(redirectTo)) {
      return invalidRequestResponse('URL must be relative!', 422);
    }

    const draft = await draftMode();
    draft.disable();

    await makeDraftModeWorkWithinIframes();
  } catch (error) {
    return handleUnexpectedError(error);
  }

  redirect(redirectTo);
}
```

Key points:

- No token validation on disable (safe because it only reduces access)
- Still validates the redirect URL to prevent open redirects

### Utils

**File:** `src/app/api/utils.ts`

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
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

export function handleUnexpectedError(error: unknown) {
  try {
    throw error;
  } catch (e) {
    console.error(e);
  }

  return invalidRequestResponse(serializeError(error), 500);
}

export function invalidRequestResponse(error: unknown, status = 422) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    withCORS({ status }),
  );
}

export function successfulResponse(data?: unknown, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    withCORS({ status }),
  );
}

/**
 * Rewrites the __prerender_bypass cookie set by Next.js draftMode() to add
 * the `partitioned` attribute, which is required for CHIPS (third-party
 * cookie support in iframes).
 *
 * This is necessary because Next.js does not yet set `partitioned: true` on
 * the draft mode cookie, but the site needs to work inside the DatoCMS
 * "Web Previews" plugin iframe.
 */
export async function makeDraftModeWorkWithinIframes() {
  const cookie = (await cookies()).get('__prerender_bypass')!;

  (await cookies()).set({
    name: '__prerender_bypass',
    value: cookie?.value,
    httpOnly: true,
    path: '/',
    secure: true,
    sameSite: 'none',
    partitioned: true,
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

### Query Function Modification

**File:** `src/lib/datocms/executeQuery.ts`

If the project already has an `executeQuery` wrapper, modify it to add the `includeDrafts` option. If not, create this file:

```ts
import { executeQuery as libExecuteQuery } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';

export const cacheTag = 'datocms';

export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>,
) {
  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!
      : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    requestInitOptions: {
      cache: 'force-cache',
      next: {
        tags: [cacheTag],
      },
    },
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

Key points:

- Uses Next.js `force-cache` with tag-based invalidation
- The `cacheTag` can be used with `revalidateTag('datocms')` in a webhook handler
- Switches between published and draft tokens based on `includeDrafts`

### Core Environment Variables

```
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=   # Published content CDA token
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=       # Draft content CDA token (with "Include drafts")
SECRET_API_TOKEN=                       # Shared secret for endpoint auth
```

### Core Dependencies

Required (install if missing):

- `serialize-error` — For serializing error objects in API responses

---

## Web Previews (Optional)

### Preview Links Endpoint

**File:** `src/app/api/preview-links/route.ts`

```ts
import { recordToWebsiteRoute } from '@/lib/datocms/recordInfo';
import { deserializeRawItem } from '@datocms/rest-client-utils';
import { type NextRequest, NextResponse } from 'next/server';
import { handleUnexpectedError, invalidRequestResponse, withCORS } from '../utils';

export async function OPTIONS() {
  return new Response('OK', withCORS());
}

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
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (token !== process.env.SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    const { item, locale } = await request.json();

    const url = await recordToWebsiteRoute(deserializeRawItem(item), locale);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (url) {
      if (item.meta.status !== 'published') {
        response.previewLinks.push({
          label: 'Draft version',
          url: new URL(
            `/api/draft-mode/enable?redirect=${url}&token=${token}`,
            request.url,
          ).toString(),
        });
      }

      if (item.meta.status !== 'draft') {
        response.previewLinks.push({
          label: 'Published version',
          url: new URL(
            `/api/draft-mode/disable?redirect=${url}`,
            request.url,
          ).toString(),
        });
      }
    }

    return NextResponse.json(response, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
```

Key points:

- Uses `deserializeRawItem` from `@datocms/rest-client-utils` to convert the raw item before passing to `recordToWebsiteRoute`
- The request body contains `item` (the record) and `locale`
- The Next.js version does NOT receive `itemType` in the body — it uses `item.__itemTypeId` instead

### `recordToWebsiteRoute`

**File:** `src/lib/datocms/recordInfo.ts`

```ts
import type { RawApiTypes } from '@datocms/cma-client';

/**
 * Maps a DatoCMS record to its frontend URL. Used by the preview-links
 * and seo-analysis endpoints.
 *
 * Fill in cases for each of your content models. You can find model IDs
 * in DatoCMS under Settings → Models → click a model → the ID is in the URL.
 */
export async function recordToWebsiteRoute(
  item: RawApiTypes.Item,
  _locale: string,
): Promise<string | null> {
  switch (item.__itemTypeId) {
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

### Web Previews Dependencies

- `@datocms/rest-client-utils` — For `deserializeRawItem` in the preview-links endpoint

---

## Content Link (Optional)

### Query Function Content Link Addition

Modify the `executeQuery` function from the Core section to add Content Link support. Add these two options inside the `libExecuteQuery` call:

```ts
contentLink: options?.includeDrafts ? 'v1' : undefined,
baseEditingUrl: options?.includeDrafts ? process.env.DATOCMS_BASE_EDITING_URL : undefined,
```

The full query function with Content Link enabled:

```ts
import { executeQuery as libExecuteQuery } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';

export const cacheTag = 'datocms';

export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>,
) {
  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
      ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!
      : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    /*
     * Content Link: embeds stega-encoded metadata in text fields,
     * which the @datocms/content-link package uses to create
     * click-to-edit overlays.
     */
    contentLink: options?.includeDrafts ? 'v1' : undefined,
    baseEditingUrl: options?.includeDrafts ? process.env.DATOCMS_BASE_EDITING_URL : undefined,
    requestInitOptions: {
      cache: 'force-cache',
      next: {
        tags: [cacheTag],
      },
    },
  });

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
};
```

### ContentLink Component Setup

Create a client component that initializes Content Link with routing support for the Web Previews Visual tab.

> **Alternative:** The `react-datocms` package also exports a declarative `<ContentLink>` component (see `react-content-link.md`). The imperative `createController` approach below gives more control over lifecycle and routing; the `<ContentLink>` component is simpler for basic setups.

**File:** `src/components/ContentLink.tsx`

```tsx
'use client';

import { createController } from '@datocms/content-link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ContentLink() {
  const router = useRouter();
  const pathname = usePathname();
  const controllerRef = useRef<ReturnType<typeof createController> | null>(null);

  useEffect(() => {
    const controller = createController({
      onNavigateTo: (path) => {
        router.push(path);
      },
    });
    controller.enableClickToEdit();
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [router]);

  useEffect(() => {
    controllerRef.current?.setCurrentPath(pathname);
  }, [pathname]);

  return null;
}
```

Then add it to your root layout, only rendering when draft mode is enabled:

```tsx
import { draftMode } from 'next/headers';
import { ContentLink } from '@/components/ContentLink';

export default async function RootLayout({ children }) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <html>
      <body>
        {isDraftMode && <ContentLink />}
        {children}
      </body>
    </html>
  );
}
```

### Structured Text with Content Link

When rendering Structured Text fields, wrap the component in a group and add boundaries to embedded blocks and inline records. This ensures clicks on the main text open the structured text field editor, while clicks on blocks/records open their own editor:

```tsx
import { StructuredText } from 'react-datocms';
import { stripStega } from '@datocms/content-link';

function PageContent({ page }) {
  return (
    <div data-datocms-content-link-group>
      <StructuredText
        data={page.content}
        renderBlock={({ record }) => (
          <div data-datocms-content-link-boundary>
            <BlockComponent block={record} />
          </div>
        )}
        renderInlineRecord={({ record }) => (
          <span data-datocms-content-link-boundary>
            <InlineRecordComponent record={record} />
          </span>
        )}
        renderLinkToRecord={({ record, children, transformedMeta }) => (
          <a {...transformedMeta} href={`/posts/${stripStega(record.slug)}`}>
            {children}
          </a>
        )}
      />
    </div>
  );
}
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

```tsx
<span data-datocms-content-link-url={product._editingUrl}>
  ${product.price}
</span>
```

### CSP Header for Web Previews Visual Tab

To allow your site to be loaded in the Web Previews Visual tab iframe, add a Content-Security-Policy header. In `next.config.js`:

```js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://plugins-cdn.datocms.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Stega Stripping

Content Link embeds invisible characters in text fields. Use `stripStega()` from `@datocms/content-link` before string comparisons, SEO metadata, analytics, or URL generation. See `content-link-concepts.md` for full details and examples.

### Content Link Environment Variables

```
DATOCMS_BASE_EDITING_URL=              # For Content Link, e.g. https://your-project.admin.datocms.com/environments/main
```

### Content Link Dependencies

- `@datocms/content-link` — For click-to-edit overlays and stega utilities

---

## Real-Time Updates (Optional)

For real-time updates in draft mode, create two helper components:

### `generatePageComponent`

**File:** `src/lib/datocms/realtime/generatePageComponent.tsx`

```tsx
import type { TadaDocumentNode } from 'gql.tada';
import { draftMode } from 'next/headers';
import type { ComponentType } from 'react';
import { executeQuery } from '../executeQuery';
import type { RealtimeComponentType } from './generateRealtimeComponent';

/**
 * Generates a Next.js page component that:
 * - When Draft Mode is ON: fetches draft content and renders realtimeComponent
 * - When Draft Mode is OFF: fetches published content and renders contentComponent
 */
export function generatePageComponent<PageProps, Result, Variables>(
  options: GeneratePageComponentOptions<PageProps, Result, Variables>,
) {
  return async function Page(unsanitizedPageProps: PageProps) {
    const { isEnabled: isDraftModeEnabled } = await draftMode();

    const pageProps = Object.fromEntries(
      Object.entries(unsanitizedPageProps as Record<string, unknown>).filter(
        ([key]) => key !== 'searchParams',
      ),
    ) as PageProps;

    const variables = options.buildQueryVariables
      ? await options.buildQueryVariables(pageProps)
      : ({} as Variables);

    const data = await executeQuery(options.query, {
      variables,
      includeDrafts: isDraftModeEnabled,
    });

    const { realtimeComponent: RealTimeComponent, contentComponent: ContentComponent } = options;

    return isDraftModeEnabled ? (
      <RealTimeComponent
        token={process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!}
        query={options.query}
        variables={variables}
        initialData={data}
        pageProps={pageProps}
        includeDrafts={isDraftModeEnabled}
        excludeInvalid={true}
      />
    ) : (
      <ContentComponent {...pageProps} data={data} />
    );
  };
}

export type ContentComponentType<PageProps, Result> = ComponentType<
  PageProps & {
    data: Result;
  }
>;

export type GeneratePageComponentOptions<PageProps, Result, Variables> = {
  query: TadaDocumentNode<Result, Variables>;
  buildQueryVariables?: (pageProps: PageProps) => Promise<Variables> | Variables;
  contentComponent: ContentComponentType<PageProps, Result>;
  realtimeComponent: RealtimeComponentType<PageProps, Result, Variables>;
};
```

**Note: Combining with Content Link** — If the user also selected Content Link, add these props to the `RealTimeComponent` render:

```tsx
contentLink={isDraftModeEnabled ? 'v1' : undefined}
baseEditingUrl={isDraftModeEnabled ? process.env.DATOCMS_BASE_EDITING_URL : undefined}
```

### `generateRealtimeComponent`

**File:** `src/lib/datocms/realtime/generateRealtimeComponent.tsx`

```tsx
import type { TadaDocumentNode } from 'gql.tada';
import type { ComponentType } from 'react';
import { type EnabledQueryListenerOptions, useQuerySubscription } from 'react-datocms';
import type { ContentComponentType } from './generatePageComponent';

/**
 * Generates a Client Component that subscribes to DatoCMS's Real-time Updates
 * API using the useQuerySubscription hook.
 */
export function generateRealtimeComponent<PageProps, Result, Variables>({
  query,
  contentComponent: ContentComponent,
}: GenerateRealtimeComponentOptions<PageProps, Result, Variables>) {
  const RealtimeComponent: RealtimeComponentType<PageProps, Result, Variables> = ({
    pageProps,
    ...subscriptionOptions
  }) => {
    const { data, error } = useQuerySubscription(subscriptionOptions);

    if (error) {
      return (
        <div>
          <pre>{error.code}</pre>: {error.message}
        </div>
      );
    }

    if (!data) return null;

    return <ContentComponent {...pageProps} data={data} />;
  };

  return RealtimeComponent;
}

type GenerateRealtimeComponentOptions<PageProps, Result, Variables> = {
  query: TadaDocumentNode<Result, Variables>;
  contentComponent: ContentComponentType<PageProps, Result>;
};

export type RealtimeComponentType<PageProps, Result, Variables> = ComponentType<
  EnabledQueryListenerOptions<Result, Variables> & {
    pageProps: PageProps;
  }
>;
```

### Usage Pattern

In your page file (e.g., `src/app/blog/[slug]/page.tsx`):

```tsx
'use client'; // The realtime component file must be a client component

import { generateRealtimeComponent } from '@/lib/datocms/realtime/generateRealtimeComponent';
import { ContentComponent } from './ContentComponent'; // Your presentational component
import { query } from './query'; // Your GraphQL query

export const RealtimeComponent = generateRealtimeComponent({
  query,
  contentComponent: ContentComponent,
});
```

Then in the page's server component:

```tsx
import { generatePageComponent } from '@/lib/datocms/realtime/generatePageComponent';
import { ContentComponent } from './ContentComponent';
import { RealtimeComponent } from './RealtimeComponent';
import { query } from './query';

export default generatePageComponent({
  query,
  contentComponent: ContentComponent,
  realtimeComponent: RealtimeComponent,
  buildQueryVariables: async ({ params }) => {
    const { slug } = await params;
    return { slug };
  },
});
```

### Real-Time Dependencies

- `react-datocms` — For `useQuerySubscription` hook

---

## Cache Tags (Optional)

Granular per-record cache invalidation using DatoCMS cache tags. This replaces the simple `cacheTag = 'datocms'` approach from Core (which revalidates **all** DatoCMS content on any change) with targeted invalidation — only pages affected by a content change are revalidated.

### When to Use

Use cache tags when:

- The site has many pages and full-site revalidation is too slow or wasteful
- You want per-record or per-query granularity in cache invalidation
- You are deploying on Vercel or any platform that supports Next.js `revalidateTag()`

**Note:** This section covers the Next.js-specific `revalidateTag()` approach. For the CDN-first approach (Netlify, Cloudflare, Fastly, Bunny), see the `## Cache Tags (Optional)` section in the respective framework reference (`nuxt.md`, `sveltekit.md`, `astro.md`).

### The 64-Tag Problem

Next.js limits each `fetch()` call to **64 cache tags**. A single DatoCMS GraphQL query can return hundreds of tags (one per record, asset, model, etc. touched by the query). You cannot pass DatoCMS tags directly to `next: { tags: [...] }`.

### Solution: Query ID Indirection

Each query gets a stable **Query ID** (a string you choose). The `fetch` is tagged with only that single Query ID. A database table maps each Query ID to all the DatoCMS cache tags returned for that query. When a webhook fires with invalidated tags, the handler looks up which Query IDs are affected and calls `revalidateTag()` for each.

### File Structure

```
src/lib/datocms/
├── executeQuery.ts          (replace Core version)
├── cache-tags-db.ts         (DB abstraction)
src/app/api/
└── revalidate/
    └── route.ts             (webhook handler)
```

### Replacement `executeQuery`

**File:** `src/lib/datocms/executeQuery.ts`

This version replaces the Core `executeQuery`. It is backward-compatible: when no `queryId` is provided, it falls back to the simple single-tag approach.

```ts
import { rawExecuteQuery } from '@datocms/cda-client';
import type { TadaDocumentNode } from 'gql.tada';
import { draftMode } from 'next/headers';
import { cache } from 'react';
import { cacheTagsDb } from './cache-tags-db';

export const cacheTag = 'datocms';

export const executeQuery = cache(executeQueryFn);

async function executeQueryFn<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>,
) {
  const { isEnabled: isDraft } = await draftMode();

  const includeDrafts = options?.includeDrafts ?? isDraft;

  const queryId = options?.queryId;
  const tags = queryId ? [queryId] : [cacheTag];

  const [result, response] = await rawExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: true,
    includeDrafts,
    token: includeDrafts
      ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!
      : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    returnCacheTags: !!queryId,
    requestInitOptions: {
      cache: 'force-cache',
      next: { tags },
    },
  });

  if (queryId) {
    const datocmsTags = (response.headers.get('x-cache-tags') ?? '').split(' ').filter(Boolean);
    await cacheTagsDb.storeTags(queryId, datocmsTags);
  }

  return result;
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables;
  includeDrafts?: boolean;
  queryId?: string;
};
```

Key points:

- When `queryId` is provided: uses `rawExecuteQuery` with `returnCacheTags: true`, reads the `x-cache-tags` header, persists the mapping to DB, and tags the fetch with `[queryId]`
- When `queryId` is omitted: falls back to the simple `cacheTag = 'datocms'` approach (no DB interaction, no raw query)
- Wrapped in React `cache()` to deduplicate identical calls within a single request
- Reads `draftMode()` automatically, but allows explicit override via `options.includeDrafts`

### DB Abstraction

**File:** `src/lib/datocms/cache-tags-db.ts`

Interface + Turso (libSQL) implementation. Replace with `@vercel/postgres` or any other DB as needed.

```ts
import { createClient } from '@libsql/client';

interface CacheTagsDb {
  /**
   * Replace all stored DatoCMS tags for a given Query ID.
   */
  storeTags(queryId: string, tags: string[]): Promise<void>;

  /**
   * Given a list of invalidated DatoCMS tags, return the Query IDs
   * that have at least one matching tag.
   */
  findQueryIdsForTags(tags: string[]): Promise<string[]>;
}

function createTursoDb(): CacheTagsDb {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  // Ensure the table exists on first use
  const init = turso.execute(`
    CREATE TABLE IF NOT EXISTS query_cache_tags (
      query_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (query_id, tag)
    )
  `);

  return {
    async storeTags(queryId, tags) {
      await init;

      await turso.batch([
        {
          sql: 'DELETE FROM query_cache_tags WHERE query_id = ?',
          args: [queryId],
        },
        ...tags.map((tag) => ({
          sql: 'INSERT OR IGNORE INTO query_cache_tags (query_id, tag) VALUES (?, ?)',
          args: [queryId, tag],
        })),
      ]);
    },

    async findQueryIdsForTags(tags) {
      await init;

      if (tags.length === 0) return [];

      const placeholders = tags.map(() => '?').join(', ');
      const result = await turso.execute({
        sql: `SELECT DISTINCT query_id FROM query_cache_tags WHERE tag IN (${placeholders})`,
        args: tags,
      });

      return result.rows.map((row) => String(row.query_id));
    },
  };
}

export const cacheTagsDb = createTursoDb();
```

The schema is a simple join table: `query_cache_tags(query_id, tag)`. Each time a query runs, its previous tags are deleted and the new set is inserted.

### Webhook Route Handler

**File:** `src/app/api/revalidate/route.ts`

```ts
import { cacheTagsDb } from '@/lib/datocms/cache-tags-db';
import { cacheTag } from '@/lib/datocms/executeQuery';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CACHE_INVALIDATION_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const tags: string[] = body?.entity?.attributes?.tags ?? [];

  // Always revalidate the global "datocms" tag for queries that don't use queryId
  revalidateTag(cacheTag);

  // Look up which Query IDs are affected by the invalidated tags
  const affectedQueryIds = await cacheTagsDb.findQueryIdsForTags(tags);

  for (const queryId of affectedQueryIds) {
    revalidateTag(queryId);
  }

  return NextResponse.json({
    revalidated: true,
    affectedQueryIds,
  });
}
```

### Page-Level Config

Pages that use cache tags should be statically generated:

```ts
export const dynamic = 'force-static';
```

Add this export to each page file that calls `executeQuery` with a `queryId`. This ensures pages are built at build time and only revalidated when the webhook fires.

### Usage Example

In a page component, pass a stable `queryId`:

```tsx
import { executeQuery } from '@/lib/datocms/executeQuery';

export const dynamic = 'force-static';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const data = await executeQuery(query, {
    variables: { slug },
    queryId: `blog-post-${slug}`,
  });

  return <Article data={data} />;
}
```

The `queryId` should be stable and unique per query+variables combination. A simple pattern is `${page-type}-${identifier}`.

### Environment Variables

```
CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
TURSO_DATABASE_URL=                  # Turso database URL (or replace with your DB)
TURSO_AUTH_TOKEN=                    # Turso auth token
```

### Dependencies

- `@libsql/client` — Turso/libSQL client for the cache tags database

Alternative DB clients: `@vercel/postgres` (Vercel Postgres), `@planetscale/database` (PlanetScale), or any SQL client. The schema is a simple two-column join table — adapt `cache-tags-db.ts` to your preferred database.
