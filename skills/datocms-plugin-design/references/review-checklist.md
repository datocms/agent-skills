# Review checklist

Run over the finished UI. Each item is checkable by reading the code; the page in brackets owns the rule (`docs/` + path + `.md`).

## Setup

- [ ] `package.json` pins `datocms-react-ui` 4 (`4.0.0-next.8` while `latest` is below 4); no `overrides` block for it. \[`Plugin/Canvas`]
- [ ] `import 'datocms-react-ui/styles.css'` exactly once, in the entry file. \[`Plugin/Canvas`]
- [ ] No `from 'datocms-react-ui'` root import; no `datocms-react-ui/ui-public/`, `/internal/`, `/react-ui/` paths. \[`Plugin/Canvas`]
- [ ] `tsconfig.json` `moduleResolution` is `bundler`, `node16` or `nodenext`.
- [ ] Every `render(...)` in a frame hook wraps its content in `<Canvas ctx={ctx}>`; `noAutoResizer` only where the code calls `ctx.setHeight`. \[`Plugin/Canvas`]
- [ ] No `ContextInspector` left in shipped code. \[`Plugin/ContextInspector`]
- [ ] Canvas `texts` and `navigation` are module constants or `useMemo` values. \[`Plugin/Canvas`]

## Surface and frame

- [ ] Config screen: first element is content, not a heading, `Page.SectionTitle`, `<hr>` or divider. (`surfaces.md`, Config screen)
- [ ] Sidebar panel: no `SidebarPanel` or title inside; the host draws it. (`surfaces.md`, Sidebar panel)
- [ ] Field editor: no label or error re-drawn; the input has `aria-label` from `ctx.field.attributes.label`; `ctx.disabled` honoured. (`surfaces.md`, Field editor)
- [ ] `renderModal` content: `Modal.Body` + `Modal.Footer`, no title or cross of its own, no `Modal` inside; ghost Cancel first, calling `ctx.resolve(null)`. \[`Overlays/Modal`]
- [ ] Asset source: no title of its own; a pick calls `ctx.select`. (`surfaces.md`, Asset source)
- [ ] `Pane` / `ListDetail.Page` only in Fixed frames (page, inspector, full sidebar, fullWidth modal); `SplitPane` / `ListFormPage` inside a parent with a set height. (`surfaces.md`, Frame facts)
- [ ] No outer padding added around Canvas content (Canvas applies `ctx.bodyPadding`).
- [ ] `Main` only in `renderPage` and `renderInspector`. \[`Layout/Landmarks`]

## Color and size

- [ ] Every color is `var(--color--…)` or `var(--shadow--…)`; no hex, `rgb()`, named colors or `--wash-*`/`--pigment-*` primitives for interface roles. \[`Foundations/Colors`]
- [ ] No element mixes two contexts; tone inks and fills sit on neutral surfaces; no text in `--color--ink-muted` or a `fill` token. \[`Foundations/Colors`]
- [ ] Selected or active rows, cards, chips and choices use the `--color--selected--*` family together, never `primary`; disabled text is `--color--ink-disabled`. \[`Foundations/Colors`]
- [ ] No custom property that only renames a token, no `color-mix()` to fake hierarchy, hover or disabled states. \[`Foundations/Colors`]
- [ ] `grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' src/` and `grep -rnE 'style=.*(color|background|border)' src/` find only plugin-only colors with a dark value; SVG icons use `fill="currentColor"`/`stroke="currentColor"`. \[`Plugin/Canvas`]
- [ ] Plugin-only colors (brand, chart) have a value per scheme (`[data-color-scheme="dark"]` or `light-dark()`). \[`Plugin/Canvas`]
- [ ] Spacing, font sizes, weights, radii use `:root` variables; no `--spacing-xs`, `--font-size-s`, `--border-color`, `--accent-color`, `--*-rgb-components`; no numeric `font-weight`. \[`Foundations/CssVariables`]
- [ ] No component variable set to restyle a component; `className` only for margin/alignment. \[`Foundations/CssVariables`]
- [ ] No hand-written component classes (`button`, `Toolbar__*`, `CardList__*`) beyond the ones a page hands out. \[component page]

## Components and layout

- [ ] Each component used: its page was read and its first example followed; every prop exists in the installed `.d.ts`. \[component page]
- [ ] No hand-made lookalike of an existing component (custom card list, tab bar, toast, switch, empty state). \[`Lists/InfoList` chooser, component pages]
- [ ] No `<main>`, `<nav>`, `<aside>`, `role="search"`, `<h1>`–`<h6>`, `<section>` in JSX. \[`Layout/Landmarks`]
- [ ] Heading levels explicit and never skipped (`level`, `titleLevel`); headings only inside `Main` or a dialog. \[`Layout/Landmarks`, `Layout/SidebarPanel`]
- [ ] No `Page.Group` inside `Page.Section` or another group. \[`Layout/Page`]
- [ ] Icons are the plugin's, drawn with `currentColor`; component-typed `icon` props get a component, element-typed ones an element. \[`Plugin/Canvas`]
- [ ] `localStorage` keys (`useLocalStorageSidebarPanelOpen`, `useLocalStorageTableLayout`) start with the plugin name. \[`Layout/SidebarPanel`, `Lists/Table`]

## Forms

- [ ] Every input inside a `FieldWrapper` (field editors excepted: host draws the field); errors via `error`, hints via `hint`. \[`Forms/FieldWrapper`]
- [ ] Inputs controlled; `onChange` handlers take the value, not `event.target.value`; text state typed `string | null`. \[`Forms/Form`]
- [ ] `SelectInput` state holds the option `value` string(s); async options via `useAsyncSelectOptions`. \[`Forms/SelectInput`]
- [ ] Each `SwitchInput` has its own `label`; its `FieldWrapper` has no `label`. \[`Forms/ChoiceInputs`]
- [ ] 2–5 options → `RadioGroupInput`, more → `SelectInput`; 2–4 immediate options → `SegmentedControl`. \[`Forms/ChoiceInputs`, `Navigation/SegmentedControl`]
- [ ] Placeholders show an example, never instructions. \[`Forms/TextInputs`]

## Actions and feedback

- [ ] One `tone="primary"` per place. \[`Actions/Button`]
- [ ] No `size` or `expand` forced on buttons beyond what a page asks; icon-only `Button` is `tone="ghost" size="micro"` with a `label`. \[`Actions/Button`]
- [ ] Destructive actions last, after `Dropdown.Separator`, `alert`/`ghost-alert`, confirmed by `ctx.openConfirm`. \[`Actions/Button`, `Actions/Dropdown`]
- [ ] Each element does one thing: one of `onClick`/`onPick`, `to`, `href`, `action`. \[`Actions/Button`]
- [ ] CMS links use `to`, not `onClick={() => ctx.navigateTo(...)}`. \[`Navigation/Link`]
- [ ] Keyboard shortcuts registered with `useRegisterActions` and shown by id; no key names in labels. \[`Actions/Actions`]
- [ ] Toasts and confirms via `ctx.notice`/`ctx.alert`/`ctx.customToast`/`ctx.openConfirm`, `notice` and `alert` not awaited; no in-frame toast or confirm `Modal`. \[`Plugin/Canvas`]
- [ ] States covered: spinner only before the first load; empty → `BlankSlate`/`EmptySlot`; error → `BlankSlate` `error`; no results ≠ empty. \[`Feedback/BlankSlate`, `Lists/EmptySlot`, `Layout/ListOrOverview`]
- [ ] Disabled controls give `disabled={{ reason }}`; no `Tooltip` around a disabled button; inapplicable actions hidden. \[`Actions/Button`]
- [ ] `Callout` holds text and links only, no buttons. \[`Feedback/Callout`]

## Accessibility and copy

- [ ] Icon-only controls named by `label`, not wrapped in `Tooltip`. \[`Actions/Button`]
- [ ] Landmarks named for what they hold (`Pane ariaLabel`, `Nav ariaLabel`). \[`Layout/Landmarks`, `Layout/Pane`]
- [ ] No meaning carried by color or hover alone (dots have a word, hover controls reachable by keyboard). \[`Content/Status`]
- [ ] Dates through `SmartDate`/`useDateSettings`, never `toLocaleDateString`. \[`Content/SmartDate`]
- [ ] Copy: sentence case, short labels, ICU plurals with `#`, blank-slate titles like "No webhooks yet". \[`Plugin/Canvas`, `Feedback/BlankSlate`]
- [ ] Every hook rendered in `connect()` checked in light and dark mode (config save, field render, modal resolve, asset select, page scroll, panel resize).
