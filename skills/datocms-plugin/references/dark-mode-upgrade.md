# Dark mode upgrade

Use this reference when an existing plugin must be upgraded for dark mode.

## Perfect instruction

The following instruction is canonical for this dark-mode migration. Use it verbatim when the task calls for the full dark-mode upgrade workflow.

Your task is to upgrade this DatoCMS plugin from legacy CSS variables to the new semantic color token system, then verify it looks correct in dark mode.

**Before starting**, create a task list covering every step below. Mark each task done as soon as it's completed. When you reach step 5 ("Find what the plugin renders"), discover the hooks first, then add one task per UI surface to the same list before proceeding.

## 1. Upgrade dependencies

```bash
npm install datocms-react-ui@latest datocms-plugin-sdk@latest
```

## 2. Find all files that need updating

Search for legacy CSS variables across all source files:

```bash
grep -rn --include="*.css" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
  -E "(--accent-color|--primary-color|--light-color|--dark-color|--semi-transparent-accent-color|--base-body-color|--light-body-color|--placeholder-body-color|--light-bg-color|--lighter-bg-color|--disabled-bg-color|--border-color|--darker-border-color|--alert-color|--warning-color|--notice-color|--warning-bg-color|--add-color|--remove-color)" \
  src/
```

Also search for hardcoded color values:

```bash
grep -rn --include="*.css" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()" \
  src/
```

## 3. Replace legacy CSS variables

For each occurrence, look at the context (what the rule does, what element it styles) and pick the **most semantically correct** token from the full vocabulary below. The mapping table is a starting point for common cases, but the token list is the authoritative reference — always prefer the token whose description best matches the actual usage.

**Mapping table (common cases):**

| Legacy variable | Likely replacement |
|---|---|
| `--base-body-color` | `--color--ink` |
| `--light-body-color` | `--color--ink-subtle` |
| `--placeholder-body-color` | `--color--ink-placeholder` |
| `--light-bg-color` | `--color--surface-muted` |
| `--lighter-bg-color` | `--color--surface-muted` |
| `--disabled-bg-color` | `--color--disabled--surface` |
| `--border-color` | `--color--border` |
| `--darker-border-color` | `--color--border-hover` |
| `--alert-color` (as text/border) | `--color--danger-soft--ink` |
| `--alert-color` (as background) | `--color--danger-soft--surface` |
| `--warning-color` | `--color--warning-soft--ink` |
| `--warning-bg-color` | `--color--warning-soft--surface` |
| `--notice-color` | `--color--success-soft--ink` |
| `--add-color` (as background) | `--color--diff-added--surface` |
| `--remove-color` (as background) | `--color--diff-removed--surface` |
| `--accent-color` (as text/link) | `--color--ink-link` |
| `--accent-color` (as background) | `--color--primary--surface-secondary` |
| `--accent-color` (as hover border) | `--color--focus--border` |
| `--semi-transparent-accent-color` | `--color--focus--outline` |
| `--primary-color` | `--color--primary--surface` |
| `--light-color` | `--color--primary-soft--surface` |
| `--dark-color` (as background) | `--color--primary--surface-secondary` |
| `--dark-color` (as text) | `--color--primary--ink` |

**Full token vocabulary:**

```
Standalone (neutral page)
--color--surface                    Page background
--color--surface-hover              Hovered row in lists/tables
--color--surface-muted              Muted section panels, quiet cards
--color--surface-raised             Elevated layer: modals, dropdowns, popovers
--color--surface-raised-hover       Hovered option inside a dropdown
--color--surface-raised-active      Focused/pressed option inside a dropdown
--color--ink                        Primary body text
--color--ink-subtle                 Secondary text, captions, helper labels
--color--ink-hover                  Toolbar icon/link fill on hover
--color--ink-muted                  Deemphasized text
--color--ink-placeholder            Empty-input placeholder text
--color--ink-primary                Theme-colored text/icons for branded labels
--color--ink-link                   Inline links and accent text
--color--ink-danger                 Error text/icon on a neutral surface
--color--ink-warning                Warning text/icon on a neutral surface
--color--ink-success                Success text/icon on a neutral surface
--color--ink-disabled               Label color on disabled inputs/buttons
--color--border                     Default 1px divider
--color--border-hover               Border of an input/card when hovered

Primary (brand color, full strength)
--color--primary--surface           Resting background of a primary CTA button
--color--primary--surface-hover     Hovered primary button
--color--primary--surface-active    Pressed primary button
--color--primary--surface-muted     Muted variant of the primary surface
--color--primary--surface-secondary Quieter brand surface for accent badges/chips
--color--primary--ink               Text/icon on any primary surface
--color--primary--border            Border on top of a primary surface

Primary-soft (tinted, secondary actions)
--color--primary-soft--surface      Resting background of secondary brand-tinted buttons
--color--primary-soft--surface-hover
--color--primary-soft--surface-active
--color--primary-soft--ink          Text/icon on a soft brand surface
--color--primary-soft--border

Selected (active entry in a list/tree/gallery)
--color--selected--surface
--color--selected--surface-hover
--color--selected--ink
--color--selected--border

Disabled
--color--disabled--surface
--color--disabled--ink

Danger (destructive actions)
--color--danger--surface
--color--danger--ink

Focus rings
--color--focus--border              Border color of the focused element
--color--focus--outline             Soft outline ring around focused element

Signal tones (validation states, notifications)
--color--danger-soft--surface       Error banner/alert background
--color--danger-soft--ink           Error message text/icon
--color--danger-soft--border        Border around invalid input/alert
--color--danger-soft--outline       Soft halo around invalid field on focus
--color--warning-soft--surface
--color--warning-soft--ink
--color--warning-soft--border
--color--warning-soft--outline
--color--success-soft--surface
--color--success-soft--ink
--color--success-soft--border
--color--success-soft--outline

Diffs
--color--diff-added--surface        Background of inline added text
--color--diff-added--outline        Outline around a block-level added panel
--color--diff-added--ink            Left-border color (vivid, recently changed)
--color--diff-added--ink-subtle     Left-border color (stable)
--color--diff-removed--surface
--color--diff-removed--outline
--color--diff-removed--ink
--color--diff-removed--ink-subtle
--color--diff-changed--surface
--color--diff-changed--outline

Backdrop / overlay
--color--backdrop--surface          Full-screen modal dim
--color--backdrop--ink              Icon color for close controls on backdrop
--color--overlay--surface           Scrim over media thumbnails
--color--overlay--surface-hover
--color--overlay--surface-active
--color--overlay--ink

Stacked (dark inline panels, asset uploaders, players)
--color--stacked--surface
--color--stacked--surface-upper
--color--stacked--surface-action
--color--stacked--surface-action-hover
--color--stacked--surface-action-active
--color--stacked--ink
--color--stacked--ink-subtle
--color--stacked--border

Other
--color--highlight--surface         Yellow marker in rich-text editors
--color--progress--track
--color--progress--fill
--color--progress--fill-hover
--color--tooltip--surface
--color--tooltip--surface-hover
--color--tooltip--ink
--color--tooltip--ink-subtle
--color--code--surface
--color--code--ink
--color--scrollbar--fill
--color--status-draft--ink
--color--status-outdated--ink
--color--status-published--ink
```

**Rule: never cross ink-owning contexts.**

Each context (`primary`, `primary-soft`, `danger`, `danger-soft`, `warning-soft`, `success-soft`, `disabled`, `selected`, `stacked`, `overlay`, `tooltip`, `code`…) is contrast-balanced as a unit. Always pair a surface with the ink from the same context — e.g. `--color--danger-soft--surface` + `--color--danger-soft--ink`. Mixing across contexts (e.g. `--color--primary--ink` on `--color--danger-soft--surface`) produces illegible combinations in dark mode.

## 4. Replace hardcoded colors

For each hardcoded color, pick the most semantically correct token from the vocabulary above. Common patterns:

- Muted text (`#999`, `#aaa`, grey tones) → `--color--ink-subtle`
- Body text (`#333`, `#444`, dark tones) → `--color--ink`
- White backgrounds → `--color--surface`
- Light grey backgrounds → `--color--surface-muted`
- Border greys → `--color--border`

For colors that are genuinely custom (brand illustrations, data-viz, third-party widgets), define them with a dark-mode override:

```css
.my-element {
  --my-custom: #4a90e2;
}

[data-color-scheme="dark"] .my-element {
  --my-custom: #6aa9ec;
}
```

## 5. Check inline styles in TSX/JSX

```bash
grep -rn --include="*.tsx" --include="*.jsx" -E "style=.*(color|background|border)" src/
```

Apply the same token substitutions. If the color is set dynamically from `ctx.theme`, migrate to `ctx.cssDesignTokens` or use CSS variables instead.

## 6. Check SVG fills

```bash
grep -rn --include="*.tsx" --include="*.jsx" --include="*.svg" -E 'fill="(?!currentColor|none)' src/
```

Replace hardcoded fills with `fill="currentColor"` so icons inherit the surrounding text color.

## 7. Test in dark mode

Before starting the browser steps, load the agent-browser command reference:

```bash
agent-browser skills get core             # workflows, common patterns, troubleshooting
agent-browser skills get core --full      # full command reference and templates
```

**Browser interaction pattern:** always use `snapshot -i` to get element refs, then interact via refs — never use `eval` or raw CSS selectors, which are fragile:

```bash
agent-browser snapshot -i                  # list interactive elements with @refs
agent-browser fill @e3 "http://..."        # fill a field by ref
agent-browser find role button click --name "Save plugin settings"
agent-browser navigate "https://..."       # navigate within an existing session (not `open`)
```

**When to screenshot:** only during visual inspection (steps 7f–7g below), when you need to verify colors and contrast. For everything else — confirming navigation, form state, install success — use `agent-browser get url` or `snapshot -i`. Screenshots are slow and consume extra tokens for image parsing.

**Interacting with plugin iframes:** DatoCMS renders each plugin inside an iframe. Since agent-browser **0.27.0**, `snapshot -i` inlines the iframe content directly in the tree, so plugin elements appear as normal refs and you can click/fill them without any frame-switching:

```bash
agent-browser snapshot -i
# Output includes iframe content inline, e.g.:
# - Iframe [ref=e25]
#   - button "Insert new table" [ref=e28]

agent-browser click @e28   # works directly — no frame switching needed
```

For older versions (< 0.27.0), upgrade first:

```bash
npm update -g agent-browser
```

If you need to explicitly enter a cross-origin iframe (e.g. for debugging), use:

```bash
agent-browser frame @e25   # switch context into the iframe
agent-browser frame main   # return to the top-level page
```

On cross-origin iframes, `snapshot` inside the frame may fail with a CDP accessibility error depending on the version. The inline-ref approach via `snapshot -i` on the parent is more reliable.

### 7a. Start the dev server

```bash
npm run dev
```

**Check the terminal output for the actual port** — if 5173 or 5174 are already in use, Vite picks the next available one. Use the URL printed, not the default.

### 7b. Get the bearer token

Ask the user to open the DatoCMS app in their browser, open the DevTools console, and run:

```js
JSON.parse(localStorage.getItem('persistedState')).session.bearerToken
```

### 7c. Open the browser in dark mode

Pass `--color-scheme dark` when first opening the browser session. Add `--headed` so the user can see the browser in real time. If the daemon is already running, close it first:

```bash
agent-browser close
agent-browser open "https://<project>.admin.datocms.com/enter?access_token=<TOKEN>" --color-scheme dark --headed
agent-browser wait --load networkidle
```

This sets the OS-level `prefers-color-scheme` media query to `dark`, which DatoCMS picks up automatically.

For all subsequent navigation in the same session use `agent-browser navigate <url>`, not `open`.

### 7d. Install the plugin in the test project

Use the bearer token from step 7b and the dev server URL from step 7a:

```bash
npx datocms cma:call plugins create \
  --api-token=<BEARER_TOKEN> \
  --data='{name: "Test plugin", url: "http://localhost:5175/"}'
```

Replace the URL with the actual port printed by the dev server.

### 7e. Find what the plugin renders

Grep `src/main.tsx` (or equivalent entrypoint) for the hooks the plugin registers:

```bash
grep -rE "overrideFieldExtensions|renderFieldExtension|renderPage|renderModal|renderAssetSource|renderItemFormSidebar|renderItemFormOutlet|renderManualFieldExtensionConfigScreen|customMarksForStructuredTextField|manualFieldExtensions" src/
```

Then set up the corresponding context in DatoCMS.

**Creating test models and fields via CLI (faster than the UI):**

Use the bearer token from step 7b — no prior `datocms login` or `datocms link` needed. Use `npx datocms cma:docs <resource> <action>` to look up the exact request body shape for any CMA call (e.g. `npx datocms cma:docs fields create`).

```bash
# Create a test model
npx datocms cma:call itemTypes create \
  --api-token=<BEARER_TOKEN> \
  --data='{name: "Test", api_key: "test_dark_mode", draft_mode_active: true}'

# Create a field on it (replace <MODEL_ID> with the id returned above)
npx datocms cma:call fields create <MODEL_ID> \
  --api-token=<BEARER_TOKEN> \
  --data='{label: "Value", api_key: "value", field_type: "string"}'
```

Replace `field_type` with whichever type the plugin targets (e.g. `json`, `text`, `structured_text`).

For each hook the plugin registers, set up the corresponding context and add one task to the list per distinct UI surface. Here's what each hook requires:

- **`overrideFieldExtensions` / `renderFieldExtension`**: the plugin auto-attaches to certain field types. Create a model with a field of that type, open a record, and the plugin renders as the field editor.
- **`manualFieldExtensions` / `renderFieldExtension`**: the plugin must be manually assigned. Create a model with a field of the declared `fieldTypes`, then assign the plugin as the field editor via CLI (use the plugin ID returned during installation and the extension id declared in `manualFieldExtensions()`):
  ```bash
  npx datocms cma:call fields update <FIELD_ID> \
    --api-token=<BEARER_TOKEN> \
    --data='{appearance: {editor: "<PLUGIN_ID>", field_extension: "<EXTENSION_ID>", parameters: {}, addons: []}}'
  ```
  Then open a record of that model.
- **`renderManualFieldExtensionConfigScreen`**: assign the plugin to the field via CLI (same `fields update` command as above). The config screen renders inside the field settings panel in the DatoCMS UI — navigate there in the browser to inspect it:
  ```bash
  agent-browser navigate "https://<project>.admin.datocms.com/schema/item_types/<MODEL_ID>/fields/<FIELD_ID>/edit?tab=presentation"
  agent-browser wait --load networkidle
  ```
- **`renderPage`**: the plugin adds a custom page. Find it in the navigation.
- **`renderModal`**: triggered programmatically — find the UI element that opens it (e.g. a button in a field extension) and click it.
- **`renderAssetSource`**: appears in the media picker. Open any asset/gallery field and look for a custom source tab.
- **`renderItemFormSidebar` / `renderItemFormOutlet`**: go to model settings, assign the plugin to the sidebar or outlet, then open any record of that model.

### 7f. Visually inspect in dark mode

Work through each UI surface task one at a time. For each, verify:

- Text is legible (no dark-on-dark or light-on-light combination)
- Borders are visible
- Backgrounds have appropriate contrast
- Hover/focus states are visible
- Any modals or dropdowns opened by the plugin render correctly

Take a screenshot for reference:

```bash
agent-browser screenshot
```

## 8. Verify (static)

Re-run the search commands from steps 2 and 3 — both should return no results. Legitimate non-color hits to ignore: `color: inherit`, `background-color: transparent`, `color: currentColor`.

Then confirm the build passes:

```bash
npm run build
```