# Content Link Concepts

This reference covers DatoCMS Content Link — click-to-edit overlays that connect website elements to DatoCMS fields.


## Contents

- [What Content Link Is](#what-content-link-is)
- [How It Works](#how-it-works)
- [Two Modes](#two-modes)
- [Query Function Changes](#query-function-changes)
- [`baseEditingUrl`](#baseeditingurl)
- [`createController()` API](#createcontroller-api)
- [Data Attributes Reference](#data-attributes-reference)
- [Group and Boundary Resolution Algorithm](#group-and-boundary-resolution-algorithm)
- [Structured Text Fields](#structured-text-fields)
- [Stega Stripping Utilities](#stega-stripping-utilities)
- [Web Previews Visual Tab Integration](#web-previews-visual-tab-integration)
- [Troubleshooting](#troubleshooting)
- [Environment Variables](#environment-variables)

---

## What Content Link Is

Content Link enables visual editing by adding click-to-edit overlays to your frontend. When an editor views the draft site, they can click any text element to jump directly to the corresponding field in DatoCMS.

---

## How It Works

The DatoCMS Content Delivery API (CDA) can embed invisible Unicode metadata into text field values when queried with `contentLink: 'v1'`. This metadata is stega-encoded — it uses invisible Unicode characters that don't affect visual rendering but encode information about which DatoCMS field produced each piece of text.

The `@datocms/content-link` client-side library detects this stega-encoded metadata in DOM text nodes and renders interactive overlays. When clicked, these overlays navigate to the corresponding field in DatoCMS.

---

## Two Modes

Content Link works in two modes:

1. **Standalone** — When the draft site is viewed directly in the browser, clicking an overlay opens the DatoCMS field in a new tab.

2. **Within Web Previews Visual tab** — When the draft site is loaded inside the DatoCMS "Web Previews" plugin's Visual editing tab, clicking an overlay opens the field in a side panel within DatoCMS. This uses Penpal for bidirectional communication between the iframe and the DatoCMS editor.

---

## Query Function Changes

To enable Content Link, add these options to your query function when `includeDrafts` is true:

- **`contentLink: 'v1'`** — Tells the CDA to embed stega-encoded metadata in text fields
- **`baseEditingUrl`** — The DatoCMS editor URL, used to construct links to specific fields

```ts
const result = await executeQuery(query, {
  // ... other options
  contentLink: options?.includeDrafts ? 'v1' : undefined,
  baseEditingUrl: options?.includeDrafts ? BASE_EDITING_URL : undefined,
});
```

**Important:** Only enable `contentLink` for draft content. The stega encoding adds invisible Unicode characters to text that would be inappropriate in production — they can interfere with string matching, SEO, and text processing.

---

## `baseEditingUrl`

The `baseEditingUrl` is the URL of your DatoCMS project's editor. It can be found in:

**DatoCMS → Settings → Environment settings**

The format is:

```
https://{project-slug}.admin.datocms.com/environments/{environment-name}
```

For example:

```
https://my-project.admin.datocms.com/environments/main
```

Store this as an environment variable (e.g., `DATOCMS_BASE_EDITING_URL`).

---

## `createController()` API

The `createController` function is the main entry point for initializing Content Link on the client side. It sets up DOM scanning, mutation observation, and click-to-edit overlays.

### Import

```ts
import { createController } from '@datocms/content-link';
```

### Options

```ts
const controller = createController({
  // Optional: limit scanning/observation to this root instead of the whole document.
  // Can be a ShadowRoot or a specific container element.
  root: document.getElementById('preview-container'),

  // Optional: strip stega-encoded invisible characters from text content (default: false)
  stripStega: false,

  // Optional: callback invoked when the Web Previews plugin requests navigation
  onNavigateTo: (path) => {
    router.push(path);
  },
});
```

- **`root?: ParentNode`** — Limit scanning to a specific container (default: `document`)
- **`stripStega?: boolean`** — Whether to strip stega-encoded invisible characters from text content after stamping (default: `false`). See the Stega Stripping section below for details.
- **`onNavigateTo?: (path: string) => void`** — Callback invoked when the Web Previews plugin requests navigation to a different URL. Required for client-side routing support within the Visual tab.

### Controller Methods

- **`enableClickToEdit(flashAll?)`** — Turn click-to-edit overlays on. Optionally pass `{ scrollToNearestTarget: true }` to briefly highlight all editable elements and scroll to the nearest one if none are visible.
- **`disableClickToEdit()`** — Turn click-to-edit overlays off (DOM stamping continues in the background).
- **`isClickToEditEnabled()`** — Returns `true` if click-to-edit is currently enabled.
- **`flashAll(scrollToNearestTarget?)`** — Briefly highlight all editable elements with an animated effect. Pass `true` to scroll to the nearest editable element if none are visible.
- **`setCurrentPath(path)`** — Notify the Web Previews plugin of the current URL. Use this when the route changes in a client-side-routed app.
- **`dispose()`** — Permanently disconnects observers and cleans up. After disposal, the controller cannot be re-enabled; create a new one if needed.
- **`isDisposed()`** — Returns `true` if the controller has been disposed.

### Keyboard Shortcut

Holding down the **Alt/Option** key temporarily toggles click-to-edit mode. This works regardless of whether `enableClickToEdit()` has been called — it toggles the current state and reverts when the key is released.

### SSR Safety

`createController()` is safe to call on the server (Node.js, Deno, etc.) — it returns an inert no-op controller that does nothing. You do not need to guard the call with `typeof window !== 'undefined'` checks, but you should still only render the ContentLink component in draft mode.

### DOM Stamping Note

DOM stamping (detecting and marking editable elements) runs automatically when the controller is created and continues via MutationObserver until `dispose()` is called. Click-to-edit overlays are independent and must be explicitly enabled with `enableClickToEdit()`.

---

## Data Attributes Reference

Content Link uses several `data-datocms-*` attributes. Some are **developer-specified** (you add them to your markup), and some are **library-managed** (added automatically during DOM stamping).

### Developer-Specified Attributes

#### `data-datocms-content-link-url`

Manually marks an element as editable with an explicit edit URL. Use this for **non-text fields** (numbers, booleans, dates, JSON) that cannot contain stega encoding. The recommended approach is to query the `_editingUrl` meta field:

```graphql
query {
  product {
    id
    name
    price
    isActive
    _editingUrl
  }
}
```

```tsx
<span data-datocms-content-link-url={product._editingUrl}>
  ${product.price}
</span>

<span data-datocms-content-link-url={product._editingUrl}>
  {product.isActive ? 'Active' : 'Inactive'}
</span>
```

The `_editingUrl` field is available on all records and returns the full URL to edit that record in DatoCMS.

#### `data-datocms-content-link-source`

Attaches stega-encoded metadata without rendering it as visible content. Use this for **structural elements that cannot contain text** (like `<video>`, `<audio>`, `<iframe>`) or when stega encoding in visible text would be problematic:

```tsx
<div data-datocms-content-link-source={video.alt}>
  <video src={video.url} poster={video.posterImage.url} controls />
</div>
```

The value must be a stega-encoded string (any text field from the API will work). The library decodes the stega metadata from the attribute value and makes the element clickable.

#### `data-datocms-content-link-group`

Expands the clickable area to a parent element. By default, the library makes the immediate parent of the text node clickable. Adding this attribute to an ancestor makes that ancestor the clickable target instead:

```html
<article data-datocms-content-link-group>
  <h2>Title with stega</h2>
  <p>Description with no stega</p>
</article>
```

Here, clicking anywhere in the `<article>` opens the editor, rather than requiring users to click precisely on the `<h2>`.

**Important:** A group should contain only one stega-encoded source. If multiple stega strings resolve to the same group, the library logs a collision warning and only the last URL wins.

#### `data-datocms-content-link-boundary`

Stops the upward DOM traversal that looks for a `data-datocms-content-link-group`, making the element where stega was found the clickable target instead. This creates an independent editable region that won't merge into a parent group:

```html
<div data-datocms-content-link-group>
  <h1>Title with stega (URL A)</h1>
  <section data-datocms-content-link-boundary>
    <span>Text with stega (URL B)</span>
  </section>
</div>
```

Without the boundary, clicking "Text with stega" would open URL A (the outer group). With the boundary, the `<span>` becomes the clickable target opening URL B.

The boundary can also be placed directly on the element containing the stega text:

```html
<div data-datocms-content-link-group>
  <h1>Title with stega (URL A)</h1>
  <span data-datocms-content-link-boundary>Text with stega (URL B)</span>
</div>
```

### Library-Managed Attributes

These are added automatically by the library during DOM stamping. You do not add them yourself, but you can target them in CSS.

#### `data-datocms-contains-stega`

Added to elements whose text content contains stega-encoded invisible characters. Only present when `stripStega` is `false` (the default). Useful for CSS workarounds — the zero-width characters can sometimes cause unexpected letter-spacing:

```css
[data-datocms-contains-stega] {
  letter-spacing: 0 !important;
}
```

#### `data-datocms-auto-content-link-url`

Added automatically to elements that the library has identified as editable targets (through stega decoding and group/boundary resolution). Contains the resolved edit URL. This is the automatic counterpart to the developer-specified `data-datocms-content-link-url`.

---

## Group and Boundary Resolution Algorithm

When the library encounters stega-encoded content inside an element, it walks up the DOM tree from that element:

1. If it finds a `data-datocms-content-link-group`, it stops and stamps **that group element** as the clickable target.
2. If it finds a `data-datocms-content-link-boundary`, it stops and stamps the **starting element** as the clickable target — further traversal is prevented.
3. If it reaches the root without finding either, it stamps the **starting element**.

### Example 1: Nested groups

```html
<div data-datocms-content-link-group>
  <h1>Title with stega (URL A)</h1>
  <div data-datocms-content-link-group>
    <p>Paragraph with stega (URL B)</p>
  </div>
</div>
```

- "Title with stega": walks up from `<h1>`, finds the outer group → **outer `<div>`** becomes clickable (opens URL A).
- "Paragraph with stega": walks up from `<p>`, finds the inner group first → **inner `<div>`** becomes clickable (opens URL B). The outer group is never reached.

### Example 2: Boundary preventing group propagation

```html
<div data-datocms-content-link-group>
  <h1>Title with stega (URL A)</h1>
  <section data-datocms-content-link-boundary>
    <span>Text with stega (URL B)</span>
  </section>
</div>
```

- "Title with stega": walks up from `<h1>`, finds the outer group → **outer `<div>`** becomes clickable (opens URL A).
- "Text with stega": walks up from `<span>`, hits the `<section>` boundary → traversal stops, **`<span>`** becomes clickable (opens URL B).

### Example 3: Boundary inside a group

```html
<div data-datocms-content-link-group>
  <p>Main content with stega (URL A)</p>
  <div data-datocms-content-link-boundary>
    <p>Isolated content with stega (URL B)</p>
  </div>
</div>
```

- "Main content with stega": walks up from `<p>`, finds the outer group → **outer `<div>`** becomes clickable (opens URL A).
- "Isolated content with stega": walks up from inner `<p>`, hits the boundary → traversal stops, **inner `<p>`** becomes clickable (opens URL B).

### Example 4: Multiple stega strings without separation (collision warning)

```html
<p>
  Text with stega (URL A)
  More text with stega (URL B)
</p>
```

Both stega-encoded strings resolve to the same `<p>`. The library logs a console warning and the last URL wins. Fix by wrapping each piece in its own element:

```html
<p>
  <span>Text with stega (URL A)</span>
  <span>More text with stega (URL B)</span>
</p>
```

---

## Structured Text Fields

Structured Text fields require special attention because of how stega encoding works within them. The DatoCMS API encodes stega information inside a single `<span>` within the structured text output — without any configuration, only that small span would be clickable. Additionally, Structured Text fields can contain **embedded blocks** and **inline records**, each with their own editing URL that should open a different record in the editor.

### Rule 1: Always wrap the Structured Text component in a group

This makes the entire structured text area clickable, instead of just the tiny stega-encoded span:

```tsx
<div data-datocms-content-link-group>
  <StructuredText data={page.content} />
</div>
```

### Rule 2: Wrap embedded blocks and inline records in a boundary

Embedded blocks and inline records have their own edit URL (pointing to the block/record). Without a boundary, clicking them would bubble up to the parent group and open the structured text field editor instead. Add `data-datocms-content-link-boundary` to prevent them from merging into the parent group:

```tsx
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
      <a {...transformedMeta} href={`/posts/${record.slug}`}>
        {children}
      </a>
    )}
  />
</div>
```

### Why `renderLinkToRecord` does NOT need a boundary

Record links are standard anchors wrapping text that belongs to the structured text field. The text inside them carries the structured text field's stega encoding, so clicking the link text opens the structured text field editor — which is the correct behavior. Only blocks and inline records have their own separate editing URL.

### Result

With this setup:
- Clicking main text (paragraphs, headings, lists) → opens the **structured text field editor**
- Clicking an embedded block → opens **that block's editor**
- Clicking an inline record → opens **that inline record's editor**
- Clicking a record link → opens the **structured text field editor** (correct, since the link text is part of the field)

---

## Stega Stripping Utilities

The `@datocms/content-link` package exports three utility functions for working with stega-encoded strings: one to clean (`stripStega`), one to inspect (`decodeStega`), and one to debug (`revealStega`).

Stega leakage into application logic is the single most common source of visual-editing bugs, and the worst part is that it's invisible — the encoding uses zero-width Unicode characters, so `console.log` and visual inspection both lie. These utilities exist because you cannot debug this with the naked eye.

### Import

```ts
import { stripStega, decodeStega, revealStega } from '@datocms/content-link';
```

### `stripStega(input)`

Removes all stega-encoded invisible characters from the input. Works on strings, objects, arrays, and nested structures. Internally converts to JSON, removes stega via regex, and parses back:

```ts
// Strings
const clean = stripStega("Hello with invisible stega chars");

// Objects
const cleanObj = stripStega({ name: "John with stega", age: 30 });

// Nested structures — removes ALL stega encodings recursively
const cleanData = stripStega({
  users: [
    { name: "Alice with stega", email: "alice@example.com with stega" },
  ]
});

// Arrays
const cleanArr = stripStega(["First with stega", "Second with stega"]);
```

### `decodeStega(input)`

Extracts editing metadata from a single stega-encoded string. Returns `{ origin: string, href: string }` if stega is found, `null` otherwise:

```ts
const info = decodeStega(someTextField);
// Returns: { origin: 'datocms', href: 'https://my-project.admin.datocms.com/...' } or null
```

### `revealStega(input)` — debugging

Works on any data type (strings, objects, arrays, full GraphQL responses) and preserves the input shape: strings stay strings, objects/arrays keep their structure — only the encoding inside text values is rewritten from invisible Unicode into a **visible** `[STEGA:/editor/item_types/…]` marker. This is the tool to reach for whenever something stega-related is mysteriously broken: `console.log` shows nothing (the characters are zero-width Unicode), but `revealStega` makes them inspectable.

```ts
// String in, string out — markers now visible
console.log(revealStega(page.title));
// "Hello World[STEGA:/editor/item_types/123/items/456]"

// Object in, object with the same shape out
console.log(revealStega(graphqlResponse));
// {
//   blog: {
//     title: "Hello World[STEGA:/editor/item_types/123/items/456]",
//     author: { name: "Alice[STEGA:/editor/item_types/789/items/012]" }
//   }
// }
```

Use it to answer questions like *"is this field stega-encoded?"*, *"which fields in this response carry editing metadata?"*, and *"why is my equality check silently failing?"*.

### When to Strip Stega

The general rule: stega-encoded values are safe to render directly into text/HTML output (the invisible characters survive intact and power the click-to-edit overlay), but they are **not safe to use in any other code path**. If a value crosses out of "render this as final content" into *any* other use, wrap it in `stripStega()`.

The non-render uses to watch for:

- **String comparisons** — `record.slug === 'about'`, `value.includes('foo')`, `switch (status)`. The invisible characters are part of the string, so equality silently fails.
- **`split` / `replace` / regex** — manipulating the string at all
- **JSON serialization sent to external systems** — analytics events, third-party APIs, webhooks, structured logs. The invisible bytes survive serialization and contaminate downstream systems.
- **SEO metadata, `<meta>` tags, `<title>`, Open Graph, JSON-LD** — search engines and social previews see the raw bytes
- **URL or slug generation** — building hrefs from text values
- **Analytics / tracking** — event names and properties should be clean
- **`length` / `textContent` length checks** — stega characters inflate the length
- **Anything passed to a database, cache key, or persisted store**

```tsx
// Render: safe as-is — stega survives, click-to-edit works
<h1>{page.title}</h1>

// Comparison: must strip — equality fails silently otherwise
const isHomepage = stripStega(page.slug) === 'home';

// SEO: must strip — invisible bytes leak into <meta>
<meta name="description" content={stripStega(page.seoDescription)} />

// Analytics: must strip — third party would receive invisible chars
analytics.track('viewed_post', { title: stripStega(post.title) });
```

#### Field-type exception: DatoCMS `slug` fields are already clean

The CDA never embeds stega into values from fields whose **DatoCMS field type is `slug`** (the dedicated slug field type, not a regular `string` or `text` field). When a slug field is the source, no `stripStega` is needed — it's a no-op at best and noisy code at worst. Only `string`, `text`, and other text-like fields can carry stega.

This matters when the value's source field type is known. For values whose origin is unclear (a string variable several function-calls deep, props of unknown provenance, anything reflected through generic helpers), default to wrapping in `stripStega()` — it's a cheap idempotent operation and the cost of a missed wrap is silent breakage.

#### Debugging suspected leaks

When something string-related behaves strangely on draft content but works on published content, suspect stega. The diagnostic loop:

1. `console.log(revealStega(value))` to see whether stega is present and where (works on strings, objects, full responses — shape is preserved, encoding becomes visible as `[STEGA:...]` markers)
2. If yes, trace where the value enters non-render logic and add `stripStega()` at that boundary
3. Consider whether the field source is a DatoCMS `slug` field — if so, the leak is upstream (somebody else's text field is bleeding in) rather than at this site

### CSS Alternative (Layout Fix Only)

If your only problem is layout issues from stega characters (e.g., unexpected letter-spacing), you can use CSS instead of stripping:

```css
[data-datocms-contains-stega] {
  letter-spacing: 0 !important;
}
```

This fixes visual rendering without removing the stega encoding, so click-to-edit overlays continue to work.

### Controller `stripStega` Option vs `stripStega()` Utility

These are different mechanisms:

- **`stripStega()` utility function** — Returns a clean copy of the input. Does not modify the original data or the DOM. Use this for one-off cleaning (SEO tags, comparisons, analytics).
- **`createController({ stripStega: true })`** — Permanently mutates DOM text nodes to remove stega encoding after stamping. All `textContent` in the page becomes clean, but a new controller on the same page won't detect elements (the encoding is lost). Use `false` (the default) if you need to dispose and recreate controllers without a page reload.

---

## Web Previews Visual Tab Integration

When your frontend runs inside the Visual Editing tab of the Web Previews plugin, Content Link automatically establishes bidirectional communication with the plugin via Penpal. No explicit configuration is needed for this — the library detects the iframe context automatically. The connection attempt has a 20-second timeout; if it fails (e.g., the page is not in an iframe), the library silently falls back to standalone mode.

### Behavior Differences in Visual Tab

- **Clicks open fields in the side panel** instead of a new browser tab
- **Bidirectional routing** is supported: the plugin can request navigation (via `onNavigateTo`), and the website can notify the plugin of route changes (via `setCurrentPath`)

### Client-Side Routing Support

If your site uses client-side routing (Next.js, Nuxt, SvelteKit, etc.), set up bidirectional routing so the plugin and website stay in sync:

1. **Plugin → Website** — Pass `onNavigateTo` to `createController()`. The plugin calls this when the editor navigates to a different record.
2. **Website → Plugin** — Call `controller.setCurrentPath(path)` when the route changes. The plugin updates its internal state to match.

See the framework-specific reference files for complete routing examples.

### CSP Requirement

For the Visual tab to load your frontend in an iframe, your site must allow being embedded by the DatoCMS plugin origin. Add this Content-Security-Policy header:

```
Content-Security-Policy: frame-ancestors 'self' https://plugins-cdn.datocms.com
```

Framework-specific CSP setup is covered in each framework reference file.

### Draft Mode URL Plugin Setting

In the Web Previews plugin configuration, the **"Draft mode URL"** setting specifies the URL that auto-enables draft mode when the Visual tab loads. This is typically your enable endpoint (e.g., `https://your-site.com/api/draft-mode/enable?token=YOUR_SECRET`). Without this setting, the Visual tab will load your site without draft mode, and Content Link won't have stega-encoded data to work with.

### Graceful Fallback

If the site is not running inside the Web Previews plugin iframe (i.e., opened directly in a browser), Content Link gracefully falls back to opening edit URLs in a new tab. No code changes are needed for this — it's automatic.

---

## Troubleshooting

- **No overlays appear**: Ensure your query function includes both `contentLink: 'v1'` and `baseEditingUrl` when `includeDrafts` is true. Also verify that `enableClickToEdit()` has been called on the controller.

- **Layout issues from stega encoding**: The invisible zero-width characters can cause unexpected letter-spacing or text overflow. Fix with CSS: `[data-datocms-contains-stega] { letter-spacing: 0 !important; }`. Alternatively, use `createController({ stripStega: true })` to permanently remove the encoding from the DOM.

- **Strings broken by invisible characters**: Use `stripStega()` before string comparisons, search operations, SEO metadata, analytics, or any programmatic text processing. Import it from `@datocms/content-link`. See "When to Strip Stega" above for the full list of non-render uses.

- **Equality check silently fails on draft / works on published**: Classic stega leak. A line like `if (page.slug === 'home')` evaluates to `false` in draft mode because `page.slug` carries invisible stega characters. Confirm with `console.log(revealStega(page))` — if the value shows `[STEGA:...]` markers, wrap the comparison in `stripStega()`. (Note: this should not happen for actual DatoCMS `slug` field types — those never get stega. If a slug-typed field shows stega, file a bug.)

- **`console.log` shows the value looks normal but the code disagrees**: stega characters are zero-width Unicode. `console.log` and the browser dev tools render them invisibly, so the value *looks* identical to the literal you're comparing against while actually being different. Use `revealStega(value)` to reveal the encoding, or check `value.length` against the literal's length.

- **Invisible characters reaching analytics, third-party APIs, or persisted stores**: any value going outside the render path (analytics event properties, webhook payloads, cache keys, database writes, `<meta>` content) must be stripped first. Treat the boundary at the point the value leaves the render layer.

- **Wrong element highlighted (too small click target)**: Use `data-datocms-content-link-group` on a parent element to expand the clickable area. This is especially important for Structured Text fields where the stega span is tiny.

- **Structured text clicks open wrong editor**: Embedded blocks and inline records need `data-datocms-content-link-boundary` to prevent their clicks from bubbling up to the parent group. See the Structured Text Fields section above.

- **Controller recreation fails after disposal**: Only works when `stripStega` is `false` (the default). If you used `stripStega: true`, the stega encoding was permanently removed. Reload the page or re-fetch content to restore it.

- **Multiple stega strings on same element (collision warning)**: When two stega-encoded strings resolve to the same clickable target, the last URL wins. Fix by wrapping each piece of content in its own element, or use `data-datocms-content-link-group` / `data-datocms-content-link-boundary` to separate them.

- **Web Previews Visual tab not connecting**: The plugin connection only works when your site is loaded inside the Web Previews plugin iframe. Outside the plugin, edit URLs open in a new tab as a graceful fallback. Ensure your CSP header allows `frame-ancestors 'self' https://plugins-cdn.datocms.com`.

- **Visual tab loads but no stega data**: Check that the Web Previews plugin's "Draft mode URL" setting is configured. Without it, the Visual tab loads your site without draft mode enabled, so the CDA returns text without stega encoding.

- **Non-text field not clickable**: Non-text fields (numbers, booleans, dates, JSON) cannot contain stega encoding. Use `data-datocms-content-link-url` with the record's `_editingUrl` field from the GraphQL API.

---

## Environment Variables

| Variable | Description | Where to find it |
|---|---|---|
| Base Editing URL | DatoCMS editor URL for Content Link | DatoCMS → Settings → Environment settings |

Framework-specific variable names are in each framework reference file.
