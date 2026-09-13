# Dark Mode Upgrade

Use this when an existing plugin must move from legacy theme variables, hardcoded colors, or light-only CSS to semantic Canvas tokens.

## Contents

- Upgrade scope
- Dependency baseline
- Find affected files
- Replace legacy variables
- Replace hardcoded colors
- Inline styles and SVGs
- Find rendered surfaces
- Static verification
- Manual acceptance checks

## Upgrade scope

Keep the change mechanical and complete:

1. Upgrade SDK/UI dependencies when the target plugin does not already expose semantic Canvas tokens.
2. Replace legacy Canvas variables and hardcoded colors with semantic Canvas tokens.
3. Verify every rendered plugin surface still reads correctly in light and dark mode.

Do not redesign the plugin unless the user also asked for a restyle. Preserve layout and behavior.

## Dependency baseline

Use the target plugin's package manager and existing dependency style. For fresh upgrades, prefer the latest compatible `datocms-plugin-sdk` and `datocms-react-ui` versions for the target project.

If the plugin uses npm and the task asks for the current release, run from the plugin folder:

```bash
npm install datocms-plugin-sdk@latest datocms-react-ui@latest
```

Only change dependencies that the plugin actually uses.

## Find affected files

Search source files, not generated output:

```bash
grep -rn \
  --include='*.css' --include='*.tsx' --include='*.ts' \
  --include='*.jsx' --include='*.js' \
  -E '(--accent-color|--primary-color|--light-color|--dark-color|--semi-transparent-accent-color|--base-body-color|--light-body-color|--placeholder-body-color|--light-bg-color|--lighter-bg-color|--disabled-bg-color|--border-color|--darker-border-color|--alert-color|--warning-color|--notice-color|--warning-bg-color|--add-color|--remove-color)' \
  src/

grep -rn \
  --include='*.css' --include='*.tsx' --include='*.ts' \
  --include='*.jsx' --include='*.js' \
  -E '(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()' \
  src/
```

Also inspect local CSS Modules and component files imported by rendered entrypoints.

## Replace legacy variables

Choose the token by what the rule means, not by color similarity.

| Legacy variable | Usual semantic token |
| - | - |
| `--base-body-color` | `--color--ink` |
| `--light-body-color` | `--color--ink-subtle` |
| `--placeholder-body-color` | `--color--ink-placeholder` |
| `--light-bg-color`, `--lighter-bg-color` | `--color--surface-muted` |
| `--disabled-bg-color` | `--color--disabled--surface` |
| `--border-color` | `--color--border` |
| `--darker-border-color` | `--color--border-hover` |
| `--alert-color` text/border | `--color--danger-soft--ink` or `--color--danger-soft--border` |
| `--alert-color` background | `--color--danger-soft--surface` |
| `--warning-color`, `--warning-bg-color` | `--color--warning-soft--ink`, `--color--warning-soft--surface` |
| `--notice-color` | `--color--success-soft--ink` |
| `--add-color`, `--remove-color` | `--color--diff-added--surface`, `--color--diff-removed--surface` |
| `--accent-color` link/text | `--color--ink-link` or `--color--ink-primary` |
| `--accent-color` action background | `--color--primary--surface` or `--color--primary--surface-secondary` |
| `--semi-transparent-accent-color` | `--color--focus--outline` |
| `--primary-color` | `--color--primary--surface` |
| `--light-color` | `--color--primary-soft--surface` |
| `--dark-color` | usually `--color--primary--surface-secondary`; avoid for neutral text |

Keep context pairs together. If a panel uses `--color--danger-soft--surface`, its text should usually use `--color--danger-soft--ink`, not primary or neutral ink.

For exact semantic token names and descriptions, load `design-tokens.md`; it covers `ctx.cssDesignTokens` color/shadow tokens plus Canvas typography, spacing, easing/motion, and runtime theme variables available inside `<Canvas>`. Use those Canvas tokens and variables by default for plugin UI; customize beyond them only when the user asks for a specific look or an effect they cannot express.

## Replace hardcoded colors

Common substitutions:

- white or page background -> `--color--surface`
- light grey panel -> `--color--surface-muted`
- dropdown/modal/popover surface -> `--color--surface-raised`
- dark body text -> `--color--ink`
- muted grey text -> `--color--ink-subtle`
- placeholder text -> `--color--ink-placeholder`
- borders -> `--color--border` or `--color--border-hover`
- focus halo -> `--color--focus--outline`
- primary action -> `--color--primary--surface` + `--color--primary--ink`

Use semantic Canvas tokens directly for plugin UI. Do not introduce custom properties that only rename Canvas tokens, and do not use `color-mix(...)` to simulate text hierarchy, selected states, disabled states, neutral borders, focus rings, or standard status colors.

Prefer full semantic families:

- helper text -> `--color--ink-subtle`; muted copy -> `--color--ink-muted`; placeholders -> `--color--ink-placeholder`; disabled copy -> `--color--disabled--ink`
- neutral hover -> `--color--surface-hover`
- selected options -> `--color--selected--surface`, `--color--selected--surface-hover`, `--color--selected--border`, `--color--selected--ink`
- disabled controls -> `--color--disabled--surface` + `--color--disabled--ink`; use `--color--border` when a disabled control still needs a boundary
- danger, warning, success, and diff UI -> keep `surface`, `ink`, and `border` from the same context family
- standard elevation -> `--shadow--raised`, `--shadow--lifted`, `--shadow--floating`, or `--shadow--ambient`

Keep `color-mix(...)` or local custom variables only for real customization outside default Canvas semantics, such as media overlays, data visualization, vendor widgets, artwork, or user-requested product colors.

Treat selected/current/active UI as a strict semantic state. Selected image cards, selected chips, active suggestions, active tabs, checked cards, selected rows, dropdown options, icon choices, model filters, and viewport choices must use the selected family together. Do not use primary or primary-soft tokens as a substitute for selection; those tokens are for primary actions and intentional branded accents.

For real custom colors such as brand artwork, charts, or vendor widgets, define a local variable with a dark-mode override:

```css
.wrapper {
  --vendor-accent: #4a90e2;
}

[data-color-scheme='dark'] .wrapper {
  --vendor-accent: #6aa9ec;
}
```

## Inline styles and SVGs

Search inline styles:

```bash
grep -rn --include='*.tsx' --include='*.jsx' -E 'style=.*(color|background|border)' src/
```

Prefer class-based CSS using Canvas variables. If dynamic inline styles are needed, assign CSS variables in the style object and consume them from CSS.

Search SVG fills:

```bash
grep -rn --include='*.tsx' --include='*.jsx' --include='*.svg' -E 'fill="(?!currentColor|none)' src/
```

Use `fill="currentColor"` for icons that should inherit text color. Keep intentional brand/artwork fills only when they have a dark-mode-safe counterpart.

## Find rendered surfaces

Inspect the top-level `connect()` call and add a check for each rendered surface:

```bash
grep -rE 'renderConfigScreen|renderFieldExtension|renderManualFieldExtensionConfigScreen|renderPage|renderModal|renderAssetSource|renderItemFormSidebarPanel|renderItemFormSidebar|renderItemFormOutlet|renderItemCollectionOutlet|renderUploadSidebarPanel|renderUploadSidebar|renderInspector|renderInspectorPanel' src/
```

Map each hook to its manual surface check:

- config screen: plugin settings save path
- field extension: assigned field render and value update
- manual field config: field presentation/settings panel
- modal: opener path and resolve/cancel behavior
- page or inspector: navigation and full-height scrolling
- sidebar or outlet: assigned model/record render and resizing
- asset source/upload sidebar: media-area flow and selection/edit path

## Static verification

After changes, rerun the legacy-variable and hardcoded-color searches. Accept only intentional non-color matches such as `transparent`, `inherit`, `currentColor`, or third-party brand/artwork colors with dark overrides.

Then run the plugin's existing validation, usually:

```bash
npm run build
```

Also run test, typecheck, or lint scripts when the touched plugin already defines them and the change touches covered logic.

## Manual acceptance checks

For each rendered surface in light and dark mode, verify:

- body text, helper text, and disabled text are legible
- borders and dividers remain visible
- neutral, raised, selected, warning, success, and danger surfaces use matching ink tokens
- hover, active, and focus states are visible
- dropdowns, modals, portals, and scrollbars do not remain light-only
- third-party widgets or images branch on `ctx.colorScheme` when CSS tokens cannot reach them

Report the one manual check that matters most for the changed surface if it cannot be automated.
