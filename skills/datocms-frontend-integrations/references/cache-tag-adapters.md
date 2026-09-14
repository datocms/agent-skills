# Cache Tag Adapters

Use this reference for manual CDN response-tag collection and purge adapters. Next.js query-ID mappings and native cache providers use their framework reference instead.

For the webhook payload and provider header formats, see [CDA cache tags](../../datocms-cda/references/draft-caching-environments.md#cache-tags).

## Response dependencies

CDA tags arrive space-separated; serialize them for the selected CDN rather than forwarding the raw header unchanged. Treat each tag as opaque. DatoCMS can coarsen dependency tags when response limits are reached: keep every returned tag instead of trimming the list yourself. A page's union of query tags must also fit the hosting provider's response limits; if it does not, use an existing indirection strategy or leave that response uncached.

Use one collector per response, shared by every query contributing to that response. Serialize once after all queries finish, including layout/component queries; never keep the collector in module-global state. Tags alone do not make a response cacheable: retain the host's existing published-content cache policy. Draft requests must bypass shared caching before a cache lookup and must not emit purge tags.

## Helpers

**File:** `lib/datocms/cache-tags.ts` (adapt the application path)

```ts
export type CacheProvider = 'netlify' | 'cloudflare' | 'fastly' | 'bunny';

export function createPageCacheTags() {
  const tags = new Set<string>();
  let draft = false;
  return {
    add(raw: string | null, includeDrafts = false) {
      draft ||= includeDrafts;
      if (draft) { tags.clear(); return; }
      for (const tag of (raw ?? '').split(/\s+/).filter(Boolean)) tags.add(tag);
    },
    headers(provider: CacheProvider): Record<string, string> {
      if (draft) return { 'Cache-Control': 'private, no-store' };
      if (!tags.size) return {};
      if (provider === 'bunny') throw new Error('Configure Bunny tag serialization before enabling caching');
      const names: Record<CacheProvider, string> = {
        netlify: 'Netlify-Cache-Tag', cloudflare: 'Cache-Tag',
        fastly: 'Surrogate-Key', bunny: 'CDN-Tag',
      };
      return { [names[provider]]: [...tags].join(provider === 'fastly' ? ' ' : ',') };
    },
  };
}

export async function purgeInBatches(
  tags: string[],
  batchSize: number,
  sendBatch: (tags: string[]) => Promise<Response>,
  pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new Error('Invalid purge batch size');
  const unique = [...new Set(tags.filter(Boolean))];
  for (let offset = 0; offset < unique.length; offset += batchSize) {
    const batch = unique.slice(offset, offset + batchSize);
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await sendBatch(batch);
      } catch (error) {
        if (attempt === 2) throw error;
        await pause(250 * 2 ** attempt);
        continue;
      }
      if (response.ok) break;
      if (attempt === 2 || (response.status !== 429 && response.status < 500)) {
        throw new Error(`Purge failed (${response.status})`);
      }
      const retryAfter = response.headers.get('retry-after');
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const delay = Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : Math.max(0, Date.parse(retryAfter ?? '') - Date.now());
      // Defer to webhook redelivery rather than sleeping indefinitely or retrying early.
      if (Number.isFinite(delay) && delay > 5000) throw new Error('Purge rate limited; retry later');
      await pause(Number.isFinite(delay) ? delay : 250 * 2 ** attempt);
    }
  }
}
```

## Purge adapter contract

The Bunny serializer remains an explicit adapter placeholder until its format is verified for the selected integration. The application supplies `purgeBatch(tags): Promise<Response>` and `purgeBatchSize` from its selected provider adapter. Use that API's current batch/rate limits, including singleton batches where required. The adapter must check any provider-specific error body even on HTTP 2xx and reject a failed operation. An unconfigured adapter must throw, not silently succeed; report the integration as `scaffolded` until a concrete adapter is in place. Partial purge success is not completion: return an error so failed invalidation can be retried. The helper makes at most three attempts per batch.

## Deployments

Content-change webhooks do not cover application deployments. Where the CDN cache survives deploys, add deployment invalidation through the existing deployment workflow. Preserve automatic deploy invalidation when the host already provides it; do not opt out inadvertently.
