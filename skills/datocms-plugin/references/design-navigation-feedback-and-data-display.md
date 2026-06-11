# Navigation, Feedback, and Data Display

## Contents

- Dropdowns
- Tabs
- Tables
- Lists and summary rows
- Blank slates
- Notices and info blocks
- Badges and tags
- Data-display checks

## Dropdowns

Official doc: <https://www.datocms.com/docs/plugin-sdk/dropdown>

CMS dropdowns are:

- compact
- raised surface using `var(--color--surface-raised)`
- 4px radius
- subtle shadow
- simple hover fill using `var(--color--surface-raised-hover)` for elevated menus or `var(--color--surface-hover)` for inline rows

Use grouped titles sparingly. A flat list is often better.

## Tabs

Tabs are acceptable for a small set of peer views. Use them when the content belongs on the same screen and users switch frequently.

Avoid tabs when a vertical section flow would be clearer.

CMS tab styling is restrained:

- quiet background strip using `var(--color--surface-muted)`
- active tab reads as a raised selected or neutral surface
- invalid tabs can use danger/invalid tokens, but only for true validation/state issues

## Tables

Tables in the CMS are left-aligned, border-led, and compact.

### Defaults worth copying

- cell padding around `10px 20px`
- subdued header text color
- bottom borders for row separation
- neutral cells and limited surface decoration

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

## Data-display checks

- Is the layout readable without color?
- Would a simple divider solve the problem better than another card?
- Are there too many status chips?
- Is secondary metadata lighter and smaller than primary labels?
- Does an empty state stay inside the plugin flow instead of becoming a splash page?
