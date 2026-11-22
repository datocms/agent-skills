# Link

`Link` is a link to a page of DatoCMS. It goes through the router of the
host (see the navigation of [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md)), so the page does not reload. It is a
real `a` with an `href`, so a middle click, a click with Cmd or Ctrl and
"Open in new tab" open the page in a new tab.

`Link` takes the props of an `a` (`className`, `style`, `onClick`,
`target`…) and four of its own: `to`, `exact`, `active` and `replace`. It
does not show the props of a router, so a change of the router does not
change it.

`to` is a URL of the host, as a string: the path with its query
(`"/data-usage?range=30d"`). `Link` does not carry the state of a
router.

| Use | For |
| - | - |
| `Link` | A link in a text, or a block that opens a page of DatoCMS. |
| [`Button`](https://react-ui.datocms.com/Actions/Button.md) with `to` | A link that looks like a button. |
| [`Table.Row`](https://react-ui.datocms.com/Lists/Table.md) with `to` | A row of a table that opens a page. |
| [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md) | The rows of a sidebar list, each with its own page. |
| `a` | A link to another site or to a file. |

## In a text

A link in the text of a sentence is underlined and keeps the color of the
text.

```tsx
import Link from 'datocms-react-ui/Link';
import React from 'react';

export default function InText() {
  return (
    <p>
      Your plan is over its limits.{' '}
      <Link to="/plan-billing/change">Upgrade the plan</Link> or{' '}
      <Link to="/data-usage?range=30d">see the usage</Link>.
    </p>
  );
}
```

## Block link

A card or a row can be a link. Give it the class and the content. The whole
block is the target.

```tsx
import Link from 'datocms-react-ui/Link';
import React from 'react';

export default function Card() {
  return (
    <Link
      to="/starters/marketing-website"
      style={{
        display: 'block',
        padding: 'var(--spacing-l)',
        border: '1px solid var(--color--border)',
        borderRadius: 'var(--radius-m)',
        textDecoration: 'none',
      }}
    >
      <strong>Marketing website</strong>
      <div>A landing page with a blog, ready to deploy.</div>
    </Link>
  );
}
```

## Active state

When its page is open, the link gets `aria-current="page"`. Give the active
look with that attribute in the CSS, not with a class.

A link is active when the path of the page is the path of `to` (the query
does not count) or a path under it. With `exact`, the pages under it do not
count. Use it for the link to the root of a section. The match ignores the
case and a slash at the end. `active` forces the state, for a link that is
active on other paths too. When the host gives no location (a plugin outside
a page), only `active` makes a link active.

```tsx
import Link from 'datocms-react-ui/Link';
import React from 'react';

// The CSS of the app gives the active look with the attribute
const ACTIVE_LOOK = `
  .LinkStates a[aria-current="page"] {
    font-weight: var(--font-weight-strong);
    text-decoration: none;
  }
`;

export default function ActiveState() {
  return (
    // The host is on the fields of a model (the "path" of the example)
    <>
      <style>{ACTIVE_LOOK}</style>
      <ul className="LinkStates">
        <li>
          <Link to="/schema">Models</Link> (active: a page under it is open)
        </li>
        <li>
          <Link to="/schema" exact={true}>
            Models overview
          </Link>{' '}
          (not active: <code>exact</code>)
        </li>
        <li>
          <Link to="/schema/blog_post/fields?tab=validations">Fields</Link>{' '}
          (active: the query does not count)
        </li>
        <li>
          <Link to="/media">Media</Link> (not active)
        </li>
        <li>
          <Link to="/schema/blog_post/presentation" active={true}>
            Presentation
          </Link>{' '}
          (active through <code>active</code>)
        </li>
      </ul>
    </>
  );
}
```

## Replace

With `replace`, the new page replaces the current entry of the history, so
the Back button of the browser does not come back to the current page. Use
it for a change of a view that is not a new step, for example a tab in the
query of the URL ([`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) does it). A link to the URL that is open always
replaces the entry.

**Do:** Use a link for a next step that only opens a page. The text says where it goes.

```tsx
<p>Your plan is over its limits. <Link to="/plan-billing/change">Upgrade the plan</Link>.</p>
```

**Don’t:** Do not use a link for an action that sends a request: use a Button.

```tsx
<p>The token is ready. <Link to="/tokens/new">Regenerate it</Link>.</p>
```

