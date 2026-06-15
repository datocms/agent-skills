# Raw CSS Fallbacks

Use these patterns when `datocms-react-ui` does not expose the exact shell you need. These snippets are plugin-safe: they rely on Canvas variables and local class names only.

### Canvas variable warning

`--space-unit` is **not** injected by Canvas into plugin iframes. Several snippets below use it for CMS-accurate spacing. Add this local definition at the top of your plugin CSS to avoid silent `0` values:

```css
:root { --space-unit: 12px; }
```

## Contents

- Wrapper defaults
- Local section shell
- Config screen shell
- Simple field shell
- Toolbar shell
- Sidebar panel shell
- Table shell
- Blank slate shell
- Disabled controls
- Split shell
- Transition defaults
- Do not do this in plugins

## Wrapper defaults

```css
.wrapper {
  color: var(--color--ink);
  font-family: var(--base-font-family);
  font-size: var(--font-size-m);
  line-height: 1.5;
}
```

## Local section shell

```css
/* --space-unit is NOT injected by Canvas; define :root { --space-unit: 12px; } locally */
.section {
  margin-block: calc(4 * var(--space-unit));
}

.section:first-child {
  margin-top: 0;
}

.sectionTitle {
  display: flex;
  align-items: center;
  gap: var(--spacing-m);
  margin-bottom: var(--spacing-l);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.sectionTitle::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color--border);
}
```

## Config screen shell

```css
.page {
  max-width: 650px;
  margin: 0 auto;
  padding: var(--spacing-l);
}

.pageHeader {
  display: flex;
  align-items: center;
  gap: var(--spacing-m);
  margin-bottom: calc(4 * var(--space-unit)); /* requires local --space-unit: 12px */
}

.pageTitle {
  font-size: calc(35 * 0.0625rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.pageExplainer {
  color: var(--color--ink-subtle);
  margin-bottom: var(--spacing-s);
}

.actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-items: center;
}
```

## Simple field shell

```css
.field {
  margin-bottom: var(--spacing-l);
}

.label {
  display: block;
  margin-bottom: var(--spacing-s);
}

.input,
.textarea,
.select {
  width: 100%;
  padding: 10px;
  font: inherit;
  color: inherit;
  background: var(--color--surface);
  border: 1px solid var(--color--border);
  border-radius: 4px;
  box-sizing: border-box;
  transition: border-color 0.2s var(--material-ease);
}

.input:focus,
.textarea:focus,
.select:focus {
  border-color: var(--color--focus--border);
  box-shadow: 0 0 0 3px var(--color--focus--outline);
  outline: none;
}

.hint {
  margin-top: var(--spacing-s);
  color: var(--color--ink-subtle);
  font-size: var(--font-size-s);
  line-height: 1.2;
}

.error {
  margin-top: var(--spacing-s);
  color: var(--color--danger-soft--ink);
  font-size: var(--font-size-s);
  line-height: 1.2;
}
```

## Toolbar shell

```css
.toolbar {
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: var(--spacing-m);
  border-bottom: 1px solid var(--color--border);
  padding-inline: var(--spacing-m);
  box-sizing: border-box;
}

.toolbarTitle {
  font-size: var(--font-size-l);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.toolbarSpacer {
  flex: 1;
}

.toolbarMeta {
  color: var(--color--ink-subtle);
  font-size: var(--font-size-s);
}
```

## Sidebar panel shell

```css
.sidebarPanel {
  border-bottom: 1px solid var(--color--border);
}

.sidebarPanelHeader {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 20px;
  background: var(--color--surface-muted);
  border: 0;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.sidebarPanelBody {
  padding: 20px;
  background: var(--color--surface);
}
```

## Table shell

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 10px 20px;
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color--border);
}

.table th {
  color: var(--color--ink-subtle);
  font-weight: normal;
  font-size: 0.9em;
}
```

## Blank slate shell

```css
.blankSlate {
  padding: var(--spacing-xl);
  text-align: center;
}

.blankSlateTitle {
  margin-bottom: var(--spacing-m);
  color: var(--color--ink);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.blankSlateDescription {
  max-width: 500px;
  margin: 0 auto var(--spacing-l);
  color: var(--color--ink-subtle);
}
```

## Disabled controls

```css
.input:disabled,
.textarea:disabled,
.select:disabled {
  background: var(--color--disabled--surface);
  cursor: not-allowed;
  opacity: 0.6;
}

.buttonDisabled {
  background: var(--color--disabled--surface);
  color: var(--color--disabled--ink);
  cursor: not-allowed;
}
```

## Split shell

```css
.splitRoot {
  display: flex;
  min-height: 100%;
}

.splitPrimary,
.splitSecondary {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.splitPrimary {
  flex: 1;
}

.splitSecondary {
  width: min(420px, 40%);
  border-left: 1px solid var(--color--border);
}

.splitBody {
  flex: 1;
  overflow: auto;
}
```

Use this only when `VerticalSplit` is unavailable or too rigid for the target plugin.

## Transition defaults

```css
.button {
  transition: opacity 0.2s var(--material-ease);
}

.button:hover {
  opacity: 0.8;
}

.button:active {
  opacity: 0.7;
}
```

Use `0.2s` and `var(--material-ease)` as the default transition for interactive elements. Apply transitions to hover, focus, and state-toggle properties only.

## Do not do this in plugins

- import CMS bundle CSS
- reuse private class names like `.Page__title` or `.SidebarPanel__header`
- hardcode a new color system unrelated to Canvas vars
- define local color or shadow aliases that only rename Canvas tokens
- use `color-mix(...)` to simulate helper text, disabled text, selected rows, borders, focus rings, or status panels
- use primary or primary-soft tokens for selected/current/active rows, cards, chips, tabs, images, dropdown options, or picker choices
- mix context families, such as danger ink on a primary surface or selected ink on a warning surface
- bring in a generic dashboard template when a local wrapper is enough

Reach for `color-mix(...)` or local color variables only for real customization outside standard Canvas semantics: media overlays, charts, vendor widgets, artwork, or user-requested product colors.
