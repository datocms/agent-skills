# Dark mode upgrade

Use this reference when an existing plugin must move from legacy DatoCMS color variables or fixed color values to semantic color tokens. Source guide: <https://www.datocms.com/docs/plugin-sdk/upgrading-plugins-for-dark-mode>.

## Contents

- Workflow
- Static searches
- Legacy variable mapping
- Token selection rules
- Token vocabulary quick list
- Hardcoded colors and custom values
- Runtime theme migration
- Hook and surface discovery
- Browser verification

## Workflow

1. Make a task list before editing. Include dependency update, static searches, token migration, hook discovery, one verification task for each rendered surface, static re-checks, and build.
2. Upgrade `datocms-react-ui` and `datocms-plugin-sdk` with the project package manager. Use `npm install datocms-react-ui@latest datocms-plugin-sdk@latest` only for npm projects.
3. Search `src/` for deprecated variables, hardcoded colors, inline color styles, `ctx.theme` color usage, and fixed SVG fills.
4. Replace legacy variables and hardcoded colors with semantic `--color--...` tokens chosen by meaning, not by visual similarity.
5. Inspect the top-level `connect()` call, discover the hooks the plugin registers, then add one verification task per distinct rendered surface.
6. Verify every surface in dark mode with the browser workflow available in the environment. Screenshots are useful only for visual inspection; use DOM snapshots or page state checks for navigation and setup.
7. Re-run static searches and the plugin build. Remaining color literals should be intentional custom colors with dark-mode overrides.

## Static searches

```bash
grep -rn --include="*.css" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
  -E "(--accent-color|--primary-color|--light-color|--dark-color|--semi-transparent-accent-color|--base-body-color|--light-body-color|--placeholder-body-color|--light-bg-color|--lighter-bg-color|--disabled-bg-color|--border-color|--darker-border-color|--alert-color|--warning-color|--notice-color|--warning-bg-color|--add-color|--remove-color)" \
  src/

grep -rn --include="*.css" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()" \
  src/

grep -rn --include="*.tsx" --include="*.jsx" -E "style=.*(color|background|border)" src/

grep -rn --include="*.tsx" --include="*.jsx" --include="*.svg" -E 'fill="(?!currentColor|none)' src/

grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" -E "ctx\.theme|cssDesignTokens|colorScheme" src/
```

Legitimate non-color hits can remain: `color: inherit`, `background-color: transparent`, `currentColor`, and token definitions for custom colors that include a dark-mode override.

## Legacy variable mapping

Use this table as the common-case starting point. If the CSS property or component role says something more specific, prefer the semantic token that matches the actual use.

| Legacy variable | Common replacement |
| - | - |
| `--base-body-color` | `--color--ink` |
| `--light-body-color` | `--color--ink-subtle` |
| `--placeholder-body-color` | `--color--ink-placeholder` |
| `--light-bg-color` | `--color--surface-muted` |
| `--lighter-bg-color` | `--color--surface-muted` |
| `--disabled-bg-color` | `--color--disabled--surface` |
| `--border-color` | `--color--border` |
| `--darker-border-color` | `--color--border-hover` |
| `--alert-color` as text or border | `--color--danger-soft--ink` or `--color--danger-soft--border` |
| `--alert-color` as background | `--color--danger-soft--surface` |
| `--warning-color` | `--color--warning-soft--ink` |
| `--warning-bg-color` | `--color--warning-soft--surface` |
| `--notice-color` | `--color--success-soft--ink` |
| `--add-color` as background | `--color--diff-added--surface` |
| `--remove-color` as background | `--color--diff-removed--surface` |
| `--accent-color` as text or link | `--color--ink-link` |
| `--accent-color` as background | `--color--primary--surface-secondary` |
| `--accent-color` as hover or focus border | `--color--focus--border` |
| `--semi-transparent-accent-color` | `--color--focus--outline` |
| `--primary-color` | `--color--primary--surface` |
| `--light-color` | `--color--primary-soft--surface` |
| `--dark-color` as background | `--color--primary--surface-secondary` |
| `--dark-color` as text | `--color--primary--ink` |

## Token selection rules

- Pair surfaces with ink from the same context. Do not put `--color--primary--ink` on a danger, warning, selected, stacked, overlay, tooltip, or code surface.
- Use neutral tokens for normal content: `--color--surface`, `--color--surface-muted`, `--color--surface-raised`, `--color--ink`, `--color--ink-subtle`, `--color--ink-placeholder`, `--color--border`, `--color--border-hover`.
- Use `--color--primary--surface` with `--color--primary--ink` only for primary actions or strong branded surfaces.
- Use `--color--primary-soft--surface` with `--color--primary-soft--ink` for quiet branded buttons, chips, or selected controls that are not the main action.
- Use `--color--selected--surface`, `--color--selected--ink`, and `--color--selected--border` for active entries in lists, trees, and galleries.
- Use `--color--disabled--surface` and `--color--disabled--ink` for disabled controls.
- Use `--color--danger-soft--*`, `--color--warning-soft--*`, and `--color--success-soft--*` for notices, validation, and status blocks.
- Use `--color--diff-added--*`, `--color--diff-removed--*`, and `--color--diff-changed--*` for comparison UIs.
- Use `--color--stacked--*` for dark inline panels, media uploaders, players, or nested dark surfaces.
- Use `--color--overlay--*` for scrims over media and `--color--tooltip--*` for tooltip surfaces.
- Use `--color--code--surface` and `--color--code--ink` for code blocks.
- Use `--color--focus--border` and `--color--focus--outline` for focus and selected-ring treatment.

## Token vocabulary quick list

Use this list when the mapping table is too coarse:

- Neutral: `--color--surface`, `--color--surface-hover`, `--color--surface-muted`, `--color--surface-raised`, `--color--surface-raised-hover`, `--color--surface-raised-active`, `--color--ink`, `--color--ink-subtle`, `--color--ink-hover`, `--color--ink-muted`, `--color--ink-placeholder`, `--color--ink-primary`, `--color--ink-link`, `--color--ink-danger`, `--color--ink-warning`, `--color--ink-success`, `--color--ink-disabled`, `--color--border`, `--color--border-hover`.
- Primary: `--color--primary--surface`, `--color--primary--surface-hover`, `--color--primary--surface-active`, `--color--primary--surface-muted`, `--color--primary--surface-secondary`, `--color--primary--ink`, `--color--primary--border`.
- Primary soft: `--color--primary-soft--surface`, `--color--primary-soft--surface-hover`, `--color--primary-soft--surface-active`, `--color--primary-soft--ink`, `--color--primary-soft--border`.
- Selected: `--color--selected--surface`, `--color--selected--surface-hover`, `--color--selected--ink`, `--color--selected--border`.
- Disabled: `--color--disabled--surface`, `--color--disabled--ink`.
- Danger: `--color--danger--surface`, `--color--danger--ink`.
- Focus: `--color--focus--border`, `--color--focus--outline`.
- Soft signals: `--color--danger-soft--surface`, `--color--danger-soft--ink`, `--color--danger-soft--border`, `--color--danger-soft--outline`, `--color--warning-soft--surface`, `--color--warning-soft--ink`, `--color--warning-soft--border`, `--color--warning-soft--outline`, `--color--success-soft--surface`, `--color--success-soft--ink`, `--color--success-soft--border`, `--color--success-soft--outline`.
- Diffs: `--color--diff-added--surface`, `--color--diff-added--outline`, `--color--diff-added--ink`, `--color--diff-added--ink-subtle`, `--color--diff-removed--surface`, `--color--diff-removed--outline`, `--color--diff-removed--ink`, `--color--diff-removed--ink-subtle`, `--color--diff-changed--surface`, `--color--diff-changed--outline`.
- Backdrop and overlay: `--color--backdrop--surface`, `--color--backdrop--ink`, `--color--overlay--surface`, `--color--overlay--surface-hover`, `--color--overlay--surface-active`, `--color--overlay--ink`.
- Stacked: `--color--stacked--surface`, `--color--stacked--surface-upper`, `--color--stacked--surface-action`, `--color--stacked--surface-action-hover`, `--color--stacked--surface-action-active`, `--color--stacked--ink`, `--color--stacked--ink-subtle`, `--color--stacked--border`.
- Other: `--color--highlight--surface`, `--color--progress--track`, `--color--progress--fill`, `--color--progress--fill-hover`, `--color--tooltip--surface`, `--color--tooltip--surface-hover`, `--color--tooltip--ink`, `--color--tooltip--ink-subtle`, `--color--code--surface`, `--color--code--ink`, `--color--scrollbar--fill`, `--color--status-draft--ink`, `--color--status-outdated--ink`, `--color--status-published--ink`.

## Hardcoded colors and custom values

Replace common fixed colors with tokens:

- muted gray text -> `--color--ink-subtle`
- body text -> `--color--ink`
- white page or panel background -> `--color--surface`
- light gray panel background -> `--color--surface-muted`
- gray borders -> `--color--border`
- selected list rows -> `--color--selected--surface` plus `--color--selected--ink`

Keep fixed colors only when they are genuinely custom, such as a brand illustration, data visualization palette, or third-party widget API. Define those as local custom properties and add a dark-mode override:

```css
.previewSwatch {
  --preview-swatch-border: #4a90e2;
  border-color: var(--preview-swatch-border);
}

[data-color-scheme="dark"] .previewSwatch {
  --preview-swatch-border: #6aa9ec;
}
```

## Runtime theme migration

- `ctx.theme` is legacy for color decisions because it is pinned to light-mode values. Do not use it to build new colors.
- Prefer CSS variables inside `<Canvas>`. They track the active DatoCMS theme automatically.
- Use `ctx.cssDesignTokens` only when a JavaScript API needs a concrete token value.
- Use `ctx.colorScheme` only for non-CSS branching: choosing an image asset, third-party widget theme, or syntax-highlighting theme.

```tsx
const syntaxTheme = ctx.colorScheme === 'dark' ? 'github-dark' : 'github-light';
const borderColor = ctx.cssDesignTokens['--color--border'];
```

## Hook and surface discovery

Search the entrypoint before browser verification:

```bash
grep -rE "overrideFieldExtensions|renderFieldExtension|renderPage|renderModal|renderAssetSource|renderItemFormSidebar|renderItemFormOutlet|renderManualFieldExtensionConfigScreen|customMarksForStructuredTextField|manualFieldExtensions" src/
```

Verify each registered surface, not just the first iframe that appears:

- `overrideFieldExtensions` / `renderFieldExtension`: create or open a record with a matching field type.
- `manualFieldExtensions` / `renderFieldExtension`: assign the plugin as the field editor, then open a record.
- `renderManualFieldExtensionConfigScreen`: open the field presentation settings for the assigned field.
- `renderPage`: open the custom page from the DatoCMS navigation.
- `renderModal`: trigger the UI path that calls `ctx.openModal()`.
- `renderAssetSource`: open the media picker and inspect the custom source.
- `renderItemFormSidebar` / `renderItemFormOutlet`: assign the plugin to the model surface, then open a record.
- Structured Text customizations: open a field configured with the target customization and inspect the toolbar, mark, block, or addon UI.

## Browser verification

Start the plugin dev server and use the printed localhost URL. If the default Vite port is busy, use the actual port from terminal output.

Install the local plugin into a disposable DatoCMS project or update its URL in an existing test project. Use the project’s normal CLI or CMA workflow; do not require a login if a bearer token plus `--api-token` can perform the setup.

In dark mode, check every rendered surface for:

- readable text and helper labels
- visible borders and dividers
- correct neutral, selected, disabled, warning, success, and danger surfaces
- visible hover and focus states
- modals, dropdowns, tooltips, and popovers opened from the plugin
- custom SVG icons inheriting text color through `currentColor`
- third-party widgets or custom visualizations using dark-mode-aware options

Finish with the project build script, usually `npm run build`, `pnpm build`, or `yarn build`.
