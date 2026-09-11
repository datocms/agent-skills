# datocms-react-ui Bridge

Use this file when the question is “which public primitive should carry this UI?” instead of “how does the CMS look?”

## Contents

- Public-first decision rule
- Mapping table
- Component notes
- When to stay with public components
- When to fall back to raw code
- Version-sensitive areas

## Public-first decision rule

Prefer `datocms-react-ui` when the component exists and the required visual shape is already close to the CMS.

Fall back to raw code when:

- the package lacks the layout primitive
- the surface needs a CMS-like shell but not a public component API
- the public component would force a less-native structure than a small local wrapper

## Mapping table

| Design need | Public component path | Raw fallback |
| - | - | - |
| Theme + base CSS vars | `Canvas` | none; always use `Canvas` |
| Standard settings form | `Form` + `FieldGroup` + field components | local form wrapper with CSS Modules |
| Text input | `TextField` | native `<input>` |
| Multiline text | `TextareaField` | native `<textarea>` |
| Select input | `SelectField` | native `<select>` |
| Boolean setting | `SwitchField` | checkbox/switch wrapper |
| Main actions | `Button` | local button styles using Canvas vars |
| Segmented choice | `ButtonGroup` + `ButtonGroupButton` | simple flex row of local buttons |
| Grouped section | `Section` | local section wrapper with divider-led title |
| Sidebar disclosure block | `SidebarPanel` | local collapsible panel |
| Header/action bar | `Toolbar`, `ToolbarStack`, `ToolbarTitle`, `ToolbarButton` | flex toolbar with border and spacing |
| Dropdown trigger/menu | `Dropdown` | local menu only if the package version lacks the needed shape |
| Loading state | `Spinner` | local spinner only as last resort |
| Split view | `VerticalSplit` | flex/grid layout with a divider |
| Tooltip | `Tooltip` (with `TooltipTrigger`, `TooltipContent`) | local tooltip only as last resort |
| Keyboard shortcut hint | `HotKey` | local `<kbd>` element |
| Field error message | `FieldError` | local error message |
| Field hint text | `FieldHint` | local hint text |
| Field wrapper (label + input + error) | `FieldWrapper` + `FormLabel` | local wrapper with label and error |

**Not available in `datocms-react-ui`:**

| Design need | Recommendation |
| - | - |
| Tabs / tabbed navigation | Use `ButtonGroup` for tab-like selection, or build a custom tab bar with Canvas CSS variables |
| Data table | Build with raw `<table>` using Canvas spacing and border tokens |
| Toast / notification | Build with local component using Canvas color tokens |

### Hooks

| Hook | Purpose |
| - | - |
| `useCtx()` | Access the plugin context (`ctx`) from deeply nested components inside `<Canvas>`. Avoids prop-drilling for theme data, site info, permissions, etc. |
| `useClickOutside` | Detect clicks outside a ref element — useful for closing custom dropdowns or popovers |
| `useMediaQuery` | React to viewport size changes for responsive plugin layouts |

## Component notes

### Canvas

Required for every plugin surface. It handles theme variables and normal frame behavior.

Doc: <https://www.datocms.com/docs/plugin-sdk/react-datocms-ui>

### Section

Reach for `Section` before building a custom grouped box. It already matches DatoCMS section hierarchy, including highlighted and collapsible variants.

Doc: <https://www.datocms.com/docs/plugin-sdk/section>

### Toolbar

Use public toolbar primitives for page-like work areas. They keep title, stack, and action rhythm aligned with the CMS.

Doc: <https://www.datocms.com/docs/plugin-sdk/toolbar>

### Button and ButtonGroup

Use these for primary, muted, and negative action hierarchy plus segmented selection.

Docs:

- <https://www.datocms.com/docs/plugin-sdk/button>
- <https://www.datocms.com/docs/plugin-sdk/button-group>

### Dropdown

Use the public dropdown when available before building a bespoke menu.

Doc: <https://www.datocms.com/docs/plugin-sdk/dropdown>

### SidebarPanel

Use the public `SidebarPanel` when a plugin panel needs standard disclosure behavior and native internal padding.

Doc: <https://www.datocms.com/docs/plugin-sdk/sidebar-panel>

### VerticalSplit

Use `VerticalSplit` for page-like two-pane tools, inspectors, and larger sidebars when the public component is available in the installed version.

Doc: <https://www.datocms.com/docs/plugin-sdk/sidebars-and-split-views>

## When to stay with public components

Stay public when the problem is mostly:

- field choice
- section grouping
- action hierarchy
- toolbar rhythm
- disclosure behavior
- theme consistency

## When to fall back to raw code

Fall back when the problem is mostly:

- shell layout
- row composition
- page-width tuning
- split-pane proportions
- special empty-state framing
- a small CMS-like pattern that is easier to express with 20 lines of CSS

## Version-sensitive areas

Some layout primitives vary more across `datocms-react-ui` versions than the core fields and buttons do. For split views or more specialized shells:

1. inspect the installed package version
2. use the public helper if it exists and reads naturally
3. otherwise drop to raw flex or grid plus Canvas variables

Do not block a clean implementation waiting for a perfect public primitive.
