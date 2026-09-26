# React Content Link — `<ContentLink />` for Visual Editing

React-specific wiring for `react-datocms` Content Link in React and Next.js-style projects.

## Contents

- Shared Concepts
- Setup
- Framework Integrations
- Enabling Click-to-Edit
- `<ContentLink />` Props
- `useContentLink` Hook
- Data Attributes and Target Resolution
- Structured Text Integration
- Low-Level Utilities
- Troubleshooting

## Shared Concepts

Read [content-link-concepts.md](./content-link-concepts.md) first for the shared model:

- stega encoding and draft-only query changes
- `baseEditingUrl` semantics
- shared data attributes, grouping rules, low-level controller utilities, and common troubleshooting

Use this file for React-only component API, router wiring, and Structured Text integration details.

## Setup

First, make sure your shared query layer already enables Content Link for draft requests. See [Query Function Changes](./content-link-concepts.md#query-function-changes).

Then mount the React component in a root layout or provider (it renders no visible UI):

```jsx
import { ContentLink } from 'react-datocms/content-link';

function App() {
  return (
    <>
      <ContentLink />
      {/* Your content */}
    </>
  );
}
```

## Framework Integrations

For full [Web Previews plugin](https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews) integration, provide `onNavigateTo` and `currentPath` to sync preview navigation with the CMS:

### Next.js App Router

```jsx
'use client';

import { ContentLink as DatoContentLink } from 'react-datocms/content-link';
import { useRouter, usePathname } from 'next/navigation';

export function ContentLink() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DatoContentLink
      onNavigateTo={(path) => router.push(path)}
      currentPath={pathname}
    />
  );
}
```

Include in root layout, only in draft mode:

```jsx
// app/layout.tsx
import { draftMode } from 'next/headers';
import { ContentLink } from './ContentLink';

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

### React Router

```jsx
import { ContentLink as DatoContentLink } from 'react-datocms/content-link';
import { useNavigate, useLocation } from 'react-router'; // v6 apps with only react-router-dom: import from there

export function ContentLink() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <DatoContentLink
      onNavigateTo={(path) => navigate(path)}
      currentPath={location.pathname}
    />
  );
}
```

## Enabling Click-to-Edit

### Via Prop (Persistent)

```jsx
<ContentLink enableClickToEdit={true} />
```

With options:

```jsx
// Scroll to nearest editable element if none visible
<ContentLink enableClickToEdit={{ scrollToNearestTarget: true }} />

// Only on devices with hover capability (non-touch)
<ContentLink enableClickToEdit={{ hoverOnly: true }} />

// Both
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
| `root` | `React.RefObject<HTMLElement>` | — | Limit scanning to a root element instead of entire document |

## `useContentLink` Hook

For programmatic control over Visual Editing behavior:

```ts
import { useContentLink } from 'react-datocms/use-content-link';

const {
  controller,           // Underlying controller instance
  enableClickToEdit,    // (options?) => void — enable overlays
  disableClickToEdit,   // () => void — disable overlays
  isClickToEditEnabled, // () => boolean — check state
  flashAll,             // (scrollToNearest?: boolean) => void — highlight all editable areas
  setCurrentPath,       // (path: string) => void — notify Web Previews of current path
} = useContentLink({
  enabled: true,        // true | false | { stripStega: true }
  onNavigateTo: (path) => router.push(path),
  root: elementRef,
});
```

**`enabled` options:**

- `true` (default): Controller active, stega encoding preserved in DOM
- `false`: Controller disabled
- `{ stripStega: true }`: Controller active, permanently removes stega encoding from text nodes

### Custom Editing Toolbar Example

```jsx
import { useContentLink } from 'react-datocms/use-content-link';
import { useState } from 'react';

function EditingToolbar() {
  const { enableClickToEdit, disableClickToEdit, flashAll } = useContentLink({
    onNavigateTo: (path) => window.location.href = path,
  });

  const [isEditing, setIsEditing] = useState(false);

  const toggleEditing = () => {
    if (isEditing) {
      disableClickToEdit();
    } else {
      enableClickToEdit({ scrollToNearestTarget: true });
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="editing-toolbar">
      <button onClick={toggleEditing}>
        {isEditing ? 'Disable' : 'Enable'} Editing
      </button>
      <button onClick={() => flashAll(true)}>
        Show Editable Areas
      </button>
    </div>
  );
}
```

## Data Attributes and Target Resolution

Use the shared [data attributes](./content-link-concepts.md#data-attributes-reference) for explicit record URLs, non-text sources, groups and boundaries, and the [resolution algorithm](./content-link-concepts.md#group-and-boundary-resolution-algorithm) to keep independent editing targets separate. The HTML attribute names are the same in every framework; use this framework's normal attribute-binding syntax.

## Structured Text Integration

**Rule 1:** Always wrap `<StructuredText>` in a group.

**Rule 2:** Add boundary on `renderBlock`, `renderInlineRecord`, and `renderInlineBlock` — but **NOT** on `renderLinkToRecord`:

```jsx
import { StructuredText } from 'react-datocms/structured-text';

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
        <InlineComponent record={record} />
      </span>
    )}
    renderLinkToRecord={({ record, children, transformedMeta }) => (
      <a {...transformedMeta} href={`/resources/${record.slug}`}>
        {children}
      </a>
    )}
    renderInlineBlock={({ record }) => (
      <span data-datocms-content-link-boundary>
        <InlineBlockComponent record={record} />
      </span>
    )}
  />
</div>
```

**Why `renderLinkToRecord` doesn't need a boundary:** Record links are `<a>` tags wrapping text that belongs to the surrounding structured text — no separate editing target, no collision.

## Low-Level Utilities

```ts
import { stripStega, decodeStega, revealStega } from 'react-datocms/stega';
```

See the shared [utility APIs](./content-link-concepts.md#stega-stripping-utilities) and [when to strip stega](./content-link-concepts.md#when-to-strip-stega). Keep encoding for rendered editable content. Clean intentionally non-editable text (labels, badges) at every use, rendered text and attributes alike, and values used in logic, metadata or URL construction. `revealStega` makes invisible metadata visible for debugging.

## Troubleshooting

### Click-to-edit overlays not appearing

1. Verify `contentLink: 'v1'` and `baseEditingUrl` are set in API calls
2. Check that `<ContentLink />` is mounted in your component tree
3. Enable click-to-edit: `<ContentLink enableClickToEdit={true} />` or hold Alt/Option
4. Check browser console for errors

### Navigation not syncing with Web Previews plugin

1. Provide both `onNavigateTo` and `currentPath` props
2. Verify `currentPath` updates on navigation

### Layout issues from stega encoding

1. Use `stripStega` prop: `<ContentLink stripStega={true} />`
2. Or CSS fix: `[data-datocms-contains-stega] { letter-spacing: 0 !important; }`
