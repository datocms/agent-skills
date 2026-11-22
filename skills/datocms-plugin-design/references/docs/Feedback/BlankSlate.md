# BlankSlate

The content of an area that has nothing to show: a list with no items, a
detail with no selection, an area that loads, a search that failed.

| Use | For |
| - | - |
| `BlankSlate` | An area with nothing to show: a list, a page, a panel, a modal. |
| [`ListOrOverview`](https://react-ui.datocms.com/Layout/ListOrOverview.md) | A section with no elements: it shows a `BlankSlate` with `titleLevel={1}` in the whole area. |
| [`Pane.FilterBlankSlate`](https://react-ui.datocms.com/Layout/Pane.md) | A filter of a list that keeps no element. |
| [`EmptySlot`](https://react-ui.datocms.com/Lists/EmptySlot.md) | A field of a form with no blocks, files or records, or an empty list of items in a form. |

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import Button from 'datocms-react-ui/Button';
import React from 'react';
import { AddIcon, WebhooksIcon } from '@/icons';

export default function EmptyList() {
  return (
    <BlankSlate
      placement="inline"
      icon={<WebhooksIcon />}
      title="No webhooks yet"
      description="A webhook sends a request to your server each time something changes in the project, for example when a record is published."
      docs={[
        { href: 'https://www.datocms.com/docs/general-concepts/webhooks' },
      ]}
      actions={<Button tone="primary" icon={AddIcon} label="New webhook" />}
    />
  );
}
```

## Parts

An empty list shows the same parts everywhere:

- the **icon** of the entity: the icon of the menu item of the section that
  lists it;
- a **title**: the name of the section in an overview, else what is
  missing (“No webhooks yet”);
- a **description** that says what shows there and how it gets there;
- the links to the documentation in **`docs`**. They show as a button after
  the text;
- the action that creates the first item in **`actions`**, when there is
  one.

`placement` is required. It says where the blank slate is:

- `area`: the blank slate fills its positioned parent and stays in the
  center of it. Use it where the parent has a height of its own: the content
  of a Pane, a SplitViewPane, an overview.
- `inline`: the blank slate is a block in the flow, and the only content of
  its box: a dialog body while it loads, a card, a frame of a field.
- `section`: the blank slate is a block in the flow with content above or
  below it: under the title of a section of a page or of a panel, under a
  label of a form. A frame like the one of an empty slot separates it from
  that content.

`small` is only a size. It does not depend on the placement.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import React from 'react';
import { RolesIcon } from '@/icons';

export default function Area() {
  return (
    // The box is positioned and has a height: the blank slate centers in it
    <div style={{ position: 'relative', height: 320 }}>
      <BlankSlate
        placement="area"
        icon={<RolesIcon />}
        title="No roles yet"
        description="Roles define what each collaborator can do."
      />
    </div>
  );
}
```

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import { Page } from 'datocms-react-ui/Page';
import React from 'react';
import { FileInvoiceIcon } from '@/icons';

export default function Section() {
  return (
    <Page.Section>
      <Page.SectionTitle>Past invoices</Page.SectionTitle>
      <BlankSlate
        placement="section"
        small
        icon={<FileInvoiceIcon />}
        title="No invoices yet"
        description="The invoices of your subscription show here after the first payment."
      />
    </Page.Section>
  );
}
```

When the blank slate is the content of a page, alone in `<main>`, give it
`titleLevel={1}`: its title is then the title of the page. See the patterns
[List and detail](https://react-ui.datocms.com/Patterns/ListAndDetail.md) and
[List and form](https://react-ui.datocms.com/Patterns/ListAndForm.md).

**Do:** Use the icon of the entity, the same in the overview and in the empty detail.

```tsx
<BlankSlate
  placement="inline"
  small
  icon={<RolesIcon />}
  title="No roles yet"
  description="A role gives collaborators the permissions that they need."
/>
```

**Don’t:** Do not use a decorative icon. Only a search with no results uses the search icon, and an error a status icon.

```tsx
<BlankSlate
  placement="inline"
  small
  icon={<span style={{ fontSize: 32 }}>🙁</span>}
  title="No roles yet"
  description="A role gives collaborators the permissions that they need."
/>
```

**Do:** Give the links to the documentation in docs.

```tsx
<BlankSlate
  placement="inline"
  small
  icon={<RolesIcon />}
  title="No roles yet"
  description="A role gives collaborators the permissions that they need."
  docs={[{ href: 'https://www.datocms.com/docs' }]}
/>
```

**Don’t:** Do not put the links to the documentation in the description.

```tsx
<BlankSlate
  placement="inline"
  small
  icon={<RolesIcon />}
  title="No roles yet"
  description={
    <span>
      A role gives collaborators the permissions that they need.{' '}
      <a href="https://www.datocms.com/docs">Read the docs</a>
    </span>
  }
/>
```

## Documentation links

With more than one link, the button opens a menu. Give each link a `label`:
without it, the menu shows the URL.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import React from 'react';
import { RolesIcon } from '@/icons';

export default function MoreDocs() {
  return (
    <BlankSlate
      placement="inline"
      icon={<RolesIcon />}
      title="No roles yet"
      description="A role gives a group of collaborators the permissions that they need, and nothing more."
      docs={[
        {
          label: 'Roles and permissions',
          href: 'https://www.datocms.com/docs/general-concepts/roles-and-permission-system',
        },
        {
          label: 'Content permissions',
          href: 'https://www.datocms.com/docs/general-concepts/roles-and-permission-system#content-permissions',
        },
      ]}
    />
  );
}
```

## Only a title

A blank slate with no selection (“No role selected”) or with no search
results has a title alone. The title is then a plain message in the center,
not a heading.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import React from 'react';
import { RolesIcon } from '@/icons';

export default function OnlyTitle() {
  return (
    <BlankSlate
      placement="inline"
      icon={<RolesIcon />}
      title="No role selected"
    />
  );
}
```

## Small

In a narrow area (a sidebar, a side panel) or in a section of a page, use
`small`, with the same parts.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import React from 'react';
import { CommentsIcon } from '@/icons';

export default function Small() {
  return (
    <div className="DocsNarrow">
      <BlankSlate
        placement="inline"
        small
        icon={<CommentsIcon />}
        title="No comments yet"
        description="The comments of the editors about this record show here."
      />
    </div>
  );
}
```

## Loading

An area that loads and says what it loads shows `loading`: a spinner
instead of the icon, and the title below it. Without a title, the
spinner says that the content loads. A `caption` can show the progress.
A loading blank slate takes no `icon` and no `error`.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import React from 'react';

export default function Loading() {
  return (
    <BlankSlate
      placement="inline"
      loading
      title="Searching the audit log"
      caption="1,250 events scanned"
    />
  );
}
```

**Do:** Use a BlankSlate with loading and a title.

```tsx
<BlankSlate placement="inline" small loading title="Loading the invoices" />
```

**Don’t:** Do not put a Spinner and a paragraph together by hand.

```tsx
<div style={{ textAlign: 'center' }}>
  <Spinner inline />
  <p>Loading the invoices…</p>
</div>
```

## Error

`error` shows the icon in the color of an error. The title and the
description keep the normal colors, so they are easy to read. Give a
status icon. `code` shows the raw message of the error in a quiet
monospace box under the title, as text. The description then explains what
the user must do.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import Button from 'datocms-react-ui/Button';
import React from 'react';
import { CircleExclamationIcon, RefreshIcon } from '@/icons';

export default function ErrorState() {
  return (
    <BlankSlate
      placement="inline"
      error
      icon={<CircleExclamationIcon />}
      title="The search failed"
      code="Query timeout: the search took more than 30 seconds"
      description="Search a shorter period of time, then try again."
      actions={<Button icon={RefreshIcon} label="Try again" />}
    />
  );
}
```

## Content

`children` show under the description, for the content that is not text:
for example a short form that fills the area (the CDA Playground asks for
an API token in this way).

## Props

### BlankSlate

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `titleLevel` | `HeadingLevel` | No | | The level of the title as a heading. Give it when the blank slate is the content of a page, alone in \<main>: its title is then the title of the page, level 1. Without it, the title is not a heading (for example the message of an empty list in a page that has a title). |
| `code` | `Message` | No | | A quiet monospace box under the title, for example the raw message of an error. It shows as text, not as HTML. |
| `description` | `Message` | No | | What shows in this area, and how it gets there |
| `caption` | `Message` | No | | A small line under the description, for example a counter |
| `docs` | `BlankSlateDocsLink[]` | No | | Links to the documentation. They show as a button after the text: a menu when there is more than one link. |
| `actions` | `ReactNode` | No | | The buttons that show before the documentation button, for example the button that creates the first item |
| `placement` | `'area' \| 'inline' \| 'section'` | Yes | | Where the blank slate is. `area`: it fills its positioned parent, which has a height of its own (the content of a Pane, a SplitViewPane, an overview), and stays in its center. `inline`: it is a block in the flow and the only content of its box (a dialog body, a card, a frame). `section`: it is a block in the flow with content above or below it (the title of a section of a page or of a panel, a label of a form); a frame like the one of an empty slot separates it from that content. |
| `small` | `boolean` | No | | Use the small size in narrow areas (a sidebar) and in a section of a page |
| `className` | `string` | No | | A class for the outer element of the blank slate |
| `children` | `ReactNode` | No | | Content under the description that is not text, for example a short form |
| `loading` | `boolean` | No | | Shows a spinner instead of the icon |
| `title` | `Message` | No | | Loading: What loads, for example "Loading the invoices"<br>Loaded: The name of the section in an overview, else what is missing, for example "No members yet" |
| `icon` (variant) | `ReactNode` | No | | The icon of the entity: the icon of the menu item of the section that lists it. A search with no results uses the search icon, and an error uses a status icon. |
| `error` (variant) | `boolean` | No | | Shows the color of an error on the icon |

#### Variants

The props marked “variant” go only together. For each group, give the props of one variant, not more.

`BlankSlateState`

| Variant | Props | Description |
| - | - | - |
| `Loading` | `loading`, `title` | While the content loads, a spinner shows instead of the icon. The title then says what loads. Without a title, the spinner says that the content loads. |
| `Loaded` | `title`, `icon`, `error` | The content is ready: the blank slate says why there is nothing to show |

#### Types

`BlankSlateDocsLink`

```ts
export type BlankSlateDocsLink = {
  /**
   * The label shows only when there are more links: in the menu of the
   * "Documentation" button. Without it, the menu shows the URL.
   */
  label?: Message;
  href: string;
};
```
