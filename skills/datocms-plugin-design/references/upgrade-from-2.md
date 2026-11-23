# Upgrade to datocms-react-ui 4

From 2.x (the `latest` line, last 2.5.1) or a 3.x prerelease. No migration page exists on react-ui.datocms.com; this mapping comes from the 2.5.1 source and the `4.0.0-next.8` `.d.ts`. 2.x code does not port prop by prop: rebuild each screen from the pages in `docs/`, using the tables below to find them.

## Contents

- From 3.x prereleases
- Steps from 2.x
- Exports
- Props that changed
- CSS variables
- After the upgrade

## From 3.x prereleases

4.0.0-next.8 has the same components, entries, props and peer ranges (SDK `^2.2.7 || ^3.0.0-next.0`) as 3.1.0-next.9. 3.1.0-next.9 was published later and differs in one runtime file: a disabled tree toggle in `Table` also prevents the click's default action. npm marks 4.0.0-next.8 deprecated in its favour; this skill keeps the 4.0.0-next.8 pin.

- Pin `"datocms-react-ui": "4.0.0-next.8"` (exact; `next` still points to 3.x).
- Delete the `overrides` block that early 3.x needed (`"datocms-react-ui": { "datocms-plugin-sdk": "$datocms-plugin-sdk" }`): the peer range now accepts SDK prereleases.
- Imports from private paths stop resolving: early 3.x exposed `datocms-react-ui/ui/src/...`; 4 blocks `ui-public/*` and `internal/*`. Use the public entry (`docs/` index in SKILL.md).
- Pages added since 3.1.0-next.1 (new entries, use them instead of hand-made versions): `Content/EnvironmentPill`, `Content/FieldTypes`, `Content/FileTypeIcon`, `Content/ItemStatus`, `Content/UploadPreview`, `Forms/DateInputs`, `Forms/FilterBuilder`, `Lists/RecordRow`, `Lists/TreeRow`, `Lists/UploadCard`, `Lists/UserRow`.

## Steps from 2.x

1. `npm install datocms-react-ui@4.0.0-next.8` (while `npm view datocms-react-ui version` is below 4); keep React 18/19 and `datocms-plugin-sdk` `^2.2.7`.
2. `tsconfig.json`: `"moduleResolution": "bundler"` (or `node16`/`nodenext`); 4 resolves only through `exports`.
3. Entry file: `import 'datocms-react-ui/styles.css';` once. 2.x bundled CSS per component; 4 has one stylesheet.
4. Replace `import { A, B } from 'datocms-react-ui'` with one import per entry (table below). There is no root entry.
5. Keep `<Canvas ctx={ctx}>` around every frame hook; import it as a default: `import Canvas from 'datocms-react-ui/Canvas'`.
6. Grep the plugin CSS for `var(--` and map every variable ([CSS variables](#css-variables)); an unmapped one resolves to nothing, silently.
7. Rebuild each screen from its surface recipe (`surfaces/<surface>.md`) and the component pages; run `review-checklist.md`.

## Exports

Every 2.5.1 export and its 4 replacement. Pages are under `docs/`.

| 2.x | 4 | Page |
| - | - | - |
| `Canvas`, `useCtx` | `import Canvas, { useCtx } from 'datocms-react-ui/Canvas'` | `Plugin/Canvas` |
| `CtxContext` | Not exported: `useCtx<YourCtx>()` | `Plugin/Canvas` |
| `ContextInspector` | `import ContextInspector from 'datocms-react-ui/ContextInspector'` | `Plugin/ContextInspector` |
| `Button`, `ButtonLink` | `Button` (`to`/`href` make it a link) | `Actions/Button` |
| `ButtonGroup`, `ButtonGroupButton` | `SegmentedControl` (`options`, `value`, `onChange`) | `Navigation/SegmentedControl` |
| `Dropdown`, `DropdownMenu`, `DropdownOption`, `DropdownOptionAction`, `DropdownSeparator`, `DropdownGroup`, `DropdownText` | `{ Dropdown }` with `Dropdown.Menu`, `Dropdown.Option`, `Dropdown.OptionAction`, `Dropdown.Separator`, `Dropdown.Group`, `Dropdown.Text`; trigger via `triggerComponent` | `Actions/Dropdown`, `Actions/DropdownTriggers` |
| `TextField`, `TextInput` | `FieldWrapper` + `StringInput` | `Forms/FieldWrapper`, `Forms/TextInputs` |
| `TextInput type="password"`, `type="number"` | `PasswordInput`, `NumberInput` | `Forms/TextInputs` |
| `TextareaField`, `TextareaInput` | `FieldWrapper` + `TextareaInput` | `Forms/TextInputs` |
| `SwitchField`, `SwitchInput` | `FieldWrapper` (hint and error only) + `SwitchInput` with `label` | `Forms/ChoiceInputs` |
| `SelectField`, `SelectInput` | `FieldWrapper` + `SelectInput` | `Forms/SelectInput` |
| `AsyncSelectField`, `AsyncSelectInput` | `SelectInput` + `useAsyncSelectOptions` (`datocms-react-ui/hooks/useAsyncSelectOptions`) | `Forms/SelectInput`, `Foundations/Hooks` |
| `CreatableSelectField`, `CreatableSelectInput` | `SelectInput` with `creatable` | `Forms/SelectInput` |
| `AsyncCreatableSelectField`, `AsyncCreatableSelectInput` | `SelectInput` with `creatable` + `useAsyncSelectOptions` | `Forms/SelectInput` |
| `FieldWrapper` | `FieldWrapper` (`label`, `hint`, `error`, `required`) | `Forms/FieldWrapper` |
| `FormLabel` | `Label` (only for a control that is not a field input) | `Forms/Form` |
| `FieldHint`, `FieldError` | `FieldWrapper` `hint` and `error`; `FieldHint` alone only under a non-field control | `Forms/Form` |
| `Form`, `FieldGroup` | A plain `<form>`; fields space themselves (`--form-field-gap`); side by side with `form__field form__row` | `Forms/Form` |
| `Section` (with `collapsible`) | `Page.Section` + `Page.SectionTitle` (`collapse`), or `Page.Group` | `Layout/Page` |
| `SidebarPanel` | `SidebarPanel` (`noPadding` → `flush`) | `Layout/SidebarPanel` |
| `Toolbar`, `ToolbarButton`, `ToolbarTitle`, `ToolbarStack` | `Toolbar` with `Toolbar.Button`, `Toolbar.Title`, `Toolbar.Group`…; title bars of panes: `Pane.Header` | `Layout/Toolbar`, `Layout/Pane` |
| `SplitView`, `SplitViewPane`, `VerticalSplit` | `SplitPane`, or the patterns | `Layout/SplitPane`, `Patterns/ListAndDetail`, `Patterns/ListAndForm` |
| `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipDelayGroup` | `Tooltip label={…}` around the trigger; Canvas mounts the delay group | `Overlays/Tooltip` |
| `HotKey` | `useRegisterActions` + `Shortcut` (`datocms-react-ui/Actions`); `Tooltip shortcut` for keys with no action | `Actions/Actions` |
| `Spinner` (`placement`, `size: number`) | `Spinner` (`inline`; no `size`), `Spinner.Area` (`size: 'small' \| 'regular'`), `Spinner.Overlay` | `Feedback/Progress` |
| `useClickOutside` | `datocms-react-ui/hooks/useClickOutside` (same signature) | `Foundations/Hooks` |
| `useMediaQuery` | `datocms-react-ui/hooks/useMediaQuery` (read `.matches`) | `Foundations/Hooks` |
| `MediaQuery` component | Removed: branch on `useMediaQuery(query).matches` | `Foundations/Hooks` |
| `useElementLayout` | `datocms-react-ui/hooks/useElementLayout` | `Foundations/Hooks` |
| Icons (`BackIcon`, `CaretDownIcon`, `CaretUpIcon`, `ChevronsLeftIcon`, `ChevronsRightIcon`, `SidebarLeftArrowIcon`, `SidebarRightArrowIcon`, `SidebarFlipIcon`) | None bundled: plugin's own icons; a caret that opens content or a menu → `DisclosureChevron`/`MenuChevron` | `Plugin/Canvas` ("Icons"), `Navigation/Chevron` |

## Props that changed

- **Button:** `children` → `label`; `buttonType` `primary|muted|negative` → `tone` `primary|soft|alert` (plus `ghost`, `ghost-alert`); `buttonSize` → no size (the place gives it); `leftIcon`/`rightIcon` (an element) → `icon={Component}`; `fullWidth` → `expand`, only where a page asks for it; `ButtonLink href` → `Button href`/`to`; `type="submit"` → `submit`.
- **Inputs:** controlled; `onChange(newValue)`, not an event. Text inputs give `string | null` (empty = `null`). `textInputProps`, `switchInputProps`, `selectInputProps` → props on the input itself. `monospaced` → `code`. `SwitchInput` `name` optional; label on the switch.
- **SelectInput:** value = the option's `value` string (array with `multiple`), not the option object; `isMulti` → `multiple`; `onChange` gets the option(s) as second argument; `loadOptions` → `useAsyncSelectOptions`.
- **Dropdown:** `renderTrigger` → `triggerComponent` (`Dropdown.ButtonTrigger`, `IconTrigger`, `TextualTrigger`, `PillTrigger`); `DropdownOption onClick` → `Dropdown.Option onPick` (or `to`, `href`, `action`); `red` → `alert`, last, after `Dropdown.Separator`.
- **Section:** `collapsible={{ isOpen, onToggle }}` → `collapse` on `Page.SectionTitle` or `Page.Group`, not on `Page.Section` (see `Layout/Page`, "Collapse").

## CSS variables

4 keeps on `:root`: `--base-font-family`, `--monospaced-font-family`, `--spacing-s|m|l|xl|xxl|xxxl`, `--negative-spacing-s…xxxl`, `--font-size-xs|m|l|xl|xxl|xxxl`, `--material-ease`, and adds `--font-weight-regular|strong`, `--radius-*`, `--control-height`, `--row-*`, `--focus-ring`, `--ease-out` (`Foundations/CssVariables`). Canvas writes only `ctx.cssDesignTokens` (the `--color--*` tokens); the 2.x theme variables from `ctx.theme` are no longer set.

| 2.x | 4 |
| - | - |
| `--spacing-xs`, `--negative-spacing-xs` | Gone: `--spacing-s` / `--negative-spacing-s` (nearest step) |
| `--font-size-xxs` (11px), `--font-size-s` (14px) | Gone: `--font-size-xs` (13px) / `--font-size-m` (15px), by role |
| `--font-weight-bold` | Deprecated alias: `--font-weight-strong` |
| `--inertial-ease` | Gone: `--ease-out` |
| `--base-body-color` | `--color--ink` |
| `--light-body-color` | `--color--ink-subtle` |
| `--placeholder-body-color` | `--color--ink-placeholder` |
| `--light-bg-color`, `--lighter-bg-color` | `--color--surface-muted` |
| `--disabled-bg-color` | `--color--disabled-field--surface` (2.5.1 aliased `--color--disabled--surface`, not a v4 token) |
| `--border-color` | `--color--border` |
| `--darker-border-color` | `--color--border-hover` |
| `--alert-color` | `--color--ink-danger` (mark: `--color--fill-danger`) |
| `--warning-color` | `--color--ink-warning` |
| `--notice-color` | `--color--ink-success` |
| `--warning-bg-color` | `--color--warning-soft--surface` with `--color--warning-soft--ink` |
| `--add-color`, `--remove-color` | `--color--diff-added--surface`, `--color--diff-removed--surface` |
| `--primary-color`, `--accent-color`, `--dark-color` | Brand by role: `--color--primary--surface` (solid, with `--color--primary--ink`), `-hover`/`-active` variants, `--color--ink-primary` for brand text |
| `--light-color`, `--semi-transparent-accent-color` | `--color--primary-soft--surface` (soft brand panel) or `--color--selected--surface` (selected row) |
| `--*-rgb-components` (any) | Gone: no `rgba(var(--x-rgb-components), a)`; use the token of the role (hover, muted, soft) |

Rows `--base-body-color` to `--remove-color` follow the aliases 2.5.1 itself declared; the brand rows are by role: check each against `Foundations/Colors`.

## After the upgrade

- `grep -rn "from 'datocms-react-ui'" src` returns nothing; `grep -rn "var(--" src` lists only names present in `Foundations/CssVariables` or `Foundations/Colors`.
- No `buttonType`, `buttonSize`, `leftIcon`, `fullWidth`, `isMulti`, `renderTrigger`, `textInputProps` left.
- Run `review-checklist.md`, then check light and dark mode in the dashboard.
