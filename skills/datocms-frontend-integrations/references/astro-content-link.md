# Astro Content Link — `<ContentLink />` for Visual Editing

Astro-specific wiring for `@datocms/astro/ContentLink`. Unlike React, Vue, and Svelte, Astro auto-detects navigation and does not require router props.

## Contents

- Shared Concepts
- Setup
- View Transitions Support
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

Use this file for Astro-only component behavior, View Transitions notes, and supported props.

## Setup

```js
import { ContentLink } from '@datocms/astro/ContentLink';
```

**Note:** `@datocms/astro` uses subpath imports — always import from `@datocms/astro/ContentLink`, not from `@datocms/astro`.

First, make sure your shared query layer already enables Content Link for draft requests. See [Query Function Changes](./content-link-concepts.md#query-function-changes).

Then place the component in your layout. It renders nothing visible but activates Visual Editing features:

```astro
---
// src/layouts/Layout.astro
import { ContentLink } from '@datocms/astro/ContentLink';
---

<html>
  <head>
    <!-- your head content -->
  </head>
  <body>
    <slot />
    <ContentLink />
  </body>
</html>
```

Astro handles navigation synchronization automatically, including projects that use View Transitions.

## View Transitions Support

The component automatically handles both scenarios:

- **With View Transitions**: Listens to `astro:page-load` events and syncs the URL with the Web Previews plugin during client-side navigation
- **Without View Transitions**: Initializes correctly and handles navigation via standard page reloads

No additional configuration needed — unlike React/Vue/Svelte, there are no `onNavigateTo` or `currentPath` props to wire up.

## Enabling Click-to-Edit

### Via Prop (Persistent)

```astro
<ContentLink enableClickToEdit={true} />
```

With options:

```astro
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
| `enableClickToEdit` | `boolean \| { scrollToNearestTarget?: boolean; hoverOnly?: boolean }` | — | Enable click-to-edit overlays persistently |
| `stripStega` | boolean | `false` | Strip stega-encoded invisible characters from text content |

**Note:** Unlike React/Vue/Svelte which also accept `onNavigateTo`, `currentPath`, and `root` props, Astro's `<ContentLink />` only has 2 props. Navigation is handled automatically.

## Data Attributes and Target Resolution

Use the shared [data attributes](./content-link-concepts.md#data-attributes-reference) for explicit record URLs, non-text sources, groups and boundaries, and the [resolution algorithm](./content-link-concepts.md#group-and-boundary-resolution-algorithm) to keep independent editing targets separate. The HTML attribute names are the same in every framework; use this framework's normal attribute-binding syntax.

## Structured Text Integration

**Rule 1:** Always wrap `<StructuredText>` in a group.

**Rule 2:** Add boundary on block, inline block, and inline record components — but **NOT** on link-to-record components:

```astro
---
// src/components/Cta.astro
const { block } = Astro.props;
---

<div data-datocms-content-link-boundary>
  <a href={block.url}>{block.label}</a>
</div>
```

For inline blocks, use `<span>`:

```astro
---
// src/components/NewsletterSignup.astro
const { block } = Astro.props;
---

<span data-datocms-content-link-boundary>
  <input type="email" placeholder={block.placeholder} />
</span>
```

Same for inline records:

```astro
---
// src/components/InlineTeamMember.astro
const { record } = Astro.props;
---

<span data-datocms-content-link-boundary>
  <a href={`/team/${record.slug}`}>{record.name}</a>
</span>
```

Full example:

```astro
---
import { StructuredText, ensureValidStructuredTextProps } from '@datocms/astro/StructuredText';
import Cta from '~/components/Cta.astro';
import NewsletterSignup from '~/components/NewsletterSignup.astro';
import InlineTeamMember from '~/components/InlineTeamMember.astro';
---

<div data-datocms-content-link-group>
  <StructuredText
    {...ensureValidStructuredTextProps({
      data: page.content,
      blockComponents: {
        CtaRecord: Cta,
      },
      inlineBlockComponents: {
        NewsletterSignupRecord: NewsletterSignup,
      },
      inlineRecordComponents: {
        TeamMemberRecord: InlineTeamMember,
      },
    })}
  />
</div>
```

**Why link-to-record components don't need a boundary:** Record links are `<a>` tags wrapping text that belongs to the surrounding structured text — no separate editing target, no collision.

## Low-Level Utilities

```ts
import { stripStega, decodeStega } from '@datocms/astro/ContentLink';
```

See the shared [utility APIs](./content-link-concepts.md#stega-stripping-utilities) and [when to strip stega](./content-link-concepts.md#when-to-strip-stega). Keep encoding for rendered editable content; clean values used in logic, metadata or URL construction. `revealStega` (debug: makes invisible metadata visible) isn't re-exported here — import it from `@datocms/content-link` (add as direct dependency).

## Troubleshooting

### Click-to-edit overlays not appearing

1. Verify `contentLink: 'v1'` and `baseEditingUrl` are set in API calls
2. Check that `<ContentLink />` is mounted in your layout
3. Enable click-to-edit: `<ContentLink enableClickToEdit={true} />` or hold Alt/Option
4. Check browser console for errors
5. Ensure you're viewing draft content (Content Link metadata is only included for draft content)

### Navigation not syncing in Web Previews plugin

1. Verify you're running inside the plugin's iframe
2. Ensure `<ContentLink />` is in a layout that persists across page navigations
3. Check browser console for iframe communication errors

### Layout issues from stega encoding

1. Use `stripStega` prop: `<ContentLink stripStega={true} />`
2. Or CSS fix: `[data-datocms-contains-stega] { letter-spacing: 0 !important; }`
