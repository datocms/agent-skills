# Web Previews Concepts

This reference covers the DatoCMS Web Previews plugin and how to integrate it with your frontend.

## Contents

- [What the Web Previews Plugin Is](#what-the-web-previews-plugin-is)
- [Plugin Configuration](#plugin-configuration)
- [Preview-Links Endpoint Contract](#preview-links-endpoint-contract)
- [CORS Requirements](#cors-requirements)
- [`recordToWebsiteRoute` Pattern](#recordtowebsiteroute-pattern)
- [`reloadPreviewOnRecordUpdate`](#reloadpreviewonrecordupdate)
- [Visual Editing Tab and Content Link](#visual-editing-tab-and-content-link)
- [CSP Requirements](#csp-requirements)
- [Plugin Installation Steps](#plugin-installation-steps)
- [Dependencies](#dependencies)

---

## What the Web Previews Plugin Is

The [Web Previews](https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews) plugin adds three features to the DatoCMS editing interface:

1. **Sidebar preview links** — Clickable links in the record sidebar that open draft/published versions of the record on your frontend
2. **Sidebar iframe preview** — An inline iframe in the sidebar showing a live preview of the record
3. **Visual editing tab** — A full-screen tab that loads your frontend in an iframe, enabling visual editing with Content Link overlays

All three features rely on a **preview-links endpoint** on your frontend that tells the plugin which URLs correspond to a given record.

---

## Plugin Configuration

When configuring the Web Previews plugin in DatoCMS, you set up one or more "frontends". Each frontend has:

- **Preview webhook URL** — The URL of your preview-links endpoint (e.g., `https://your-site.com/api/preview-links?token=YOUR_SECRET`)
- **Draft mode URL** — URL used to auto-enable draft mode when the Visual editing tab loads (typically your enable endpoint, e.g., `https://your-site.com/api/draft-mode/enable?token=YOUR_SECRET`). **This is required for Visual editing with Content Link** — without it, the Visual tab loads your site without draft mode, so the CDA returns text without stega encoding and Content Link overlays won't appear.
- **Initial path** — Optional default path to load when the Visual editing tab opens (defaults to `/`). Useful if your homepage is not at `/` or if you want editors to land on a specific page.
- **Custom headers** — Optional HTTP headers sent with each request to the preview-links endpoint
- **Viewport presets** — Optional viewport sizes for the iframe preview (sidebar and Visual tab)
- **Iframe `allow` attribute** — Optional permissions for the preview iframe (e.g., microphone, camera access). Configurable in the plugin's "Iframe Security Settings" section. See [MDN iframe allow](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#allow) for valid values.

---

## Preview-Links Endpoint Contract

The preview-links endpoint receives POST requests from the DatoCMS editor and returns URLs for previewing the record.

### Request Body

```ts
type WebPreviewsRequestBody = {
  item: RawApiTypes.Item;        // The record (raw JSON:API format)
  itemType: ApiTypes.ItemType;   // The model (includes id and attributes.api_key)
  currentUser: object;           // The logged-in DatoCMS user
  siteId: string;                // The DatoCMS project ID
  environmentId: string;         // The environment ID
  locale: string;                // The current locale in the editor
};
```

### Response Format

```ts
type PreviewLink = {
  label: string;
  url: string;
  reloadPreviewOnRecordUpdate?: boolean | { delayInMs: number };
};

type WebPreviewsResponse = {
  previewLinks: PreviewLink[];
};
```

### Status Branching Logic

The endpoint branches on `item.meta.status` to determine which preview links to return:

- **`status !== 'published'`** — The record has a draft version. Generate a URL that first enables draft mode, then redirects to the content page.
- **`status !== 'draft'`** — The record has a published version. Generate a URL that first disables draft mode, then redirects to the content page.
- A record can have both states simultaneously (when it has been published but also has unpublished changes), so both links may be returned.

```ts
const response: WebPreviewsResponse = { previewLinks: [] };

if (url) {
  if (item.meta.status !== 'published') {
    response.previewLinks.push({
      label: 'Draft version',
      url: new URL(
        `/api/draft-mode/enable?redirect=${url}&token=${token}`,
        requestUrl,
      ).toString(),
    });
  }

  if (item.meta.status !== 'draft') {
    response.previewLinks.push({
      label: 'Published version',
      url: new URL(
        `/api/draft-mode/disable?redirect=${url}`,
        requestUrl,
      ).toString(),
    });
  }
}
```

**Note:** Nuxt uses `url` as the redirect parameter name instead of `redirect`. Check the framework-specific reference for the exact parameter names.

### Endpoint Error Behavior

- If the endpoint returns a **non-200 status**, the plugin logs "returned a {status} status" and shows no preview links for that frontend.
- If the response body is **not valid JSON** or doesn't match the expected structure, the plugin logs "returned an invalid payload".
- If the endpoint returns `{ previewLinks: [] }` (empty array), no links are shown for the current record — this is normal for records that don't have a frontend URL (e.g., settings singletons or reusable blocks).
- Always return a 200 with an empty `previewLinks` array for unmatched records rather than an error status.

---

## CORS Requirements

The preview-links endpoint receives POST requests from the DatoCMS editor, which runs on a different origin. It needs CORS headers:

```ts
function withCORS(responseInit?: ResponseInit): ResponseInit {
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
```

The endpoint must also handle `OPTIONS` preflight requests:

```ts
export async function OPTIONS() {
  return new Response('OK', withCORS());
}
```

**Nuxt exception:** Nuxt handles CORS via `routeRules` in `nuxt.config.ts` instead of manual headers:

```ts
routeRules: {
  '/api/**': { cors: true },
}
```

---

## `recordToWebsiteRoute` Pattern

This function maps a DatoCMS record to its frontend URL. It is used by the preview-links endpoint.

The pattern varies by framework:

- **Next.js** — Switches on `item.__itemTypeId` (the deserialized item's model ID). Uses `deserializeRawItem` from `@datocms/rest-client-utils` to convert the raw item.
- **Nuxt, SvelteKit** — Switches on `itemTypeId` parameter (from `itemType.id` in the request body)
- **Astro** — Switches on `itemType.attributes.api_key` (the model's API key string, e.g., `'blog_post'`)

Skeleton:

```ts
function recordToWebsiteRoute(item, itemTypeIdentifier, locale) {
  switch (itemTypeIdentifier) {
    case 'YOUR_MODEL_ID_OR_API_KEY': {
      return `/your-path/${item.attributes.slug}`;
    }
    // Add more cases for each content model
    default:
      return null;
  }
}
```

The user must fill in their own models. Provide TODO comments showing examples.

---

## `reloadPreviewOnRecordUpdate`

Each preview link can specify `reloadPreviewOnRecordUpdate` to control iframe refresh behavior when an editor saves a record:

- `true` — Reloads the iframe preview after a 100ms delay
- `{ delayInMs: N }` — Reloads after a custom delay in milliseconds

The reload is triggered when the record's version changes (i.e., on save). A delay is useful for frameworks that need time to rebuild/revalidate before the preview reflects changes (e.g., Next.js ISR revalidation).

**Note:** Due to cross-origin iframe restrictions, scroll position cannot be maintained between reloads — the page reloads from the top.

---

## Visual Editing Tab and Content Link

The Visual editing tab loads your frontend in a full-screen iframe within DatoCMS. When combined with Content Link, this creates a visual editing experience where editors can click any element to open the corresponding field in a side panel.

### How It Works

1. The plugin loads your frontend URL in an iframe (using the "Draft mode URL" setting to auto-enable draft mode)
2. The `@datocms/content-link` library in your frontend detects the iframe context and establishes a Penpal connection with the plugin — **this is automatic, no configuration needed**
3. When an editor clicks an element with a Content Link overlay, the click is communicated to the plugin which opens the field in a side panel (instead of a new tab)
4. **Bidirectional routing** keeps the plugin and website in sync:
   - Plugin → Website: When the editor navigates to a different record, the plugin calls `onNavigateTo` (passed to `createController()`)
   - Website → Plugin: When client-side navigation occurs, call `controller.setCurrentPath(path)` to notify the plugin

### Graceful Fallback

If the frontend is not running inside the plugin iframe (e.g., opened directly in a browser), Content Link falls back to opening edit URLs in new browser tabs. No code changes needed.

See `content-link-concepts.md` for full Content Link documentation including the `createController()` API, data attributes, structured text patterns, and troubleshooting.

---

## CSP Requirements

For the iframe preview and Visual editing tab to work, your frontend must allow being embedded by the DatoCMS plugin iframe. Add this Content-Security-Policy header:

```
frame-ancestors 'self' https://plugins-cdn.datocms.com
```

---

## Plugin Installation Steps

1. Go to DatoCMS → Settings → Plugins → Add new
2. Search for "Web Previews" in the marketplace
3. Install the plugin
4. Configure a frontend:
   - Set the preview webhook URL to your preview-links endpoint (e.g., `https://your-site.com/api/preview-links?token=YOUR_SECRET_API_TOKEN`)
   - If using Visual editing: set the "Draft mode URL" to your enable endpoint (e.g., `https://your-site.com/api/draft-mode/enable?token=YOUR_SECRET_API_TOKEN`)
   - Optionally set an initial path, viewport presets, and iframe allow attributes

---

## Dependencies

The preview-links endpoint requires these packages:

- `@datocms/cma-client` — For `RawApiTypes.Item` and `ApiTypes.ItemType` types, and `ApiError` for error handling
- `@datocms/rest-client-utils` — **Next.js only**, for `deserializeRawItem` to convert the raw JSON:API item before passing to `recordToWebsiteRoute`
