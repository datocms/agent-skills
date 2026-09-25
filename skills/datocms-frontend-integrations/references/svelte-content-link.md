# Svelte Content Link — `<ContentLink />` for Visual Editing

Svelte-specific wiring for `@datocms/svelte` Content Link in Svelte and SvelteKit projects.

## Contents

- Shared Concepts
- Setup
- SvelteKit Integration
- Enabling Click-to-Edit
- `<ContentLink />` Props
- Data Attributes and Target Resolution
- Structured Text Integration
- Low-Level Utilities
- Troubleshooting

## Shared Concepts

Read [content-link-concepts.md](./content-link-concepts.md) first for the shared model:

- stega encoding and draft-only query changes
- `baseEditingUrl` semantics
- shared data attributes, grouping rules, low-level controller utilities, and common troubleshooting

Use this file for Svelte-only component API, router wiring, and Structured Text integration details.

## Setup

First, make sure your shared query layer already enables Content Link for draft requests. See [Query Function Changes](./content-link-concepts.md#query-function-changes).

Then mount the Svelte component in a root layout (it renders no visible UI):

```svelte
<script>
  import { ContentLink } from '@datocms/svelte';
</script>

<ContentLink />

<!-- Your content here -->
```

## SvelteKit Integration

For full [Web Previews plugin](https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews) integration, provide `onNavigateTo` and `currentPath` to sync preview navigation with the CMS:

```svelte
<script>
  import { ContentLink } from '@datocms/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
</script>

<ContentLink
  onNavigateTo={(path) => goto(path)}
  currentPath={page.url.pathname}
/>
```

Place this in your root `+layout.svelte`:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { ContentLink } from '@datocms/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
</script>

<ContentLink
  onNavigateTo={(path) => goto(path)}
  currentPath={page.url.pathname}
/>

<slot />
```

## Enabling Click-to-Edit

### Via Prop (Persistent)

```svelte
<ContentLink enableClickToEdit={true} />
```

With options:

```svelte
<!-- Scroll to nearest editable element if none visible -->
<ContentLink enableClickToEdit={{ scrollToNearestTarget: true }} />

<!-- Only on devices with hover capability (non-touch) -->
<ContentLink enableClickToEdit={{ hoverOnly: true }} />

<!-- Both -->
<ContentLink enableClickToEdit={{ hoverOnly: true, scrollToNearestTarget: true }} />
```

| Option | Type | Default | Description |
| - | - | - | - |
| `scrollToNearestTarget` | boolean | false | Auto-scroll to nearest editable element if none visible |
| `hoverOnly` | boolean | false | Only enable on hover-capable devices; touch users can still toggle with Alt/Option |

### Via Keyboard Shortcut (Temporary)

Hold **Alt** (Windows/Linux) or **Option** (Mac) to temporarily invert click-to-edit: enable it when off, or disable it when already on. Releasing the key restores the previous state.

## `<ContentLink />` Props

| Prop | Type | Default | Description |
| - | - | - | - |
| `onNavigateTo` | `(path: string) => void` | — | Callback when Web Previews plugin requests navigation |
| `currentPath` | string | — | Current pathname to sync with Web Previews plugin |
| `enableClickToEdit` | `boolean \| ClickToEditOptions` | — | Enable click-to-edit overlays persistently |
| `stripStega` | boolean | — | Remove stega encoding from text nodes after processing |
| `root` | `ParentNode` | — | Limit scanning to a root element instead of entire document |

## Data Attributes and Target Resolution

Use the shared [data attributes](./content-link-concepts.md#data-attributes-reference) for explicit record URLs, non-text sources, groups and boundaries, and the [resolution algorithm](./content-link-concepts.md#group-and-boundary-resolution-algorithm) to keep independent editing targets separate. The HTML attribute names are the same in every framework; use this framework's normal attribute-binding syntax.

## Structured Text Integration

**Rule 1:** Always wrap `<StructuredText>` in a group.

**Rule 2:** Add boundary on block, inline block, and inline item components — but **NOT** on item link components:

```svelte
<script>
  import { StructuredText } from '@datocms/svelte';
  import { isBlock, isInlineBlock, isInlineItem, isItemLink } from 'datocms-structured-text-utils';
  import Block from './Block.svelte';
  import InlineBlock from './InlineBlock.svelte';
  import InlineItem from './InlineItem.svelte';
  import ItemLink from './ItemLink.svelte';
</script>

<div data-datocms-content-link-group>
  <StructuredText
    data={page.content}
    components={[
      [isBlock, Block],
      [isInlineBlock, InlineBlock],
      [isInlineItem, InlineItem],
      [isItemLink, ItemLink],
    ]}
  />
</div>
```

Then, in your custom components, wrap the root element with `data-datocms-content-link-boundary`:

```svelte
<!-- Block.svelte -->
<script>
  const { block } = $props();
</script>

<div data-datocms-content-link-boundary>
  <h2>{block.title}</h2>
  <p>{block.description}</p>
</div>
```

```svelte
<!-- InlineBlock.svelte -->
<script>
  const { block } = $props();
</script>

<span data-datocms-content-link-boundary>
  <em>{block.username}</em>
</span>
```

```svelte
<!-- InlineItem.svelte -->
<script>
  const { link } = $props();
</script>

<span data-datocms-content-link-boundary>
  {link.title}
</span>
```

Item link components don't need a boundary — their content belongs to the surrounding structured text:

```svelte
<!-- ItemLink.svelte -->
<script>
  const { link } = $props();
</script>

<a href={`/posts/${link.slug}`}>
  <slot />
</a>
```

## Low-Level Utilities

```ts
import { stripStega, decodeStega } from '@datocms/svelte';
```

See the shared [utility APIs](./content-link-concepts.md#stega-stripping-utilities) and [when to strip stega](./content-link-concepts.md#when-to-strip-stega). Keep encoding for rendered editable content; clean values used in logic, metadata or URL construction. `revealStega` (debug: makes invisible metadata visible) isn't re-exported here — import it from `@datocms/content-link` (add as direct dependency).

## Troubleshooting

### Click-to-edit overlays not appearing

1. Verify `contentLink: 'v1'` and `baseEditingUrl` are set in API calls
2. Check that `<ContentLink />` is mounted in your component tree
3. Enable click-to-edit: `<ContentLink enableClickToEdit={true} />` or hold Alt/Option
4. Check browser console for errors

### Navigation not syncing with Web Previews plugin

1. Provide both `onNavigateTo` and `currentPath` props
2. Verify `currentPath` updates on navigation (use `page.url.pathname` in SvelteKit)

### Layout issues from stega encoding

1. Use `stripStega` prop: `<ContentLink stripStega={true} />`
2. Or CSS fix: `[data-datocms-contains-stega] { letter-spacing: 0 !important; }`
