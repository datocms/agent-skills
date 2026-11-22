# SegmentedControl

A choice of one value from a few options that are always visible. The
change applies at once: there is no confirm button.

| Use | For |
| - | - |
| `SegmentedControl` | 2 to 4 short options for one setting: a layout, a period, a mode of a chart. |
| [`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) | Groups of content or pages, where the content changes below the tabs. |
| [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) | More than 4 options, or long labels. |
| A switch or a checkbox | A setting that is on or off. |

```tsx
import SegmentedControl from 'datocms-react-ui/SegmentedControl';
import React, { useState } from 'react';
import { GridIcon, MasonryIcon, TableIcon } from '@/icons';

const layoutOptions = [
  { value: 'grid', label: 'Grid', icon: <GridIcon /> },
  { value: 'row', label: 'Rows', icon: <MasonryIcon /> },
  { value: 'table', label: 'Table', icon: <TableIcon /> },
] as const;

const chartOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'cumulative', label: 'Cumulative' },
] as const;

export default function Options() {
  const [layout, setLayout] = useState<string>('grid');
  const [chart, setChart] = useState<string>('daily');

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-l)',
        justifyItems: 'start',
      }}
    >
      <SegmentedControl
        ariaLabel="Layout"
        options={layoutOptions}
        value={layout}
        onChange={setLayout}
      />
      <SegmentedControl
        ariaLabel="Show chart"
        options={chartOptions}
        value={chart}
        onChange={setChart}
      />
      <SegmentedControl
        ariaLabel="Search"
        options={[
          { value: 'filters', label: 'Filters' },
          { value: 'query', label: 'Query' },
        ]}
        value="filters"
        onChange={() => {}}
        disabled
      />
    </div>
  );
}
```

## Size

The options have the height of the buttons around them, with the same
`size` scale as [`Button`](https://react-ui.datocms.com/Actions/Button.md): "milli" in a toolbar, "field" in a toolbar of
fields, "small" outside a toolbar. Give `size` only when the control is not
next to buttons or fields.

With `fill`, the control takes the full width of its container and the
options share the free space equally (for example in a dropdown menu).

The control never gets wider than its container. When the labels do not
fit (for example in a translation), the options shrink and their labels end
in "…". The accessible name of each option keeps the full label. Keep the
labels short, so they fit in all the languages.

## Icons

An option can have an icon before its label. Give an icon to all the
options, or to none of them.

With `iconOnly`, each option shows only its icon, and its `label` becomes the
tooltip and the accessible name. Use it only when the icons are clear
without a text and the space is small, for example the color scheme in a
row of a menu.

**Do:** Use few options with short labels.

```tsx
<SegmentedControl
  ariaLabel="Period"
  options={[
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
  ]}
  value="week"
  onChange={() => {}}
/>
```

**Don’t:** Do not use it for a long list. Use a dropdown.

```tsx
<SegmentedControl
  ariaLabel="Locale"
  options={[
    { value: 'en', label: 'English' },
    { value: 'it', label: 'Italian' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'pt', label: 'Portuguese' },
  ]}
  value="en"
  onChange={() => {}}
/>
```

## Props

### SegmentedControl

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `ariaLabel` (variant) | `TextMessage` | No | | |
| `ariaLabelledBy` (variant) | `string` | No | | |
| `options` | `readonly SegmentedControlOption<T>[] \| readonly SegmentedControlIconOption<T>[]` | Yes | | |
| `iconOnly` | `boolean` | No | | |
| `value` | `T` | Yes | | The `value` of the selected option |
| `onChange` | `(value: T) => void` | Yes | | Runs when the user picks another option |
| `size` | `ButtonSize` | No | | The height of the options, with the padding of the Button sizes. The size of its container by default: "milli" in a toolbar, "field" in a toolbar of fields, "small" out of a toolbar (see useButtonSize). |
| `fill` | `boolean` | No | | The control takes the full width, and the options share it equally |
| `disabled` | `boolean` | No | | Turns off all the options |
| `className` | `string` | No | | Only for the position of the control (margin), not for its look |

#### Types

`SegmentedControlOption`

```ts
export type SegmentedControlOption<T extends string> = {
  /** The value that `onChange` gets, for example "grid" */
  value: T;
  /** The text of the option, for example "Grid" */
  label: Message;
  /** An icon before the label */
  icon?: React.ReactNode;
};
```

`SegmentedControlIconOption` — An option that shows only its icon

```ts
export type SegmentedControlIconOption<T extends string> = {
  /** The value that `onChange` gets, for example "dark" */
  value: T;
  /** The tooltip and the accessible name of the option, for example "Dark" */
  label: TextMessage;
  /** The icon of the option */
  icon: React.ReactNode;
};
```
