# Foundations

Use this file first for restyling work. It covers typography, spacing, borders, motion, and Canvas variables before component choice.

## Contents

- Typography
- Spacing scale
- Borders, radii, and shadows
- Transitions and motion
- Color system
- What Canvas actually injects
- Theme bridging pattern
- UI checks
- Default implementation choices

## Typography

Reference: <https://www.datocms.com/docs/plugin-sdk/react-datocms-ui>

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

### Borders

- Default border is `1px solid var(--color--border)`
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

### Core text and surface colors

Prefer the semantic `--color--...` tokens exposed by `<Canvas>`.

- `--color--ink` for primary text
- `--color--ink-subtle` for secondary text and helper copy
- `--color--ink-muted` for very de-emphasized copy
- `--color--ink-placeholder` for placeholders only
- `--color--ink-disabled` for disabled copy
- `--color--surface` for page background and neutral panels
- `--color--surface-muted` for quiet surfaces
- `--color--surface-hover` for hovered neutral rows and cards
- `--color--surface-raised` for dropdowns, modals, and popovers
- `--color--border` and `--color--border-hover` for structure

Use these tokens directly in normal plugin CSS. Do not create local aliases that only rename Canvas tokens, such as `--plugin-border: var(--color--border)` or `--text-light: var(--color--ink-subtle)`. Local custom properties are fine for real product customization, component sizing, spacing, or non-Canvas values.

### State colors

Use context pairs together:

- `--color--danger-soft--surface`, `--color--danger-soft--ink`, `--color--danger-soft--border` for destructive or invalid blocks
- `--color--warning-soft--surface`, `--color--warning-soft--ink`, `--color--warning-soft--border` for caution
- `--color--success-soft--surface`, `--color--success-soft--ink`, `--color--success-soft--border` for success
- `--color--primary--surface`, `--color--primary--ink`, `--color--primary--border` for the main action
- `--color--primary-soft--surface`, `--color--primary-soft--ink`, `--color--primary-soft--border` for quiet branded accents
- `--color--selected--surface`, `--color--selected--surface-hover`, `--color--selected--ink`, `--color--selected--border` for selected rows, cards, and choices
- `--color--disabled--surface` and `--color--disabled--ink` for disabled controls
- `--color--focus--outline` and `--color--focus--border` for focus rings

Do not mix ink from one context with surface from another. Context pairs are contrast-balanced together, especially in dark mode.

Selected/current/active choices are not primary actions. If a row, image card, chip, tab, dropdown option, model filter, icon choice, or picker option is chosen or currently active, use the selected family for its surface, ink, and border. Reserve primary tokens for the main submit/action button or an intentional brand accent, not for selection state.

### Project theme colors

The SDK still exposes legacy theme variables and `ctx.theme`, but new plugin CSS should use semantic Canvas tokens first. Use `ctx.colorScheme` only for non-CSS branching such as third-party widget themes, image assets, or syntax-highlighting presets.

### OKLCH and derived colors

DatoCMS uses OKLCH internally for color manipulation, but plugins should not recreate normal UI hierarchy with derived colors. Prefer semantic Canvas tokens for text hierarchy, selected states, disabled states, focus rings, borders, status surfaces, and standard elevation.

```css
.focusRing {
  box-shadow: 0 0 0 3px var(--color--focus--outline);
}

.caption {
  color: var(--color--ink-subtle);
}

.selectedRow {
  background: var(--color--selected--surface);
  color: var(--color--selected--ink);
  border-color: var(--color--selected--border);
}

.selectedRow:hover {
  background: var(--color--selected--surface-hover);
}
```

Use `color-mix(...)` only for intentional effects outside the default design system, such as media overlays, data visualization, vendor widgets, artwork, or a user-requested custom tint that cannot be expressed by semantic Canvas tokens.

## What Canvas actually injects

Source: `datocms-react-ui/src/generateStyleFromCtx/index.ts` and `datocms-react-ui/src/Canvas/index.tsx`.

`<Canvas>` applies `ctx.cssDesignTokens` verbatim and also keeps legacy theme variables for older plugins. Use semantic Canvas tokens by default.

### Available inside Canvas

For exact token names and descriptions, load `design-tokens.md`; it catalogs `ctx.cssDesignTokens` color/shadow tokens plus Canvas typography, spacing, easing/motion, and runtime theme variables available inside `<Canvas>`. These Canvas tokens and variables are the default variables for plugin UI; customize beyond them only for an explicit custom look or an effect they cannot express.

Quick selection guide:

- neutral UI: surface, ink, and border tokens
- primary/primary-soft: project brand actions and quiet brand accents
- selected/disabled/focus: interaction states
- danger, warning, success, diff, and status: keep each context family together
- overlay, backdrop, stacked, tooltip, code, progress, scrollbar, and field-group tokens: use only for their named surface type

**Typography:** `--base-font-family`, `--monospaced-font-family`, `--font-weight-bold`, all `--font-size-*` tokens

**Spacing:** all `--spacing-*` and `--negative-spacing-*` tokens

**Easing:** `--material-ease`, `--inertial-ease`

**Runtime theme:** `ctx.colorScheme` is `'light'` or `'dark'`; the SDK also sets `data-color-scheme` and CSS `color-scheme` on the document element.

## Theme bridging pattern

Use Canvas variables first. Do not bridge ordinary plugin UI through local aliases when the CSS can use `var(--color--...)` or `var(--shadow--...)` directly.

Only mirror runtime values into custom vars when a third-party component, vendor widget, or data visualization requires a local token name or concrete value.

```tsx
import type { CSSProperties } from 'react';

const style = {
  '--vendor-accent': ctx.cssDesignTokens['--color--primary--surface'],
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
  color: var(--color--ink);
}

.linkLike {
  color: var(--color--ink-link);
}
```

If a third-party library hoists portals or generated styles outside the `<Canvas>` scope, pass concrete values from `ctx.cssDesignTokens`. Use `ctx.colorScheme` only for non-CSS choices such as library mode flags, external widget presets, alternate assets, or syntax-highlighting themes.

## UI checks

Before changing components, check:

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
- Use `var(--color--ink-subtle)` for helper copy
- Use `var(--color--border)` for most structural boundaries
- Use `var(--color--focus--outline)` for focus rings
- Use paired state context tokens for destructive, warning, success, selected, or primary UI
