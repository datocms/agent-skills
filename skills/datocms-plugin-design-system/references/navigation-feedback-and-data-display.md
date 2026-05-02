# Navigation, Feedback, and Data Display

Primary sources:

- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Dropdown.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Tabs.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_table.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_blank-slate.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Notice.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Info.css`
- `/Users/marcelofinamorvieira/datoCMS/dev/cms/styles/blocks/_Badge.css`

## Contents

- Dropdowns
- Tabs
- Tables
- Lists and summary rows
- Blank slates
- Notices and info blocks
- Badges and tags
- Native-feel checks for data display

## Dropdowns

Official doc: <https://www.datocms.com/docs/plugin-sdk/dropdown>

CMS dropdowns are:

- compact
- white surface
- 4px radius
- subtle shadow
- simple hover fill using `var(--light-bg-color)`

Use grouped titles sparingly. A flat list is often better.

## Tabs

Tabs are acceptable for a small set of peer views. Use them when the content belongs on the same screen and users switch frequently.

Avoid tabs when a vertical section flow would be clearer.

CMS tab styling is restrained:

- light background strip
- active tab reads as a raised white surface
- invalid tabs can use alert color, but only for true validation/state issues

## Tables

Tables in the CMS are left-aligned, border-led, and compact.

### Defaults worth copying

- cell padding around `10px 20px`
- subdued header text color
- bottom borders for row separation
- white cells and limited surface decoration

Use tables for structured comparison or operational lists. Use simple stacked rows for lighter metadata views.

## Lists and summary rows

Plugin-card-like rows from the CMS are useful when a full table is too heavy.

Common ingredients:

- compact thumbnail or icon
- title + one or two metadata lines
- secondary metadata aligned to the edge
- border or separator instead of deep card chrome

## Blank slates

Blank slates in the CMS are centered but still restrained.

Good blank slate content:

- one short title
- one sentence of context
- one action if the next step is obvious

Bad blank slate content:

- big illustration first, meaning later
- three paragraphs of explanation
- multiple equal actions

## Notices and info blocks

Use a notice or info block when users need contextual guidance that should stay attached to the screen.

### Notice

Use a muted surface block when the message is informative or transitional.

### Info block

Use a highlighted left-edge treatment for stronger guidance, warnings, or multi-line contextual details.

Keep both compact. If the message becomes a tutorial, move it elsewhere.

## Badges and tags

CMS badges are tiny, uppercase, and used for real status or classification.

Use them for:

- state labels
- environment markers
- compact category indicators

Do not turn every metadata point into a badge.

## Native-feel checks for data display

- Is the layout readable without color?
- Would a simple divider solve the problem better than another card?
- Are there too many status chips?
- Is secondary metadata lighter and smaller than primary labels?
- Does an empty state still feel like part of the same plugin, not a splash page?
