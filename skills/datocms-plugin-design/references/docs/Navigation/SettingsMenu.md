# SettingsMenu

The list of the sections of a settings area, in the pane on the left of the
settings pages (the settings of a project, the settings of an account or of
an organization).

| Use | For |
| - | - |
| `SettingsMenu` | The sections of one settings area. Each item is a page. |
| [`Toolbar.Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) and [`Toolbar.TabLink`](https://react-ui.datocms.com/Layout/Toolbar.md) | Few pages of one topic, in the title bar. |
| [`SidebarTree`](https://react-ui.datocms.com/Navigation/SidebarTree.md) | A tree that the user edits and reorders. |

Put the menu in a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md). It fills the pane and scrolls.

```tsx
import Pane from 'datocms-react-ui/Pane';
import SettingsMenu from 'datocms-react-ui/SettingsMenu';
import React from 'react';
import {
  BrowserIcon,
  CircleQuestionIcon,
  EditIcon,
  MailForYouIcon,
} from '@/icons';

export default function SettingsMenuExample() {
  return (
    <div style={{ position: 'relative', width: 280, height: 520 }}>
      <Pane
        header={
          <Pane.Header>
            <Pane.Header.Title>Settings</Pane.Header.Title>
          </Pane.Header>
        }
      >
        <SettingsMenu
          ariaLabel="Settings"
          footer={
            <SettingsMenu.Notice to="#help" icon={<CircleQuestionIcon />}>
              Anything missing? Go to the other settings.
            </SettingsMenu.Notice>
          }
        >
          <SettingsMenu.Group>
            <SettingsMenu.Item
              to="#projects"
              icon={<EditIcon />}
              label="Projects"
              active
            />
            <SettingsMenu.Item
              to="#members"
              icon={<EditIcon />}
              label="Members"
            />
          </SettingsMenu.Group>
          <SettingsMenu.Group name="Plan and usage">
            <SettingsMenu.Item
              to="#billing"
              icon={<EditIcon />}
              label="Billing"
              attention
            />
            <SettingsMenu.Item
              to="#usage"
              icon={<EditIcon />}
              label="Data usage"
            />
          </SettingsMenu.Group>
          <SettingsMenu.Group name="Partners">
            <SettingsMenu.Item
              icon={<BrowserIcon />}
              label="Agency profile"
              onClick={() => {}}
              newTab
            />
            <SettingsMenu.Item
              icon={<MailForYouIcon />}
              label="Partners newsletter"
              href="https://subscribepage.io/datocms-partners"
              newTab
            />
          </SettingsMenu.Group>
        </SettingsMenu>
      </Pane>
    </div>
  );
}
```

## Groups

A group has an optional `name`. Without a name, the group has no title.

## Items

An item does one of three things, with the same props as [`Button`](https://react-ui.datocms.com/Actions/Button.md):

- It goes to a page of DatoCMS (`to`).
- It goes to another site (`href`).
- It runs an action (`onClick`).

Give `newTab` to an item that opens another site in a new tab, and to an
action that opens a new tab. The item then shows an icon at its end.
`attention` shows a warning dot, for example for a billing problem.

The item is active when the URL matches `to`, even for a longer path. Give
`exact` to make it active only for the same URL, or `active` for a section
that is also active on other paths.

## Footer

Use `SettingsMenu.Notice` in `footer` for a link to the page where the user
can find a missing setting. The whole box is one link: to a page of DatoCMS
(`to`) or to another site (`href`, with `newTab` as on [`Button`](https://react-ui.datocms.com/Actions/Button.md)). Do not put
other links in its text.

