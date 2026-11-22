# Canvas

`datocms-react-ui` has the React components of the DatoCMS interface, for
the plugins of DatoCMS. `Canvas` is the root of every plugin: the
components read the host through it. Without it, they stop with an error.

This site explains how to build the interface of a plugin. What a plugin is,
its hooks and its `ctx` are in the
[Plugin SDK docs](https://www.datocms.com/docs/plugin-sdk/introduction).

## Install

A plugin that you make from the template of
[Build your first plugin](https://www.datocms.com/docs/plugin-sdk/build-your-first-plugin)
has these packages already. In a project of your own, install them:

```sh
npm install datocms-react-ui datocms-plugin-sdk react react-dom
```

React 18 or 19, and `datocms-plugin-sdk` 2.2.7 or later, are peer
dependencies. Import the CSS once, and each component from its own path:

```tsx
import 'datocms-react-ui/styles.css';
import Canvas from 'datocms-react-ui/Canvas';
import Button from 'datocms-react-ui/Button';
```

There is no root import (`from 'datocms-react-ui'`): a plugin bundles only
the components that it imports.

## Put a Canvas around each hook

Put a `Canvas` around the content of each hook that renders in a frame,
with the `ctx` of the hook:

```tsx
connect({
  renderPage(pageId, ctx) {
    render(
      <Canvas ctx={ctx}>
        <MyPage />
      </Canvas>,
    );
  },
});
```

`useCtx()` gives the `ctx` of the nearest `Canvas`, with the type that you
give: `useCtx<RenderPageCtx>()`.

| From the host | What `Canvas` does |
| - | - |
| `ctx.cssDesignTokens` | Writes the color tokens on its element, and again around the content of each menu, tooltip and dialog (they render at the end of the body). The host keeps the colors up to date, even for an old plugin. |
| `ctx.colorScheme` | Sets `data-color-scheme` on its element. |
| `ctx.bodyPadding` | Is the padding of its element. |
| `ctx.ui.locale` | Is the language of the texts of the components (plurals, numbers). The texts are in English. |
| `ctx.ui.dateFormat`, `timezone`, `twentyFourHour` | Are the date settings of [`SmartDate`](https://react-ui.datocms.com/Content/SmartDate.md), the time cells of [`Table`](https://react-ui.datocms.com/Lists/Table.md) and `useDateSettings`. |
| `ctx.notice`, `ctx.alert`, `ctx.customToast`, `ctx.openConfirm` | Show the notifications and ask the questions of the components. See "Notifications and dialogs" below. |
| `ctx.navigateTo`, `ctx.location` | Are the router of the links. See "Navigation" below. |
| The frame | Starts the auto-resizer of the frame. |

A host that is older than the date settings gives only `locale`. Then the
date format is the first one of DatoCMS for that language (`MM/dd/yyyy`
for English, `dd/MM/yyyy` for most of the others), the time zone is the one
of the browser, and the clock has 24 hours for English only, as in DatoCMS.

The auto-resizer sets the height of the frame to the height of the
content. Give `noAutoResizer` when the plugin sets the height of its frame
itself.

## Dark mode and custom colors

The tokens of the "Color tokens" page have a light and a dark value, and
the host gives the values of the color scheme of the user. So a plugin
that uses only the tokens follows the color scheme with no code.

The SDK sets `data-color-scheme` (`light` or `dark`) and the `color-scheme`
property on the `html` element of the frame. Use them for a color that no
token gives: a brand color, the colors of a chart. Define the color once
for each scheme:

```css
.my-plugin {
  --my-brand: #4a90e2;
}

[data-color-scheme="dark"] .my-plugin {
  --my-brand: #6aa9ec;
}
```

`light-dark(#4a90e2, #6aa9ec)` gives the same result in one declaration.
For a choice outside the CSS (a logo, the theme of a library), read
`ctx.colorScheme`:

```tsx
<img src={ctx.colorScheme === 'dark' ? logoDark : logoLight} alt="Acme" />
```

**Do:** Use a token when a token has the role: it follows the color scheme and the brand hue of the project.

`color: var(--color--ink-danger);`

**Don’t:** Do not write a fixed color for a role of the interface: it does not change in dark mode.

`color: #d63c3c;`

## Texts

A prop with a text takes a `Message`:

- a string: plain text;
- `{ id, values }`: a key of the `texts` of `Canvas`, with its values;
- `{ html }`: markup, sanitized;
- an element.

A string is never markup: it is safe for a text that a user writes. In
`{ html }`, the component removes the unsafe parts (a script, an `onerror`
attribute).

A prop that goes in an attribute (`ariaLabel`, a tooltip) takes a
`TextMessage`: a string or `{ id, values }`.

The `texts` prop of `Canvas` gives more texts, by key:

- a key of the components (also a key of [`ContextInspector`](https://react-ui.datocms.com/Plugin/ContextInspector.md), such as
  `contextInspector.runExample`) gets a new text, even an aria text: for
  example `{ 'spinner.label': 'Caricamento' }`. The keys of the components
  autocomplete;
- a key of the plugin gives the text of a `{ id: 'my.key', values }`
  message.

```tsx
const texts = {
  'clipboard.copy': 'Copy the token',
  'myPlugin.pending': '{count, plural, one {# record} other {# records}} wait',
};

<Canvas ctx={ctx} texts={texts}>
  <Callout title={{ id: 'myPlugin.pending', values: { count: 1200 } }}>
    Publish them before the end of the day.
  </Callout>
</Canvas>
```

The texts use the ICU syntax: `{name}` for a value,
`{count, plural, one {# record} other {# records}}` for a plural. In a
plural, write the number as `#`, not as `{count}`: so it gets the
separators of the language of `ctx.ui.locale`. A text with an error, or with
a value that is not given, shows the text as it is, and a key with no text
shows the key: they do not stop the render.

**Do:** Give a stable texts map: a constant, or a value of useMemo.

`const texts = { 'clipboard.copy': 'Copy the token' };`

**Don’t:** Do not write a new texts object in the render: each new object renders the plugin again.

`<Canvas ctx={ctx} texts={{ 'clipboard.copy': 'Copy' }}>`

## Navigation

The links of the components ([`Link`](https://react-ui.datocms.com/Navigation/Link.md), [`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md), a [`Table`](https://react-ui.datocms.com/Lists/Table.md) row with `to`, the
items of [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md)) go through the router of `Canvas`. By default it is the
router of DatoCMS:

- A `to` is a path of DatoCMS, with the environment.
- A click calls `ctx.navigateTo`, which always adds an entry to the
  history.
- The `href` is the full URL of the page on the internal domain of the
  project, so a middle click opens it in a new tab.
- In a page and in an inspector, `ctx.location` makes the link of the open
  page active. In the other hooks, no link is active unless you
  give `active`.

A plugin with a router of its own gives a `NavigationAdapter` to the
`navigation` prop. Then a `to` is a URL of the plugin:

- `navigate(to, { replace })` opens a page. [`Link`](https://react-ui.datocms.com/Navigation/Link.md) calls it on a plain
  click, the hot keys and the menus call it from code.
- `location` is the current URL (`pathname` and `search`). The components
  find the active link, the active tab and the open row from it.
- `href(to)` gives the `href` of a link. Without it, the `href` is `to`.

A `to` is always a URL as a string: the path with its query
(`"/editor?tab=fields"`).

```tsx
import Canvas, { type NavigationAdapter } from 'datocms-react-ui/Canvas';

function Root({ ctx }: { ctx: RenderPageCtx }) {
  const [location, setLocation] = useState({ pathname: '/', search: '' });

  // The plugin keeps its location in its state
  const navigation = useMemo<NavigationAdapter>(
    () => ({
      location,
      navigate: (to) => {
        const [pathname, query] = to.split('?');
        setLocation({ pathname, search: query ? `?${query}` : '' });
      },
    }),
    [location],
  );

  return (
    <Canvas ctx={ctx} navigation={navigation}>
      <MyPage />
    </Canvas>
  );
}
```

**Do:** Give a stable navigation object: a value of useMemo.

`const navigation = useMemo<NavigationAdapter>(() => ({ location, navigate }), [location]);`

**Don’t:** Do not write a link of DatoCMS with an onClick: give it a to.

`<Button onClick={() => ctx.navigateTo('/editor')} />`

## Notifications and dialogs

The components do not draw a toast or a confirm dialog in the frame. When a
component says something to the user or asks a question (for example
[`ContextInspector`](https://react-ui.datocms.com/Plugin/ContextInspector.md), when an example fails), `Canvas` sends it to the host,
and the host draws it above the whole page:

| The component shows | The host calls |
| - | - |
| A confirmation of success | `ctx.notice` |
| A warning | `ctx.customToast` of type `warning` |
| An error | `ctx.alert` |
| A question | `ctx.openConfirm` |

The host shows plain text only: the markup of a `Message` goes away there.

To say something to the user from the code of the plugin, call the methods
of `ctx` yourself: `ctx.notice`, `ctx.alert`, `ctx.customToast` (also with
a button: `cta`) and `ctx.openConfirm`.

**Do:** Tell the user through the host: call the methods of ctx.

`await ctx.notice('The settings are saved');`

**Don’t:** Do not draw a toast or a confirm dialog of your own in the frame: the host draws them above the whole page.

`<Modal title="Are you sure?">…</Modal>`

## Icons

react-ui ships no icons. The plugin brings its own: an icon library, or SVG
files. A prop that takes an icon (the `icon` of [`Button`](https://react-ui.datocms.com/Actions/Button.md)) takes a component
that renders an `svg` and takes the props of an `svg`:

```tsx
import AddIcon from './icons/add.svg?react';

<Button label="Add a record" icon={AddIcon} />
```

The few icons that the components draw themselves (a chevron, a caret, a
cross, a grip) are in the bundle. The examples of this site import their
icons from `@/icons`. It stands for the icons of the plugin.

An icon takes the color of the text around it (`currentColor`): the
components set its color in each state, and the icon follows. Filled and
outline icon sets both work, and an outline icon stays an outline. We tested
Lucide, Tabler, Heroicons, react-icons, Phosphor and Material icons. Draw
the icon with `currentColor`, not with a fixed color, or it keeps that color
in all the states.

