# Source Map

## Quick Navigation

- CMS tokens and CSS variables
- page, toolbar, and full-height layout shells
- forms, buttons, labels, and grouped controls
- navigation, feedback, and data-display patterns
- plugin-facing screens used as visual references
- official public plugin UI docs

Use the public plugin docs first. Reach for this file only when you need to trace a design recommendation back to local CMS implementation details for visual calibration.

## Local CMS calibration (optional)

These roots are local visual references only:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories`

Do not import private classes or copy CMS bundles into plugins. Read these files only to understand structure, spacing, and visual rhythm, then rebuild the same feel with plugin-local code.

## Foundations

| Area | Source | Use it for |
| - | - | - |
| Core tokens | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css` | spacing scale, font sizes, body colors, border colors, semantic colors, easing |
| Base element defaults | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_base.css` | text input padding, focus ring, border treatment, body typography, scrollbar behavior |
| Theme CSS vars | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/store/subscribers/listenToChangeThemeCssVars.ts` | which theme colors are promoted to CSS custom properties |
| Plugin theme object | `node_modules/datocms-plugin-sdk/dist/types/ctx/base.d.ts` | `ctx.theme.primaryColor`, `accentColor`, `lightColor`, `darkColor`, `semiTransparentAccentColor` |
| Canvas-provided vars | `/Users/marcelofinamorvieira/datoCMS/skills/skills/datocms-plugin-builder/references/sdk-architecture.md` | safe plugin-facing variable names injected inside `<Canvas>` |
| Motion and easing defaults | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/_css-variables.css`, `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_button.css` | transition durations, easing curves, hover/active opacity |

## Layout shells

| Area | Source | Use it for |
| - | - | - |
| Page wrapper component | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/Page/Page.tsx` | max-width variants and page-level composition |
| Page header and actions | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/Page/PageHeader.tsx` | title, explainer, action placement |
| Page sections | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/Page/PageSection.tsx` | divider-led section titles, collapsible sections |
| Page styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Page.css` | page padding, widths, title scale, section margins, highlighted sections |
| Full-height shell | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/FullHeightScrollingLayout/index.tsx` | sidebar and split-pane shells |
| Full-height styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_FullHeightScrollingLayout.css` | header/footer borders, scrollable center pane |
| Toolbar styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Toolbar.css` | toolbar height, back buttons, title rhythm, inline actions |
| Grid helpers | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_grid.css` | older multi-column layout proportions |

## Forms and controls

| Area | Source | Use it for |
| - | - | - |
| Field wrapper | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/form/Field.tsx` | label, hint, error, append-to-field pattern |
| Label | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/form/Label.tsx` | required marker, localized icon, inline info affordance |
| Submit button | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/form/SubmitButton.tsx` | primary action defaults and loading behavior |
| Form styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_form.css` | field spacing, label rhythm, hint and error placement |
| Button styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_button.css` | button sizes, primary or muted or destructive hierarchy |
| Input group styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_input-group.css` | prefix/suffix controls |

## Navigation, feedback, and data display

| Area | Source | Use it for |
| - | - | - |
| Dropdown component | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/Dropdown/index.tsx` | trigger and menu composition |
| Dropdown styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Dropdown.css` | menu density, hover states, group titles |
| Tabs component | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/Tabs.tsx` | simple tab shells |
| Tabs styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Tabs.css` | tab density and active-state logic |
| SidebarPanel | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/SidebarPanel.tsx` | compact collapsible sidebar sections |
| SidebarPanel styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_SidebarPanel.css` | header background, content padding, open/closed rhythm |
| Table styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_table.css` | row padding, header tone, border hierarchy |
| Blank slate component | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/components/ui/BlankSlate/index.tsx` | empty-state content shape |
| Blank slate styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_blank-slate.css` | restrained empty-state typography |
| Notice styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Notice.css` | inline callouts with muted surface |
| Info styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Info.css` | highlighted contextual guidance |
| Badge styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Badge.css` | tiny uppercase status tags |
| Modal styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Modal.css` | backdrop, content width, header and body treatment |

## Plugin-facing CMS screens worth copying structurally

| Area | Source | Use it for |
| - | - | - |
| Marketplace plugin list page | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/routes/(authenticated)/configuration/plugins/new/index.tsx` | full-height header/search/footer layout |
| Marketplace sidebar | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/routes/(authenticated)/configuration/plugins/new/sidebar.tsx` | left-rail grouping and menu density |
| Plugin form and info panels | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_PluginForm.css` | plugin settings shells, notices, info cards |
| New plugin page styles | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_NewPlugin.css` | search bar, section boxes, readme treatment |
| Plugin cards | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_PluginCard.css` | summary-card rhythm and metadata density |
| Plugin iframe container | `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_PluginInput.css` | iframe background and padding expectations |

## Storybook references

| Story | Source | Use it for |
| - | - | - |
| Page basics | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories/Page/Basic.story.tsx` | narrow centered content |
| Header example | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories/Page/WithHeader.story.tsx` | title + explainer + actions |
| Sections | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories/Page/WithSections.story.tsx` | section spacing and titles |
| Full example | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories/Page/CompleteExample.story.tsx` | page rhythm for real settings screens |
| Full-height layout | `/Users/marcelofinamorvieira/datoCMS/dev/cms/src/stories/FullHeightScrollingLayout/FullHeightScrollingLayout.story.tsx` | split layouts and bordered headers or footers |

## Official public docs (default source of truth)

Use the public docs for component API shape and plugin-surface behavior:

- React UI Components: <https://www.datocms.com/docs/plugin-sdk/react-datocms-ui>
- Form: <https://www.datocms.com/docs/plugin-sdk/form>
- Section: <https://www.datocms.com/docs/plugin-sdk/section>
- Button: <https://www.datocms.com/docs/plugin-sdk/button>
- Button group: <https://www.datocms.com/docs/plugin-sdk/button-group>
- Sidebar panel: <https://www.datocms.com/docs/plugin-sdk/sidebar-panel>
- Toolbar: <https://www.datocms.com/docs/plugin-sdk/toolbar>
- Dropdown: <https://www.datocms.com/docs/plugin-sdk/dropdown>
- Sidebars and split views: <https://www.datocms.com/docs/plugin-sdk/sidebars-and-split-views>
- Config screen: <https://www.datocms.com/docs/plugin-sdk/config-screen>
- Sidebars and sidebar panels: <https://www.datocms.com/docs/plugin-sdk/sidebar-panels>

## How to use this map

1. Start from the touched plugin surface and the public docs listed above.
2. Use the local CMS files only if you need finer visual calibration.
3. Copy spacing, alignment, density, and hierarchy — not the private class names.
4. Prefer a public `datocms-react-ui` primitive if it covers the same shape.
5. If not, build a local wrapper with Canvas variables and plugin-local CSS.
