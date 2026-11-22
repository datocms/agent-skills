# ListOrOverview

The content of a section with a list: a spinner before the first load, the
overview when the section has no elements, and the list when it has some.
A list with no elements and a “No … selected” detail on its right have no
use. An empty section shows only the overview, in all its area.

Other components for other cases: do not use it directly for the common
cases. [`ListFormPage`](https://react-ui.datocms.com/Patterns/ListAndForm.md) (see [List and form](https://react-ui.datocms.com/Patterns/ListAndForm.md)) and
[`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md) use it for you.

## States

| State | What shows |
| - | - |
| `loading` | A spinner. The first load did not end: zero elements does not mean that the section is empty. |
| `empty` | Only the `overview`, with no title bar. |
| `ready` | The `children`: the list, and its detail. |

```tsx
import { ListOrOverviewState } from 'datocms-react-ui/ListOrOverview';
import SegmentedControl from 'datocms-react-ui/SegmentedControl';
import React, { useState } from 'react';
import { RolesSection } from './section';

const STATES = [
  { value: 'loading', label: 'loading' },
  { value: 'empty', label: 'empty' },
  { value: 'ready', label: 'ready' },
] as const;

export default function States() {
  const [state, setState] = useState<ListOrOverviewState>('ready');

  return (
    <>
      <div className="DocsControls">
        <SegmentedControl
          ariaLabel="State"
          options={STATES}
          value={state}
          onChange={setState}
        />
      </div>
      <RolesSection state={state} />
    </>
  );
}
```

## Overview

The overview is the page of the section while it has no elements: a
[`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) with `titleLevel={1}` (the name of the section is the title of
the page), a description of what the elements are for, the docs, and the
action that adds the first element. It has no title bar, and the action is
in the blank slate.

A list that cannot be empty (the collaborators) gives no `overview`, and its
state is only `loading` or `ready`. The types check it: `state="empty"`
without an `overview` does not compile. [`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md) follows the
same rule.

## State from the data

`getListOrOverviewState(loaded, empty)` gives the state. Give `loaded` true
only after the first load ends. Before it, the section has no elements, but
it is not empty.

Each button starts a load of one second: first the spinner, then the
list or the overview.

```tsx
import Button from 'datocms-react-ui/Button';
import { getListOrOverviewState } from 'datocms-react-ui/ListOrOverview';
import React, { useState } from 'react';
import { RolesSection } from './section';

/** Loads a section for one second, with roles or with no roles */
export default function FirstLoad() {
  const [loaded, setLoaded] = useState(true);
  const [count, setCount] = useState(3);

  const load = (nextCount: number) => {
    setLoaded(false);
    // Before the end of the load, the section has no roles: it is not empty
    setCount(0);
    setTimeout(() => {
      setCount(nextCount);
      setLoaded(true);
    }, 1000);
  };

  return (
    <>
      <div className="DocsControls">
        <Button label="Load 3 roles" onClick={() => load(3)} />
        <Button label="Load no roles" onClick={() => load(0)} />
      </div>
      <RolesSection state={getListOrOverviewState(loaded, count === 0)} />
    </>
  );
}
```

Two cases are not an empty section:

- **A filter that keeps no element.** The section has elements, so the
  state is `ready`. The list stays, with [`Pane.FilterBlankSlate`](https://react-ui.datocms.com/Layout/Pane.md) (or the
  “no results” state of [`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md)) in it.
- **A new load of a list with pages or a search on the server.** Keep the
  last state during the load, so the page does not show the spinner or
  the overview again.

## Props

### ListOrOverview

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `state` | `ListOrOverviewState \| Exclude<ListOrOverviewState, 'empty'>` | Yes | | The state of the section (see getListOrOverviewState) |
| `overview` (variant) | `ReactElement` | No | | All the area of the section when the section is empty: a BlankSlate with titleLevel={1}, a description, the docs and the action that adds the first element. It has no title bar. |
| `children` | `ReactNode` | Yes | | The list and the detail (a split pane), when the section has elements |

#### Types

`ListOrOverviewState` — The state of a section with a list: - "loading": the first load did not end. Zero elements does not mean that the section is empty. - "empty": the section has no elements. - "ready": the section has elements. A filter that keeps no element is also "ready", because the section is not empty.

```ts
export type ListOrOverviewState = 'loading' | 'empty' | 'ready';
```
