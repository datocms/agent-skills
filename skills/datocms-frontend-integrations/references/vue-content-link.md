# Vue Content Link — `<ContentLink>` for Visual Editing

Vue-specific wiring for `vue-datocms` Content Link in Vue and Nuxt projects.

## Contents

- Shared Concepts
- Setup
- Framework Integrations
- Enabling Click-to-Edit
- `<ContentLink>` Props
- `useContentLink` Composable
- Data Attributes and Target Resolution
- Structured Text Integration
- Low-Level Utilities
- Troubleshooting

## Shared Concepts

Read [content-link-concepts.md](./content-link-concepts.md) first for the shared model:

- stega encoding and draft-only query changes
- `baseEditingUrl` semantics
- shared data attributes, grouping rules, low-level controller utilities, and common troubleshooting

Use this file for Vue-only component API, router wiring, and Structured Text integration details.

## Setup

First, make sure your shared query layer already enables Content Link for draft requests. See [Query Function Changes](./content-link-concepts.md#query-function-changes).

Then mount the Vue component in a root layout or app shell (it renders no visible UI):

```vue
<script setup>
import { ContentLink } from 'vue-datocms';
</script>

<template>
  <ContentLink />
  <!-- Your content -->
</template>
```

## Framework Integrations

For full [Web Previews plugin](https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews) integration, provide `on-navigate-to` and `current-path` to sync preview navigation with the CMS:

### Vue Router

```vue
<script setup>
import { ContentLink } from 'vue-datocms';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
</script>

<template>
  <ContentLink
    :on-navigate-to="(path) => router.push(path)"
    :current-path="route.path"
  />
</template>
```

### Nuxt

Use a client-only controller component so route changes reach Web Previews before Nuxt renders the next page. This wrapper owns router integration; mount it as `<ContentLink />` without also passing routing callbacks from its parent.

**File:** `components/ContentLink.vue`

```vue
<script setup lang="ts">
import { createController } from '@datocms/content-link';
import { onMounted, onUnmounted } from 'vue';

const router = useRouter();
let controller: ReturnType<typeof createController> | null = null;
let removeAfterEach: (() => void) | undefined;

onMounted(() => {
  controller = createController({
    onNavigateTo: (path) => {
      router.push(path);
    },
  });
  controller.setCurrentPath(router.currentRoute.value.fullPath);
  removeAfterEach = router.afterEach((to, _from, failure) => {
    if (!failure) controller?.setCurrentPath(to.fullPath);
  });
  controller.enableClickToEdit();
});

onUnmounted(() => {
  removeAfterEach?.();
  controller?.dispose();
  controller = null;
});
</script>

<template>
  <div />
</template>
```

Update the controller path in the router's `afterEach` hook, before the next page's DOM is stamped. Nuxt's `useRoute()` updates after the page content changes; watching it can report the new record with the previous path to Web Previews. Verify navigation between two records in the embedded preview, including the reported path and record together.

## Enabling Click-to-Edit

### Via Prop (Persistent)

```vue
<ContentLink :enable-click-to-edit="true" />
```

With options:

```vue
<!-- Scroll to nearest editable element if none visible -->
<ContentLink :enable-click-to-edit="{ scrollToNearestTarget: true }" />

<!-- Only on devices with hover capability (non-touch) -->
<ContentLink :enable-click-to-edit="{ hoverOnly: true }" />

<!-- Both -->
<ContentLink :enable-click-to-edit="{ hoverOnly: true, scrollToNearestTarget: true }" />
```

| Option | Type | Default | Description |
| - | - | - | - |
| `scrollToNearestTarget` | boolean | false | Auto-scroll to nearest editable element if none visible |
| `hoverOnly` | boolean | false | Only enable on hover-capable devices; touch users can still toggle with Alt/Option |

### Via Keyboard Shortcut (Temporary)

Hold **Alt** (Windows/Linux) or **Option** (Mac) to temporarily invert click-to-edit: enable it when off, or disable it when already on. Releasing the key restores the previous state.

## `<ContentLink>` Props

| Prop | Type | Default | Description |
| - | - | - | - |
| `on-navigate-to` | `(path: string) => void` | — | Callback when Web Previews plugin requests navigation |
| `current-path` | string | — | Current pathname to sync with Web Previews plugin |
| `enable-click-to-edit` | `boolean \| { scrollToNearestTarget?: boolean, hoverOnly?: boolean }` | — | Enable click-to-edit overlays persistently |
| `strip-stega` | boolean | — | Remove stega encoding from text nodes after processing |
| `root` | `Ref<ParentNode \| null \| undefined>` | — | Limit scanning to a root element instead of entire document |

## `useContentLink` Composable

For programmatic control over Visual Editing behavior:

```ts
import { useContentLink } from 'vue-datocms';

const {
  controller,           // Ref<Controller | null> — underlying controller instance
  enableClickToEdit,    // (options?) => void — enable overlays
  disableClickToEdit,   // () => void — disable overlays
  isClickToEditEnabled, // () => boolean — check state
  flashAll,             // (scrollToNearestTarget?) => void — highlight all editable areas
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

```vue
<script setup>
import { ref, watch } from 'vue';
import { useContentLink } from 'vue-datocms';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const isEditing = ref(false);

const {
  enableClickToEdit,
  disableClickToEdit,
  isClickToEditEnabled,
  flashAll,
  setCurrentPath,
} = useContentLink({
  enabled: true,
  onNavigateTo: (path) => router.push(path),
});

function toggleEditing() {
  if (isClickToEditEnabled()) {
    disableClickToEdit();
    isEditing.value = false;
  } else {
    enableClickToEdit({ scrollToNearestTarget: true });
    isEditing.value = true;
  }
}

watch(() => route.path, (newPath) => {
  setCurrentPath(newPath);
}, { immediate: true });
</script>

<template>
  <div class="editing-toolbar">
    <button @click="toggleEditing">
      {{ isEditing ? 'Disable' : 'Enable' }} Editing
    </button>
    <button @click="flashAll(true)">
      Show Editable Areas
    </button>
  </div>
</template>
```

## Data Attributes and Target Resolution

Use the shared [data attributes](./content-link-concepts.md#data-attributes-reference) for explicit record URLs, non-text sources, groups and boundaries, and the [resolution algorithm](./content-link-concepts.md#group-and-boundary-resolution-algorithm) to keep independent editing targets separate. The HTML attribute names are the same in every framework; use this framework's normal attribute-binding syntax.

## Structured Text Integration

Structured Text fields need special handling:

**Rule 1:** Always wrap `<StructuredText>` in a group:

```vue
<div data-datocms-content-link-group>
  <StructuredText :data="page.content" />
</div>
```

**Rule 2:** Add boundary on `renderBlock`, `renderInlineRecord`, and `renderInlineBlock` — but **NOT** on `renderLinkToRecord`:

```vue
<template>
  <div data-datocms-content-link-group>
    <StructuredText
      :data="data.blogPost.content"
      :renderBlock="renderBlock"
      :renderInlineRecord="renderInlineRecord"
      :renderLinkToRecord="renderLinkToRecord"
      :renderInlineBlock="renderInlineBlock"
    />
  </div>
</template>

<script setup>
import { StructuredText, Image } from 'vue-datocms';
import { h } from 'vue';

const props = defineProps<{ data: any }>();

function renderBlock({ record }) {
  switch (record.__typename) {
    case 'ImageBlockRecord':
      return h(
        'div',
        { 'data-datocms-content-link-boundary': '' },
        [h(Image, { data: record.image.responsiveImage })],
      );
    default:
      return null;
  }
}

function renderInlineRecord({ record }) {
  switch (record.__typename) {
    case 'TeamMemberRecord':
      return h(
        'span',
        { 'data-datocms-content-link-boundary': '' },
        [h('a', { href: `/team/${record.slug}` }, record.firstName)],
      );
    default:
      return null;
  }
}

function renderLinkToRecord({ record, children, transformedMeta }) {
  switch (record.__typename) {
    case 'TeamMemberRecord':
      return h(
        'a',
        { ...transformedMeta, href: `/team/${record.slug}` },
        children,
      );
    default:
      return null;
  }
}

function renderInlineBlock({ record }) {
  switch (record.__typename) {
    case 'MentionRecord':
      return h(
        'span',
        { 'data-datocms-content-link-boundary': '' },
        [h('code', `@${record.username}`)],
      );
    default:
      return null;
  }
}
</script>
```

**Why `renderLinkToRecord` doesn't need a boundary:** Record links are `<a>` tags wrapping text that belongs to the surrounding structured text — no separate editing target, no collision.

## Low-Level Utilities

```ts
import { stripStega, decodeStega } from 'vue-datocms';
```

See the shared [utility APIs](./content-link-concepts.md#stega-stripping-utilities) and [when to strip stega](./content-link-concepts.md#when-to-strip-stega). Keep encoding for rendered editable content; clean values used in logic, metadata or URL construction. `revealStega` (debug: makes invisible metadata visible) isn't re-exported here — import it from `@datocms/content-link` (add as direct dependency).

## Troubleshooting

### Click-to-edit overlays not appearing

1. Verify `contentLink: 'v1'` and `baseEditingUrl` are set in API calls
2. Check that `<ContentLink>` is mounted in your component tree
3. Enable click-to-edit: `:enable-click-to-edit="true"` or hold Alt/Option
4. Check browser console for errors

### Navigation not syncing with Web Previews plugin

1. Provide both `on-navigate-to` and `current-path` props
2. Verify `current-path` updates on route changes

### StructuredText blocks not clickable

1. Wrap with `data-datocms-content-link-group`
2. Add `data-datocms-content-link-boundary` to `renderBlock` and `renderInlineBlock`

### Layout issues from stega encoding

1. Use `strip-stega` prop: `<ContentLink :strip-stega="true" />`
2. Or CSS fix: `[data-datocms-contains-stega] { letter-spacing: 0 !important; }`
