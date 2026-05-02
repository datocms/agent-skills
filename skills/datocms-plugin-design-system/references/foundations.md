# Foundations

Use this file first for every restyle. It contains the decisions that make a plugin read as “DatoCMS” before any component choice.

## Contents

- Typography
- Spacing scale
- Borders, radii, and shadows
- Transitions and motion
- Color system
- What Canvas actually injects
- Theme bridging pattern
- Native-feel heuristics
- Default implementation choices

## Typography

Primary sources:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_base.css`
- <https://www.datocms.com/docs/plugin-sdk/react-datocms-ui>

### Font families

- Base UI font: `var(--base-font-family)`
- Monospace: `var(--monospaced-font-family)`
- Default body text size: `var(--font-size-m)`

Do not introduce an unrelated font stack for plugin UI. Let Canvas supply the same font family the CMS uses.

### Canonical font sizes

| Token | Approx px | Typical use |
| - | -: | - |
| `--font-size-xxs` | 11 | tiny badges and compact metadata |
| `--font-size-xs` | 12 | field meta, small labels |
| `--font-size-s` | 14 | hints, secondary metadata |
| `--font-size-m` | 15 | default body and inputs |
| `--font-size-l` | 17 | toolbar titles, emphasized row labels |
| `--font-size-xl` | 19 | section titles and modal titles |
| `--font-size-xxl` | 25 | occasional big headings |
| `--font-size-xxxl` | 30 | page titles |

Page titles in the CMS often go larger than the token scale with custom CSS. Plugins should only do that for true page headers, not for panels or modals.

### Font weight

`--font-weight-bold` resolves to `500`, not the browser default `700`. Use this token for all bold text to match the CMS typographic weight.

## Spacing scale

Primary source: `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css`

`--space-unit` is `12px` in the CMS but is **not injected by Canvas** into plugin iframes. Plugins receive the computed tokens (`--spacing-s` through `--spacing-xxxl`) but not `--space-unit` itself. If you need it in raw CSS, define it locally:

```css
:root { --space-unit: 12px; }
```

Most plugin-safe spacing is built from the token scale below.

| Token | Approx px | Typical use |
| - | -: | - |
| `--spacing-s` | 6 | label/hint gaps, compact inline separation |
| `--spacing-m` | 12 | default inner spacing |
| `--spacing-l` | 24 | form field gaps, card padding, page padding on smaller shells |
| `--spacing-xl` | 36 | larger sections and boxed groups |
| `--spacing-xxl` | 60 | major empty-state or page spacing |
| `--spacing-xxxl` | 96 | very large isolation only |

### Default rhythm rules

- Standard form field stack: `var(--spacing-l)` between fields
- Section-to-section distance in full pages: about `calc(4 * var(--space-unit))`
- Toolbar internal gap: `var(--spacing-m)` or `var(--spacing-l)`
- Sidebar panel content padding: around `20px`

## Borders, radii, and shadows

Primary sources:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_button.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Dropdown.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Modal.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_SidebarPanel.css`

### Borders

- Default border is `1px solid var(--border-color)`
- DatoCMS usually relies on border hierarchy before shadow hierarchy
- Divider lines are preferred over decorative surface layers

### Radii

- Normal radii are `3px`, `4px`, or `5px`
- Default to `4px` unless a component already defines a better fit
- Avoid large rounded shells

### Shadows

- Use subtle shadow only for dropdowns, modals, or specific elevated boxes
- Tables, forms, and panels often need no shadow at all
- If a box reads correctly with border + spacing, stop there

## Transitions and motion

Primary sources:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_button.css`

### Easing curves

- Default easing: `var(--material-ease)` = `cubic-bezier(0.55, 0, 0.1, 1)` — used across 50+ CMS files
- Secondary easing: `var(--inertial-ease)` = `cubic-bezier(0.19, 1, 0.22, 1)` — fast entrance/exit

### Duration and patterns

- Default duration: `0.2s`
- Button hover: `opacity 0.2s var(--material-ease)`, hover `0.8`, active `0.7`
- Input focus: `border-color 0.2s var(--material-ease)`
- Dropdown/popover: fade in with `opacity 0.2s var(--material-ease)`

Only animate hover, focus, and state-toggle properties. Do not animate layout shifts or reflows.

## Color system

Primary sources:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/store/subscribers/listenToChangeThemeCssVars.ts`
- `node_modules/datocms-plugin-sdk/dist/types/ctx/base.d.ts`

### Core text and surface colors

- `--base-body-color` for primary text
- `--light-body-color` for secondary text and helper copy
- `--placeholder-body-color` for placeholders only
- `--light-bg-color` and `--lighter-bg-color` for quiet surfaces
- `--border-color` and `--darker-border-color` for structure

### Semantic colors

- `--alert-color` for destructive or invalid states
- `--warning-color` and `--warning-bg-color` for caution
- `--notice-color`, `--add-color`, `--remove-color` for success/change states

### Project theme colors

Canvas exposes:

- `--accent-color`
- `--primary-color`
- `--light-color`
- `--dark-color`

And `ctx.theme` gives the same values as runtime data.

Use theme colors as accents, not as a reason to repaint the whole plugin. The CMS still reads primarily as neutral surfaces + structured borders.

### OKLCH and derived colors

DatoCMS uses OKLCH internally for color manipulation. Plugins should use `color-mix(in oklch, ...)` for derived colors:

```css
.focusRing {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent-color) 10%, white);
}

.subtleBg {
  background: color-mix(in oklch, var(--primary-color) 8%, transparent);
}
```

For simple transparency, use the `-rgb-components` suffix variants instead:

```css
.overlay {
  background: rgb(var(--accent-color-rgb-components) / 0.15);
}
```

## What Canvas actually injects

Source: `datocms-react-ui/src/generateStyleFromCtx/index.ts` and `datocms-react-ui/src/Canvas/index.tsx`.

Not every CMS CSS variable is available inside a `<Canvas>` plugin iframe. The lists below are authoritative.

### Available inside Canvas

**Colors:** `--base-body-color`, `--light-body-color`, `--placeholder-body-color`, `--light-bg-color`, `--lighter-bg-color`, `--disabled-bg-color`, `--border-color`, `--darker-border-color`, `--alert-color`, `--warning-color`, `--notice-color`, `--warning-bg-color`, `--add-color`, `--remove-color`

**Theme:** `--primary-color`, `--accent-color`, `--light-color`, `--dark-color`, `--semi-transparent-accent-color`

**Typography:** `--base-font-family`, `--monospaced-font-family`, `--font-weight-bold`, all `--font-size-*` tokens

**Spacing:** all `--spacing-*` and `--negative-spacing-*` tokens

**Easing:** `--material-ease`, `--inertial-ease`

**RGB variants:** each color above also has a `-rgb-components` suffix variant

### NOT available (CMS-only)

These variables exist in the CMS but Canvas does **not** inject them into plugin iframes:

- `--space-unit`, `--px-to-rem`, `--cursive-font-family`, `--muted-color`
- `--backdrop-color`, `--backdrop-linear-gradient`
- `--slate-margin`, `--slate-list-margin`, `--slate-panel-box-shadow`
- `--base-distance-for-subtle-decoration-elements`

Using a CMS-only variable in plugin CSS will silently resolve to its initial value (usually `0` or empty), producing broken layouts with no error.

## Theme bridging pattern

Use Canvas variables first. Only mirror `ctx.theme` into custom vars when you need a local token name.

```tsx
import type { CSSProperties } from 'react';

const style = {
  '--plugin-accent': ctx.theme.accentColor,
  '--plugin-primary': ctx.theme.primaryColor,
} as CSSProperties;

return (
  <Canvas ctx={ctx}>
    <div style={style} className={styles.wrapper}>
      ...
    </div>
  </Canvas>
);
```

```css
.wrapper {
  color: var(--base-body-color);
}

.linkLike {
  color: var(--plugin-accent, var(--accent-color));
}
```

## Native-feel heuristics

If a plugin does not feel native, check these before changing components:

1. Is the spacing too loose?
2. Is the title size too big for the surface?
3. Are there too many boxed areas?
4. Is color doing the work that borders should do?
5. Is the main action obvious without turning every button primary?
6. Are helper texts and labels aligned like the CMS?
7. Did a modal or panel become a mini dashboard for no reason?

## Default implementation choices

- Use CSS Modules or plugin-local CSS files, not imported CMS class names
- Use `var(--font-size-m)` and `var(--spacing-l)` as the default body rhythm
- Use `var(--light-body-color)` for helper copy
- Use `var(--border-color)` for most structural boundaries
- Use `var(--accent-color)` for focused, selected, or linked affordances
- Reserve `var(--alert-color)` for real destructive or invalid states
