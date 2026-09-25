# Next.js App Router — Draft Mode Reference

Exact code patterns for draft mode with DatoCMS. Follow `## Core` first, then optional sections for selected features.

## Contents

- Core
- Web Previews (Optional)
- Content Link (Optional)
- Real-Time Updates (Optional)
- Cache Tags (Optional)

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
    if (!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN) {
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

Uses Next.js `draftMode()` — no JWT needed. Call `makeDraftModeWorkWithinIframes()` after enable/disable to add `partitioned: true`. `export const dynamic = 'force-dynamic'` prevents caching.

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

No token validation on disable (safe). Still validates redirect URL to prevent open redirects.

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

### Query Function Modification

**File:** `src/lib/datocms/executeQuery.ts`

Modify existing `executeQuery` wrapper or create:

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

`force-cache` holds published responses until `cacheTag` is revalidated; Core alone never does (Vercel Data Cache survives deploys). New wrapper: add bearer-`SECRET_API_TOKEN` POST route (e.g. `src/app/api/invalidate-cache/route.ts`) calling `revalidateTag(cacheTag, { expire: 0 })` on Next 16+, `revalidateTag(cacheTag)` on Next ≤15 (check installed `next`), hit by a DatoCMS webhook (`cda_cache_tags` → `invalidate`, `Authorization: Bearer` header) — Cache Tags handler minus DB lookup. Patching: keep existing cache policy. `includeDrafts` picks draft/published token.

### Core Environment Variables

```
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=   # Published content CDA token
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=       # Draft content CDA token (with "Include drafts")
SECRET_API_TOKEN=                       # Shared secret for endpoint auth
```

### Core Dependencies

Required: `serialize-error`

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

    if (!process.env.SECRET_API_TOKEN || token !== process.env.SECRET_API_TOKEN) {
      return invalidRequestResponse('Invalid token', 401);
    }

    const { item, locale } = await request.json();

    const url = await recordToWebsiteRoute(deserializeRawItem(item), locale);

    const response: WebPreviewsResponse = { previewLinks: [] };

    if (url) {
      if (item.meta.status !== 'published') {
        const draftUrl = new URL('/api/draft-mode/enable', request.url);
        draftUrl.searchParams.set('redirect', url);
        draftUrl.searchParams.set('token', token);
        response.previewLinks.push({
          label: 'Draft version',
          url: draftUrl.toString(),
        });
      }

      if (item.meta.status !== 'draft') {
        const publishedUrl = new URL('/api/draft-mode/disable', request.url);
        publishedUrl.searchParams.set('redirect', url);
        response.previewLinks.push({
          label: 'Published version',
          url: publishedUrl.toString(),
        });
      }
    }

    return NextResponse.json(response, withCORS());
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
```

Web Previews sends a raw JSON:API `item`, plus `itemType` and `locale`. The incoming item has `relationships.item_type.data.id`; `__itemTypeId` is added by `deserializeRawItem` from `@datocms/rest-client-utils` and is not present in the wire payload. Deserialize before using that discriminator, or read the raw relationship directly. This example only consumes `item` and `locale`.

### `recordToWebsiteRoute`

**File:** `src/lib/datocms/recordInfo.ts`

Requires generated `cma-types` ([how](./web-previews-concepts.md#recordtowebsiteroute-pattern)).

```ts
import type { RawApiTypes } from '@datocms/cma-client';
import * as Schema from '@/lib/datocms/cma-types';

/**
 * Maps a DatoCMS record to its frontend URL. Used by the preview-links
 * and seo-analysis endpoints.
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

### Web Previews Dependencies

Required: `@datocms/rest-client-utils`

## Content Link (Optional)

### Query Function Content Link Addition

Modify `executeQuery` from Core to add Content Link support:

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
    baseEditingUrl: process.env.DATOCMS_BASE_EDITING_URL,
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

**File:** `src/components/ContentLink.tsx` — the Next.js App Router client component from [react-content-link.md § Next.js App Router](./react-content-link.md#nextjs-app-router), plus `enableClickToEdit={{ hoverOnly: true }}`.

Add to root layout, render only when draft mode enabled:

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

Group/boundary rules and example: [react-content-link.md § Structured Text Integration](./react-content-link.md#structured-text-integration).

### Non-Text Field Example

For fields without stega encoding (numbers, booleans, dates, JSON), use `data-datocms-content-link-url` with `_editingUrl`:

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

If the site already sends a `frame-ancestors` directive, make sure it allows both the exact DatoCMS project origin and the plugin CDN. Browsers check every ancestor in the nested iframe chain. If the directive is absent, do not add it solely for Web Previews.

For example, update the existing Content-Security-Policy header in `next.config.js`, replacing `your-project` with the project's actual subdomain (or use its custom DatoCMS admin origin):

```js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://your-project.admin.datocms.com https://plugins-cdn.datocms.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Stega Stripping

Content Link embeds invisible characters in text fields. Use `stripStega()` from `react-datocms/stega` before string comparisons, SEO metadata, analytics, or URL generation from stega-carrying text. DatoCMS `slug` field type never carries stega — use directly. See `content-link-concepts.md` for full details and field-type exception list.

### Content Link Environment Variables

```
DATOCMS_BASE_EDITING_URL=              # For Content Link, e.g. https://your-project.admin.datocms.com
```

### Content Link Dependencies

Required: `react-datocms` (`<ContentLink />`), `@datocms/content-link`

## Real-Time Updates (Optional)

Create two helper components for real-time updates in draft mode.

Keep the draft token inside the server's enabled-draft branch. Passing it to a client component with a disabled subscription still serializes it into the public HTML/RSC payload; published renders must receive neither draft credentials nor draft subscription options.

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
        environment={process.env.DATOCMS_ENVIRONMENT}
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

**Note:** If user also selected Content Link, add these props to `RealTimeComponent` render:

```tsx
contentLink={isDraftModeEnabled ? 'v1' : undefined}
baseEditingUrl={isDraftModeEnabled ? process.env.DATOCMS_BASE_EDITING_URL : undefined}
```

### `generateRealtimeComponent`

**File:** `src/lib/datocms/realtime/generateRealtimeComponent.tsx`

```tsx
import type { TadaDocumentNode } from 'gql.tada';
import type { ComponentType } from 'react';
import { type EnabledQueryListenerOptions, useQuerySubscription } from 'react-datocms/use-query-subscription';
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

Keep shared GraphQL queries in a plain module without `'use client'`, imported by both the server page and the subscription component. A server page cannot read a query value exported from a client module: that import is a client reference, not the query string or document.

In a dedicated client component (e.g., `src/app/blog/[slug]/RealtimeComponent.tsx`; keep `page.tsx` server-side):

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

In page's server component:

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

A production build does not exercise server-side CDA requests. Start the built app and request an actual configured page in published and draft modes before reporting the integration as runtime-verified; if credentials or execution are unavailable, report that check as outstanding.

### Real-Time Dependencies

- `react-datocms` — For `useQuerySubscription` hook

## Cache Tags (Optional)

Granular per-record cache invalidation using DatoCMS cache tags. Replaces Core's single `cacheTag = 'datocms'` (webhook revalidates **all** DatoCMS content) with targeted invalidation.

### When to Use

- Many pages where full-site revalidation is too slow/wasteful
- Want per-record or per-query granularity
- Deploying on Vercel or platform supporting Next.js `revalidateTag()`

Note: For CDN-first approach (Netlify, Cloudflare, Fastly, Bunny), see `## Cache Tags (Optional)` in respective framework reference.

### Fetch tag limits

Next.js limits each `fetch()` to **128 cache tags**. DatoCMS queries can return hundreds. Use query ID indirection.

### Solution: Query ID Indirection

Each query gets a stable **Query ID**. Fetch is tagged with that single Query ID. DB maps Query IDs to DatoCMS cache tags. Webhook looks up affected Query IDs and calls `revalidateTag()`.

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

Replaces Core `executeQuery`. Backward-compatible: no `queryId` → falls back to simple single-tag approach.

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
    returnCacheTags: !!queryId && !includeDrafts,
    requestInitOptions: includeDrafts
      ? { cache: 'no-store' }
      : { cache: 'force-cache', next: { tags } },
  });

  if (queryId && !includeDrafts) {
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

When `queryId` provided: uses `rawExecuteQuery` with `returnCacheTags: true`, reads `x-cache-tags` header, persists mapping to DB, tags fetch with `[queryId]`. When omitted: falls back to simple `cacheTag = 'datocms'` approach. Wrapped in React `cache()` to deduplicate calls. Reads `draftMode()` automatically.

### DB Abstraction

**File:** `src/lib/datocms/cache-tags-db.ts`

Interface + Turso (libSQL) implementation. Replace with `@vercel/postgres` or any DB:

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

      // Bound database parameters independently of CDN purge limits.
      const queryIds = new Set<string>();
      for (let offset = 0; offset < tags.length; offset += 100) {
        const batch = tags.slice(offset, offset + 100);
      const placeholders = batch.map(() => '?').join(', ');
      const result = await turso.execute({
        sql: `SELECT DISTINCT query_id FROM query_cache_tags WHERE tag IN (${placeholders})`,
        args: batch,
      });

      for (const row of result.rows) queryIds.add(String(row.query_id));
      }
      return [...queryIds];
    },
  };
}

export const cacheTagsDb = createTursoDb();
```

Schema: `query_cache_tags(query_id, tag)` join table. Each query run deletes previous tags and inserts new set.

### Webhook Route Handler

**File:** `src/app/api/revalidate/route.ts`

```ts
import { cacheTagsDb } from '@/lib/datocms/cache-tags-db';
import { cacheTag } from '@/lib/datocms/executeQuery';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (!process.env.CACHE_INVALIDATION_WEBHOOK_SECRET || authHeader !== `Bearer ${process.env.CACHE_INVALIDATION_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const tags: string[] = body?.entity?.attributes?.tags;
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || !tag)) {
    return NextResponse.json({ error: 'Invalid tags' }, { status: 400 });
  }
  if (tags.length === 0) return NextResponse.json({ revalidated: false });

  // Always revalidate the global "datocms" tag for queries that don't use queryId
  // Next 16+: `{ expire: 0 }` = immediate expiration (required for webhook-driven invalidation)
  // Next ≤15: revalidateTag(tag) accepts no second argument
  revalidateTag(cacheTag, { expire: 0 });

  // Look up which Query IDs are affected by the invalidated tags
  const affectedQueryIds = await cacheTagsDb.findQueryIdsForTags(tags);

  for (const queryId of affectedQueryIds) {
    revalidateTag(queryId, { expire: 0 });
  }

  return NextResponse.json({
    revalidated: true,
    affectedQueryIds,
  });
}
```

### Page-Level Config

Preserve the existing rendering mode. Do not force static rendering on a route that must inspect draft cookies. A separate published-only route may opt into static rendering:

```ts
export const dynamic = 'force-static';
```

### Usage Example

```tsx
import { executeQuery } from '@/lib/datocms/executeQuery';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const data = await executeQuery(query, {
    variables: { slug },
    queryId: `blog-post-${slug}`,
  });

  return <Article data={data} />;
}
```

Use stable `queryId` per query, variables, environment, and published access scope. Draft requests use `no-store` and never replace published tag mappings. Pattern: `${page-type}-${identifier}`.

### Environment Variables

```
CACHE_INVALIDATION_WEBHOOK_SECRET=   # Shared secret to verify webhook requests
TURSO_DATABASE_URL=                  # Turso database URL (or replace with your DB)
TURSO_AUTH_TOKEN=                    # Turso auth token
```

### Dependencies

Required: `@libsql/client` (Turso/libSQL). Alternatives: `@vercel/postgres`, `@planetscale/database`, or any SQL client. Schema is simple two-column join table — adapt `cache-tags-db.ts` to your preferred database.

Do not swallow mapping or revalidation errors: a failed operation must produce a non-success webhook response. Preserve host deployment invalidation; if an external cache survives deploys, invalidate it through the deployment workflow.
