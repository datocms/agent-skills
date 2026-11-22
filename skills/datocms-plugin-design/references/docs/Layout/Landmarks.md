# Landmarks and headings

`Main`, `Nav`, `Aside` and `Search` are the landmarks of a page: they split it
in regions that a screen reader user can jump to. `Heading` gives the
structure of the titles. None of them has a look of its own.

Do not write `<main>`, `<nav>`, `<aside>`, `role="search"` or `<h1>` to
`<h6>` by hand: use these components.

Do not use `<section>`. Without a name it is not a landmark. With a name,
each `section` is a landmark, and many of them make noise in the list of
landmarks. Use a `div` with a `Heading`. For a real landmark, use `Aside`,
`Nav` or `Main`.

| Component | Use it for |
| - | - |
| `Main` | The main content of the page. A page has one. |
| `Nav` | A list of links that go to other pages (a menu, the rows of a list that are links). |
| `Aside` | Content next to the main content: the details of a row, the information of a record. |
| `Search` | The field and the filters that search a collection. |
| `Heading` | A title or the title of a section. The level is always explicit. |

Other components for other cases:

- A list of controls that change the content of the same place is [`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md), not a `Nav`.
- A search or a filter in a toolbar is `Toolbar.Search` or [`Toolbar.FilterInput`](https://react-ui.datocms.com/Layout/Toolbar.md). They use `Search` and take the `ariaLabel` of the [`Pane`](https://react-ui.datocms.com/Layout/Pane.md).
- The title of a toolbar is [`Toolbar.Title`](https://react-ui.datocms.com/Layout/Toolbar.md), and the title of a group of a page is [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md). They use `Heading`.

## Main

`Main` always has the id `main-content`, so a skip link can point to it. A page has one `Main`. Put it as near to the route as you can:
in the layout of the route around its children, or in its index. Do not put it
in the shell of your plugin or in a layout that many routes share, because
those routes can nest their own.

A component that is a page in one place and the content of a dialog in
another skips `Main` when it is `embedded`. `Main` is not shown live here,
because this docs page already has one. `Main` has no look: when it is also
the layout box of a screen, give it the class of that screen.

In the pages of DatoCMS, `Main` moves the focus into the new page when the
pathname changes. The
focus moves to the content of the first [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) in `Main`, or to `Main` when
it has no [`Pane`](https://react-ui.datocms.com/Layout/Pane.md). A [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) in the side list of a [`SplitPane`](https://react-ui.datocms.com/Layout/SplitPane.md) does not get
it. So the keys run the actions of the new page, and a screen reader
reads it.

A change of the query string (a filter, a page of a list) does not move the
focus. When the new page puts the focus in `Main` itself (a field with
autofocus), the focus stays there. A plugin does not get this behavior,
because DatoCMS mounts its provider only around its own routes.

```tsx
<Main>
  <ListDetail.Page title="Projects" … />
</Main>
```

## Nav

A page can have more than one `Nav`, and a screen reader user needs a name to
tell them apart. Give the `ariaLabel` as the name of the section, or
`ariaLabelledBy` with the id of a visible heading. A [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md) in a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md)
with a title takes its name from the title by itself (see [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md)).

`Nav` has no look: when it is also the layout box of a screen, give it the
class of that screen.

```tsx
import Link from 'datocms-react-ui/Link';
import Nav from 'datocms-react-ui/Nav';
import React from 'react';

export default function NavLinks() {
  return (
    <Nav ariaLabel="Roles">
      <ul style={{ display: 'grid', gap: 'var(--spacing-s)', margin: 0 }}>
        <li>
          <Link to="/roles/admin">Admin</Link>
        </li>
        <li>
          <Link to="/roles/developer">Developer</Link>
        </li>
        <li>
          <Link to="/roles/editor">Editor</Link>
        </li>
      </ul>
    </Nav>
  );
}
```

**Do:** Name the section: “Roles”. The screen reader says “navigation” itself.

```tsx
<Nav ariaLabel="Roles">
  <a href="#roles">Roles</a>
</Nav>
```

**Don’t:** Do not write the word “navigation” in the label.

```tsx
<Nav ariaLabel="Navigation">
  <a href="#roles">Roles</a>
</Nav>
```

## Aside

Use `Aside` for content that is not part of the main content but belongs to
it: the details of the open row of a list, the sidebar of a record. The
`ariaLabel` says what the content is.

```tsx
import Aside from 'datocms-react-ui/Aside';
import Heading from 'datocms-react-ui/Heading';
import React from 'react';

export default function AsideDetails() {
  return (
    <Aside ariaLabel="Role details">
      <Heading level={2}>Editor</Heading>
      <p>Creates and publishes the records.</p>
    </Aside>
  );
}
```

**Do:** Name what the content is: “Additional record information”.

```tsx
<Aside ariaLabel="Additional record information">Created on 14 October 2026.</Aside>
```

**Don’t:** Do not use Aside for a list of links: use Nav.

```tsx
<Aside ariaLabel="Pages">
  <a href="#roles">Roles</a> <a href="#webhooks">Webhooks</a>
</Aside>
```

## Search

`Search` holds the controls that search or filter one collection. The
`ariaLabel` says what the user searches.

```tsx
import Search from 'datocms-react-ui/Search';
import React, { useState } from 'react';

export default function SearchField() {
  const [query, setQuery] = useState('');

  return (
    <Search ariaLabel="Roles">
      <input
        type="search"
        aria-label="Filter the roles"
        placeholder="Filter…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </Search>
  );
}
```

## Heading

The `level` sets the structure of the page for screen readers, and the
`className` sets the look, so a level 1 heading can look small.

- The title of a page or of a dialog is level 1.
- A section of it is level 2, and a section of that section is level 3.
- Do not skip a level.
- A heading is only inside `Main` or inside a dialog.
- Give `visually-hidden` as class to a heading that the structure needs and the design does not show. Do not use `display: none`: it removes the text from the accessibility tree.
- A title that the user can click has a button or a link inside the heading. The heading itself takes no click.
- When a title of a component fits ([`Toolbar.Title`](https://react-ui.datocms.com/Layout/Toolbar.md), [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md), [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md), the title of a [`Modal`](https://react-ui.datocms.com/Overlays/Modal.md)), use it. Use `Heading` with a class of your own only for a title that no component gives.
- A title is a heading only where it gets a level. A component that is a heading takes `level` ([`Toolbar.Title`](https://react-ui.datocms.com/Layout/Toolbar.md), [`Pane.Header.Title`](https://react-ui.datocms.com/Layout/Pane.md)). A component that has a title takes `titleLevel` ([`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md), [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md)): give the level after the title of the pane that holds it.
- The title of a page says what the page is (“Edit Editor role”), because a screen reader user finds it alone in the list of headings.

```tsx
import Heading from 'datocms-react-ui/Heading';
import React from 'react';

export default function HeadingLevels() {
  return (
    <div>
      <Heading level={1}>Roles</Heading>
      <Heading level={2}>Permissions</Heading>
      <Heading level={3}>Schema</Heading>
      <Heading level={2} className="visually-hidden">
        Details of the role
      </Heading>
    </div>
  );
}
```

**Do:** Go down one level at a time.

```tsx
<div>
  <Heading level={2}>Permissions</Heading>
  <Heading level={3}>Schema</Heading>
</div>
```

**Don’t:** Do not choose the level for its look: the class gives the look.

```tsx
<div>
  <Heading level={2}>Permissions</Heading>
  <Heading level={5}>Schema</Heading>
</div>
```

## Accessibility

A landmark has a name that says what it holds, not its role: the screen
reader says the role itself. A page can have more than one landmark of the
same kind, so the names must differ.

## Props

### Main

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Nav

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` (variant) | `TextMessage` | No | | The accessible name of the navigation. A page can have more than one navigation, and a screen reader user needs the name to tell them apart. Write the name of the section, for example "Roles". Do not write the word "navigation": the screen reader says the role itself. |
| `ariaLabelledBy` (variant) | `string` | No | | The id of a visible element (a heading) that gives the name |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Aside

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the complementary content. A page can have more than one, and a screen reader user needs the name to tell them apart. Write what the content is, for example "Additional record information". Do not write the word "complementary": the screen reader says the role itself. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Search

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` | `TextMessage` | Yes | | The accessible name of the search. A page can have more than one, and a screen reader user needs the name to tell them apart. Write what the user searches, for example "Roles". Do not write the word "search": the screen reader says the role itself. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`

### Heading

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `level` | `HeadingLevel` | Yes | | The level is always explicit. A heading is only inside \<main> or inside a dialog. The title of a page or of a dialog is level 1. A section of it is level 2, and a section of that section is level 3. Do not skip a level. |
| `className` | `string` | No | | Gives the look. The level does not change the look. |
| `id` | `string` | No | | For example, the target of `aria-labelledby` of a dialog |
| `children` | `ReactNode` | Yes | | |

#### Types

`HeadingLevel`

```ts
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
```
