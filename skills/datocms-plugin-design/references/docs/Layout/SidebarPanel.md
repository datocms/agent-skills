# SidebarPanel

A section of a sidebar or of a detail panel. The title is a heading with a
button in it, and the button opens and closes the content. The panels of one
sidebar are one under the other, with a line between them.

| Use | For |
| - | - |
| `SidebarPanel` | A group of facts or controls in a sidebar (the sidebar of a record, the detail of a list row). |
| [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md) | A group of settings in the content of a page. |
| [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md) | The facts inside a panel. |

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import React from 'react';
import { AddIcon } from '@/icons';

const links = Array.from(
  { length: 12 },
  (_, index) => `Blog post ${index + 1}`,
);

export default function SidebarPanelExample() {
  return (
    <div style={{ width: 320 }}>
      <SidebarPanel title="Info">
        <InfoList>
          <InfoList.Row title="Created by">Mark Smith</InfoList.Row>
          <InfoList.Row title="Published at">3 October 2026</InfoList.Row>
        </InfoList>
      </SidebarPanel>
      <SidebarPanel
        title="Links"
        count={links.length}
        maxHeight={120}
        startOpen={false}
      >
        <ul style={{ margin: 0, paddingLeft: 'var(--spacing-l)' }}>
          {links.map((link) => (
            <li key={link}>{link}</li>
          ))}
        </ul>
      </SidebarPanel>
      <SidebarPanel title="Schedule">
        <SidebarPanel.Blank message="No schedule" />
        <SidebarPanel.Action
          icon={AddIcon}
          label="New schedule"
          onClick={() => undefined}
        />
      </SidebarPanel>
    </div>
  );
}
```

## Open and closed

A panel is open at first. Give `startOpen={false}` for a panel that the user
needs less, for example the links to other records. The panel keeps its open
state until it unmounts.

To keep the choice of the user, keep the open state in your code and give
it to `collapse`: `collapse={{ open, onToggle: setOpen }}`. You pick
where the state goes: a panel can keep it in the browser, another panel in
another place, and a third panel nowhere. Get the pair from a helper hook:

- `useLocalStorageSidebarPanelOpen(key, defaultOpen)` keeps the state in
  `localStorage`. Use a different key for each panel. When the browser blocks
  the storage, the state stays only in memory. All the panels go in one
  `localStorage` entry, `openSidebarPanels`, by key. The key does not get the
  id of the plugin, and all the published plugins have the same origin
  (`https://plugins-cdn.datocms.com`). So start each key with the name of the
  plugin.
- `useInMemorySidebarPanelOpen(defaultOpen)` keeps the state in memory,
  for code that must read or change it.
- For other storage (the parameters of a plugin), write your
  own `[open, setOpen]` pair.

`startOpen` and `collapse` exclude each other.

```tsx
import SidebarPanel, {
  useLocalStorageSidebarPanelOpen,
} from 'datocms-react-ui/SidebarPanel';
import React from 'react';

export default function StoredOpenStateExample() {
  const [open, setOpen] = useLocalStorageSidebarPanelOpen(
    'docs.sidebarPanel.links',
    false,
  );

  return (
    <div style={{ width: 320 }}>
      <SidebarPanel title="Links" collapse={{ open, onToggle: setOpen }}>
        Close the panel and load the page again: it stays closed.
      </SidebarPanel>
    </div>
  );
}
```

## Heading level

The title is a level 3 heading, after the level 2 title of a detail panel.
Give `titleLevel={2}` when no level 2 heading is above the panel, for
example in the sidebar of a record. Do not skip a level.

## Count, blank text and action

Give `count` to show a number after the title, for example the number of
links. The panel does not show it when it is 0.

Put `SidebarPanel.Blank` in the content when the panel has nothing to show.
Put `SidebarPanel.Action` in the content for a small action of the panel, for
example "New schedule". Its text is in line with the content.

## Content with its own inset

Give `flush` when the content has its own inset, for example a [`NavList`](https://react-ui.datocms.com/Navigation/NavList.md). The
content then goes from edge to edge, without the padding of the panel. To
keep the text of your own content in line with the title, give it the inset
of the panel: `padding-inline: var(--SidebarPanel-inset)`.

## Long content

Give `maxHeight` to a panel with a list of unknown length. The content
scrolls when it is taller.

## CSS variables

## CSS variables

- `--SidebarPanel-inset`: The space between the edges of the panel and its title and content. A flush content has no padding: it uses this inset to keep its text in line with the title.

