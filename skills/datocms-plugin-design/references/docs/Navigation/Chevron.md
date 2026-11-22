# Chevron

Three chevrons for three jobs. Use these components. Do not draw a caret
with an icon, a CSS triangle or a text character. The chevrons set their own
size (0.75em of the text next to them, 10px at least) and their own color,
so the container sets only the position.

| Chevron | Use it for |
| - | - |
| `DisclosureChevron` | A toggle that opens content in place (a tree node, a block, a fieldset, a section). Before the title. |
| `MenuChevron` | A trigger that opens a menu or a popup. After the label. |
| `LoadMoreChevron` | A control that loads more items of a list. Before the label. |

## Disclosure

The chevron points right and turns down when the content is open. Put it
before the title. A row that has no content to open gets a
`DisclosureChevronPlaceholder`, so all the titles align. [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md) is
the exception: it puts the chevron after the title.

```tsx
import {
  DisclosureChevron,
  DisclosureChevronPlaceholder,
} from 'datocms-react-ui/Chevron';
import React, { useState } from 'react';

function Row({ title, children }: { title: string; children?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        <DisclosureChevron open={open} />
        {title}
      </button>
      {open && <p style={{ paddingLeft: 'var(--spacing-l)' }}>{children}</p>}
    </div>
  );
}

export default function Disclosure() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <Row title="SEO settings">Title, description and image of the page.</Row>
      <Row title="Blog posts">All the posts of the blog.</Row>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        <DisclosureChevronPlaceholder />
        Homepage
      </div>
      <button
        type="button"
        disabled
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        <DisclosureChevron open />
        Authors
      </button>
    </div>
  );
}
```

**Do:** Put the chevron before the title: it points right, and down when the content is open.

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
  <DisclosureChevron open={false} />
  SEO settings
</div>
```

**Don’t:** Do not put the chevron after the title: it looks like a menu.

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
  SEO settings
  <DisclosureChevron open={false} />
</div>
```

## Menu

The chevron points down, after the label, and it does not turn when the menu
opens. It gets the ink color while its trigger has `aria-expanded="true"`.
The triggers of [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) draw it already. Use `MenuChevron` for a trigger
that you build.

A colored surface (a button, a pill, the navigation bar) sets
`--chevron-color: currentColor` in its CSS. The chevron then has the color
of the text in all the states. The buttons and the pills of the package
set it already.

```tsx
import { MenuChevron } from 'datocms-react-ui/Chevron';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import React from 'react';

export default function Menu() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-m)',
        justifyItems: 'start',
      }}
    >
      <Dropdown
        triggerComponent={Dropdown.TextualTrigger}
        label="Sort by: last update"
      >
        <Dropdown.Menu>
          <Dropdown.Option>Last update</Dropdown.Option>
          <Dropdown.Option>Creation date</Dropdown.Option>
        </Dropdown.Menu>
      </Dropdown>
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        All locales
        <MenuChevron />
      </button>
    </div>
  );
}
```

**Do:** Use a chevron that points down, after the label.

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
  All locales
  <MenuChevron />
</div>
```

**Don’t:** Do not use a pencil icon for a value that the user can change: use the chevron.

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-s)' }}>
  All locales ✎
</div>
```

## Load more

Put `LoadMoreChevron` before the label, in the position that the
`DisclosureChevron` has in the other rows. While the items load, give
`loading`. A spinner with the same size then shows instead of the chevron.

```tsx
import {
  DisclosureChevronPlaceholder,
  LoadMoreChevron,
} from 'datocms-react-ui/Chevron';
import React from 'react';

export default function LoadMore() {
  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      {['Homepage', 'About us', 'Pricing'].map((title) => (
        <div
          key={title}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-s)',
          }}
        >
          <DisclosureChevronPlaceholder />
          {title}
        </div>
      ))}
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
        }}
      >
        <LoadMoreChevron />
        Load 30 more (of 124)
      </button>
    </div>
  );
}
```

## Size and color

Do not set the size or the color of a chevron: its CSS sets them. The size
is 0.75em of the text next to it (10px at least). The color is the subtle
ink, the ink on hover or while the menu is open, and the disabled ink when
its control is `:disabled` or `aria-disabled` (the chevron has no `disabled`
prop). The container sets only its position (margin, alignment).

To change the color, set `--chevron-color`, never `fill`. A colored surface
sets `currentColor`, and a control that is not a button or a link sets
`var(--color--ink)` on hover.

## Other chevrons

The chevrons of a navigation (a submenu, “Back”, previous and next) are the
icons `Navigation.ChevronLeftIcon` and `Navigation.ChevronRightIcon` of
`ui-public/icons`. A pane that collapses uses the double chevrons
(`Navigation.ChevronsLeftIcon`, `Navigation.ChevronsRightIcon`).

