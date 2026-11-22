# List and detail

A section whose elements have facts to scan and to sort across rows: the
collaborators, the SSO users and groups, the members of an organization,
the events of an activity log. The list is a table, and a click on a row
opens the detail of the element in a panel on the right: beside the list,
or over it (see “Where the panel goes”).

Every list of DatoCMS uses the same parts, so the lists behave the same.

| Pattern | The element is | Example |
| - | - | - |
| List and detail | Facts to scan and compare: a table, and a panel to read and change one element. | Collaborators, activity logs |
| [List and form](https://react-ui.datocms.com/Patterns/ListAndForm.md) | A form: a narrow list and the form on the right. | Roles, API tokens, webhooks |

Click a row, or use the arrows when a row is open. Escape closes the
panel, and `]` closes it and opens it again. Drag the borders of the list and of the panel to change their
widths. The filter narrows the list, and the role changes in the
panel.

```tsx
import Avatar from 'datocms-react-ui/Avatar';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InfoList from 'datocms-react-ui/InfoList';
import {
  ListDetail,
  ListDetailWidthsProvider,
  useOpenRowRoute,
} from 'datocms-react-ui/ListDetail';
import Main from 'datocms-react-ui/Main';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import {
  type ClientSortColumn,
  Table,
  useClientSort,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import StatusCell from 'datocms-react-ui/Table/cells/StatusCell';
import Toolbar, { useFilterToolbar } from 'datocms-react-ui/Toolbar';
import React, { useMemo, useState } from 'react';
import { AddIcon, RemoveUserIcon } from '@/icons';

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  invited: boolean;
};

const ROLES = ['Admin', 'Developer', 'Editor'];

const MEMBERS: Member[] = [
  {
    id: 'ada',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'Admin',
    invited: false,
  },
  {
    id: 'alan',
    name: 'Alan Turing',
    email: 'alan@example.com',
    role: 'Developer',
    invited: false,
  },
  {
    id: 'grace',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    role: 'Editor',
    invited: false,
  },
  {
    id: 'katherine',
    name: 'Katherine Johnson',
    email: 'katherine@example.com',
    role: 'Editor',
    invited: true,
  },
];

const BASE_URL = '/members';

const DEFAULT_LAYOUT = {
  columns: [
    { name: 'name', width: 3 },
    { name: 'status', width: 2 },
    { name: 'role', width: 2 },
  ],
};

function MemberStatus({ member }: { member: Member }) {
  return member.invited ? (
    <StatusCell tone="warning">Invitation sent</StatusCell>
  ) : (
    <StatusCell tone="success">Member</StatusCell>
  );
}

function MemberDetail({
  member,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}) {
  return (
    <ListDetail.Panel
      title="Member"
      entity={{
        image: <Avatar name={member.name} email={member.email} size="large" />,
        title: member.name,
        subtitle: member.email,
      }}
      actions={
        <Dropdown.Option
          icon={<RemoveUserIcon />}
          alert={true}
          onPick={onRemove}
        >
          Remove from project
        </Dropdown.Option>
      }
    >
      <SidebarPanel title="Details">
        <InfoList>
          <InfoList.Row title="Status">
            <MemberStatus member={member} />
          </InfoList.Row>
          <InfoList.Row title="Role">
            <Dropdown
              triggerComponent={Dropdown.TextualTrigger}
              label={member.role}
            >
              <Dropdown.Menu>
                <Dropdown.Group name="Change role">
                  {ROLES.map((role) => (
                    <Dropdown.Option
                      key={role}
                      active={role === member.role}
                      onPick={() => onChangeRole(role)}
                    >
                      {role}
                    </Dropdown.Option>
                  ))}
                </Dropdown.Group>
              </Dropdown.Menu>
            </Dropdown>
          </InfoList.Row>
        </InfoList>
      </SidebarPanel>
    </ListDetail.Panel>
  );
}

function Members() {
  const [members, setMembers] = useState(MEMBERS);
  const [query, setQuery] = useState('');
  const openRowRoute = useOpenRowRoute(BASE_URL);
  const filterToolbar = useFilterToolbar({
    isFiltering: query !== '',
    onClear: () => {
      const previous = query;
      setQuery('');
      return () => setQuery(previous);
    },
  });

  const columns = useMemo<ClientSortColumn<Member>[]>(
    () => [
      {
        name: 'name',
        label: 'Name',
        minWidth: 180,
        sortable: true,
        renderCell: (member) => member.name,
        compare: (a, b) => a.name.localeCompare(b.name),
      },
      {
        name: 'status',
        label: 'Status',
        priority: 1,
        renderCell: (member) => <MemberStatus member={member} />,
      },
      {
        name: 'role',
        label: 'Role',
        priority: 2,
        renderCell: (member) => member.role,
      },
    ],
    [],
  );

  const filtered = members.filter((member) =>
    `${member.name} ${member.email}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const { rows, sort } = useClientSort(filtered, columns);
  const openMember = members.find((member) => member.id === openRowRoute.id);

  return (
    <Main>
      <ListDetail.Page
        title="Members"
        subtitle={`${members.length} members`}
        filter={{
          toolbar: filterToolbar,
          form: (
            <Toolbar.FilterInput
              value={query}
              onChange={setQuery}
              autoFocus={filterToolbar.autoFocus}
              onClose={filterToolbar.onClose}
            />
          ),
        }}
        button={
          <Toolbar.Button
            tone="primary"
            icon={AddIcon}
            label="Invite"
            onClick={() => {}}
          />
        }
        state={rows.length === 0 && query ? 'no-results' : 'ready'}
        detail={{
          panel: openMember && (
            <MemberDetail
              key={openMember.id}
              member={openMember}
              onChangeRole={(role) =>
                setMembers(
                  members.map((member) =>
                    member.id === openMember.id ? { ...member, role } : member,
                  ),
                )
              }
              onRemove={() => {
                setMembers(
                  members.filter((member) => member.id !== openMember.id),
                );
                openRowRoute.close();
              }}
            />
          ),
          onClose: openRowRoute.close,
          onReopen: openRowRoute.reopen,
          placement: 'beside',
        }}
      >
        <Table
          columns={columns}
          layout={layout}
          onLayoutChange={setLayout}
          sort={sort}
        >
          <Table.Header />
          <Table.Body>
            {rows.map((member) => (
              <Table.Row
                key={member.id}
                row={member}
                active={member.id === openRowRoute.id}
                openWithArrows={Boolean(openMember)}
                onOpen={() => openRowRoute.open(member.id)}
              />
            ))}
          </Table.Body>
        </Table>
      </ListDetail.Page>
    </Main>
  );
}

export default function ListAndDetail() {
  // The app keeps the widths once, near the root (see ListDetailWidthsProvider)
  const [listWidth, setListWidth] = useState<number>();
  const [detailWidth, setDetailWidth] = useState<number>();

  return (
    <ListDetailWidthsProvider
      value={{
        listWidth,
        onListWidthChange: setListWidth,
        detailWidth,
        onDetailWidthChange: setDetailWidth,
      }}
    >
      <div style={{ position: 'relative', height: 480 }}>
        <Members />
      </div>
    </ListDetailWidthsProvider>
  );
}
```

## Parts

[`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md) puts the parts together. Put it in the [`Main`](https://react-ui.datocms.com/Layout/Landmarks.md) of your
plugin, and give it the data:

- **The title bar**: `title` (a level 1 heading), `help`, `subtitle` (the
  count), `menu` (the “⋮”), `display` (the menu of the layout and of the
  order, after the “⋮”), `busy` (a small spinner while the list loads in
  the background), `controls` before the filter toggle, and `button` at the
  end (for example “Invite”).
- **The filter**: `filter={{ toolbar, form }}`. `toolbar` is the result of
  `useFilterToolbar` (`datocms-react-ui/Toolbar`), and `form` shows in a bar under the
  title bar while the filter is open. For
  example, the filter form of the records list in DatoCMS.
- **The list**: the `children`, a [`Table`](https://react-ui.datocms.com/Lists/Table.md) (`datocms-react-ui/Table`) whose rows open the
  element with `onOpen`. The open row is `active`, and with
  `openWithArrows` the arrows open the next or the previous row.
- **The panel**: `detail={{ panel, onClose, placement }}`.

  - `panel` is a `ListDetail.Panel`, or nothing when no row is open. Give it
    a `key` with the ID of the element, so the panel starts again for each
    element.
  - `onClose` closes the open row. It runs on Escape, on `]`, and on the
    close button. When the panel goes over the list, it also runs on a click
    on an empty part of the list.
  - `onReopen` opens the last open row again. Then `]` opens and closes the
    panel, as it does for the sidebar of a [`SplitPane`](https://react-ui.datocms.com/Layout/SplitPane.md).
  - `placement` says where the panel goes (see below).

  A list without a detail gives no `detail`. While the element loads, the
  panel gets only `title` and `state="loading"`, or `state="failed"` when the
  load fails.
- **The bar under the list**: `footer` (for example the pagination).

## Open row in the URL

`useOpenRowRoute(baseUrl)` reads the open row from the URL
(`<baseUrl>/<id>`) and gives `open`, `close` and `reopen` (for
`onReopen`). When the open row is not in this URL,
`useReopenLastRow(openId, open)` gives the same `reopen`. The open and the close keep
the query of the URL, so the list keeps its filter and its page. While a
row is open, opening another row replaces the step in the history. The
Back button of the browser closes the panel. It does not go through each
row.

Give `idPattern` (the source of a regular expression for the segment of
the id, for example `"\\d+"`) when other routes are under the base URL.
Then a route under the open row (`<baseUrl>/12/delete`, a dialog) keeps the
row open. The hook reads the URL from the location of the host (see the
navigation of [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md)). Without a location, no row is open from the URL.

## Panel

`ListDetail.Panel` has a title bar and the facts of the element:

- `title` is the type of the element (“Member”, “Event”). It is a level 2
  heading and the name of the panel for screen readers.
- `entity` shows the element on top: its name, a line under it (the
  email), and an image (an avatar).
- The `children` are [`SidebarPanel`](https://react-ui.datocms.com/Layout/SidebarPanel.md)s with an [`InfoList`](https://react-ui.datocms.com/Lists/InfoList.md): one row for each
  fact. A value that the user changes is a row with a [`TextualTrigger`](https://react-ui.datocms.com/Actions/DropdownTriggers.md) menu
  (the role of a member). The panel is narrow, so do not put a form or a
  [`SettingsList`](https://react-ui.datocms.com/Lists/SettingsList.md) in it.
- `actions` are the options of the “⋮”: only the actions that the user can
  do, with the destructive one last, red, after a separator.
- `toolbarAction` is the main action, a primary `milli` button at the end
  of the title bar (“Open project”).
- `loading`, `failed` and `fetching` show the state of the element while it
  loads.

## Where the panel goes

`detail.placement` says where the panel goes. It has no default. Choose it
from the shape of your table, not from what its rows are: the same kind
of element can have a narrow table in one plugin and a wide one in
another.

- **`beside`**: the panel is on the right of the list, and the table gets
  the width that is left. Use it when the table still reads well next to
  a panel of 500px: few columns, with short values (a name, a status, a
  date, a count). The user sees all the columns while a row is open, so
  they can open one row after the other and compare them. With no open
  row, the space of the panel shows the same blank slate in every list
  (“Nothing selected”): do not give a blank slate of your own.
- **`over`**: the list takes all the width, and the open panel goes over
  the right part of the list, with a shadow. Use it when the table needs
  all the width: many columns, or long values (a URL, a payload, a
  description) that wrap or get cut next to the panel. The panel covers
  the columns on the right, so put the columns that the user reads to
  choose a row on the left. There is no blank slate, because no space
  waits for the panel.

The members example at the top of this page uses `beside`: its table has
three short columns.

A table with six columns: the panel goes over its right part. A click on
another row changes the panel, and a click on an empty part of the list
closes it.

```tsx
import InfoList from 'datocms-react-ui/InfoList';
import {
  ListDetail,
  ListDetailWidthsProvider,
  useOpenRowRoute,
} from 'datocms-react-ui/ListDetail';
import Main from 'datocms-react-ui/Main';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import {
  type ClientSortColumn,
  Table,
  useClientSort,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import React, { useMemo, useState } from 'react';

type ActivityEvent = {
  id: string;
  action: string;
  record: string;
  model: string;
  user: string;
  environment: string;
  date: string;
};

const EVENTS: ActivityEvent[] = [
  {
    id: 'e1',
    action: 'Record published',
    record: 'How we migrated to GraphQL',
    model: 'Blog post',
    user: 'Ada Lovelace',
    environment: 'main',
    date: '2026-11-17 09:12',
  },
  {
    id: 'e2',
    action: 'Record updated',
    record: 'Pricing tiers for the new plans',
    model: 'Page',
    user: 'Alan Turing',
    environment: 'main',
    date: '2026-11-17 08:47',
  },
  {
    id: 'e3',
    action: 'Asset uploaded',
    record: 'team-offsite-lisbon-2026.jpg',
    model: 'Asset',
    user: 'Grace Hopper',
    environment: 'main',
    date: '2026-11-16 17:30',
  },
  {
    id: 'e4',
    action: 'Field created',
    record: 'Reading time',
    model: 'Blog post',
    user: 'Katherine Johnson',
    environment: 'feature-reading-time',
    date: '2026-11-16 15:02',
  },
  {
    id: 'e5',
    action: 'Record deleted',
    record: 'Old landing page for the 2019 launch',
    model: 'Page',
    user: 'Ada Lovelace',
    environment: 'main',
    date: '2026-11-15 11:24',
  },
];

const BASE_URL = '/events';

const DEFAULT_LAYOUT = {
  columns: [
    { name: 'action', width: 2 },
    { name: 'record', width: 3 },
    { name: 'model', width: 2 },
    { name: 'user', width: 2 },
    { name: 'environment', width: 2 },
    { name: 'date', width: 2 },
  ],
};

function EventDetail({ event }: { event: ActivityEvent }) {
  return (
    <ListDetail.Panel
      title="Event"
      entity={{ title: event.action, subtitle: event.record }}
    >
      <SidebarPanel title="Details">
        <InfoList>
          <InfoList.Row title="Model">{event.model}</InfoList.Row>
          <InfoList.Row title="User">{event.user}</InfoList.Row>
          <InfoList.Row title="Environment">{event.environment}</InfoList.Row>
          <InfoList.Row title="Date">{event.date}</InfoList.Row>
        </InfoList>
      </SidebarPanel>
    </ListDetail.Panel>
  );
}

function Events() {
  const openRowRoute = useOpenRowRoute(BASE_URL);

  const columns = useMemo<ClientSortColumn<ActivityEvent>[]>(
    () => [
      {
        name: 'action',
        label: 'Event',
        minWidth: 140,
        renderCell: (event) => event.action,
      },
      {
        name: 'record',
        label: 'Record',
        minWidth: 200,
        priority: 1,
        renderCell: (event) => event.record,
      },
      {
        name: 'model',
        label: 'Model',
        priority: 3,
        renderCell: (event) => event.model,
      },
      {
        name: 'user',
        label: 'User',
        priority: 2,
        renderCell: (event) => event.user,
      },
      {
        name: 'environment',
        label: 'Environment',
        priority: 4,
        renderCell: (event) => event.environment,
      },
      {
        name: 'date',
        label: 'Date',
        priority: 2,
        sortable: true,
        renderCell: (event) => event.date,
        compare: (a, b) => a.date.localeCompare(b.date),
      },
    ],
    [],
  );

  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const { rows, sort } = useClientSort(EVENTS, columns);
  const openEvent = EVENTS.find((event) => event.id === openRowRoute.id);

  return (
    <Main>
      <ListDetail.Page
        title="Activity"
        subtitle={`${EVENTS.length} events`}
        state="ready"
        detail={{
          panel: openEvent && (
            <EventDetail key={openEvent.id} event={openEvent} />
          ),
          onClose: openRowRoute.close,
          onReopen: openRowRoute.reopen,
          placement: 'over',
        }}
      >
        <Table
          columns={columns}
          layout={layout}
          onLayoutChange={setLayout}
          sort={sort}
        >
          <Table.Header />
          <Table.Body>
            {rows.map((event) => (
              <Table.Row
                key={event.id}
                row={event}
                active={event.id === openRowRoute.id}
                openWithArrows={Boolean(openEvent)}
                onOpen={() => openRowRoute.open(event.id)}
              />
            ))}
          </Table.Body>
        </Table>
      </ListDetail.Page>
    </Main>
  );
}

export default function OverPlacement() {
  // The app keeps the widths once, near the root (see ListDetailWidthsProvider)
  const [listWidth, setListWidth] = useState<number>();
  const [detailWidth, setDetailWidth] = useState<number>();

  return (
    <ListDetailWidthsProvider
      value={{
        listWidth,
        onListWidthChange: setListWidth,
        detailWidth,
        onDetailWidthChange: setDetailWidth,
      }}
    >
      <div style={{ position: 'relative', height: 420 }}>
        <Events />
      </div>
    </ListDetailWidthsProvider>
  );
}
```

With `over`, the list stays usable under the panel: a click on
another row changes the panel, and the buttons and the fields of the
list stay usable. A click on an empty part of the list, Escape, `]` and
the close button of the panel close it.

Below 1100px of window width, the panel always goes over the list, for
both placements. Then the panel has a fixed width and no sash.

Whenever the panel goes over the list, it has a close button (a cross) at
the end of its title bar, on every window width. Its sash only changes
its width: it has no button.

## Widths

With `beside`, the list takes the width that leaves the panel 500px before
the user resizes it, but not more than 1100px. The user resizes the list
and the panel with the sashes on their right borders. The space on the
right of the panel stays empty. In a smaller window, the list becomes
narrower (the panel keeps at least 360px). With no open row, the list
keeps its width.

With `over` in a window wider than 1100px, the user resizes the panel with
the sash on its left border: a drag to the left makes it wider. The panel
keeps at least 360px, and it leaves at least 360px of the list visible.
It uses the same width as the panel of `beside`, so the panel keeps its
width when the user goes from one list to another.

To keep the two widths after a resize, put a `ListDetailWidthsProvider`
once near the root of the plugin. Give it the two widths and their
`on…Change` callbacks, and keep the widths in your storage (for example
`localStorage`): all the lists inside it share them. Without the provider, the split uses the
default widths and does not keep a resize.

## Empty section

A section with no elements shows only its overview, in the whole area of the
page: no title bar, no table, no panel. A table with no rows and an empty
space for the panel have no use. Give `overview`: a [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) with
`titleLevel={1}` (the name of the section is the title of the page), a
description of what the elements are, the docs, and the action that adds
the first element. The page puts it in a `ListDetail.Overview`, which has
the largest width of the split: the overview is in the center of the same
area as the list and the panel.

“Send test calls” loads the calls for one second: a spinner, then the
list. “Clear the log” in the “⋮” of the title bar goes back to the
overview.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import Button from 'datocms-react-ui/Button';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import InfoList from 'datocms-react-ui/InfoList';
import { ListDetail, useOpenRowRoute } from 'datocms-react-ui/ListDetail';
import { getListOrOverviewState } from 'datocms-react-ui/ListOrOverview';
import Main from 'datocms-react-ui/Main';
import SidebarPanel from 'datocms-react-ui/SidebarPanel';
import {
  Table,
  type TableColumn,
  useInMemoryTableLayout,
} from 'datocms-react-ui/Table';
import StatusCell from 'datocms-react-ui/Table/cells/StatusCell';
import React, { useMemo, useState } from 'react';
import { DeleteIcon, SendIcon, WebhooksIcon } from '@/icons';

type Call = { id: string; webhook: string; event: string; code: number };

const TEST_CALLS: Call[] = [
  { id: '3', webhook: 'Rebuild site', event: 'Record published', code: 200 },
  { id: '2', webhook: 'Slack', event: 'Record created', code: 500 },
  { id: '1', webhook: 'Rebuild site', event: 'Record updated', code: 200 },
];

const BASE_URL = '/webhook-calls';

const DEFAULT_LAYOUT = {
  columns: [
    { name: 'webhook', width: 3 },
    { name: 'status', width: 2 },
  ],
};

function CallStatus({ call }: { call: Call }) {
  return call.code < 300 ? (
    <StatusCell tone="success">{call.code}</StatusCell>
  ) : (
    <StatusCell tone="danger">{call.code}</StatusCell>
  );
}

function WebhookCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loaded, setLoaded] = useState(true);
  const openRowRoute = useOpenRowRoute(BASE_URL);
  const [layout, setLayout] = useInMemoryTableLayout(DEFAULT_LAYOUT);
  const openCall = calls.find((call) => call.id === openRowRoute.id);

  const columns = useMemo<TableColumn<Call>[]>(
    () => [
      {
        name: 'webhook',
        label: 'Webhook',
        renderCell: (call) => call.webhook,
      },
      {
        name: 'status',
        label: 'Status',
        renderCell: (call) => <CallStatus call={call} />,
      },
    ],
    [],
  );

  // The example loads the calls for one second, as a request to the server
  const sendTestCalls = () => {
    setLoaded(false);
    setTimeout(() => {
      setCalls(TEST_CALLS);
      setLoaded(true);
    }, 1000);
  };

  return (
    <Main>
      <ListDetail.Page
        title="Webhook calls"
        subtitle={`${calls.length} calls`}
        menu={
          <Dropdown.Option
            icon={<DeleteIcon />}
            alert={true}
            onPick={() => {
              setCalls([]);
              openRowRoute.close();
            }}
          >
            Clear the log
          </Dropdown.Option>
        }
        state={getListOrOverviewState(loaded, calls.length === 0)}
        overview={
          <BlankSlate
            placement="area"
            icon={<WebhooksIcon />}
            title="Webhook calls"
            titleLevel={1}
            description="Each time a webhook runs, its call shows here, with the request and the response of the server."
            docs={[
              {
                href: 'https://www.datocms.com/docs/general-concepts/webhooks',
              },
            ]}
            actions={
              <Button
                tone="primary"
                icon={SendIcon}
                label="Send test calls"
                onClick={sendTestCalls}
              />
            }
          />
        }
        detail={{
          panel: openCall && (
            <ListDetail.Panel
              key={openCall.id}
              title="Webhook call"
              entity={{ title: openCall.webhook, subtitle: openCall.event }}
            >
              <SidebarPanel title="Response">
                <InfoList>
                  <InfoList.Row title="Status">
                    <CallStatus call={openCall} />
                  </InfoList.Row>
                </InfoList>
              </SidebarPanel>
            </ListDetail.Panel>
          ),
          onClose: openRowRoute.close,
          placement: 'beside',
        }}
      >
        <Table columns={columns} layout={layout} onLayoutChange={setLayout}>
          <Table.Header />
          <Table.Body>
            {calls.map((call) => (
              <Table.Row
                key={call.id}
                row={call}
                active={call.id === openRowRoute.id}
                openWithArrows={Boolean(openCall)}
                onOpen={() => openRowRoute.open(call.id)}
              />
            ))}
          </Table.Body>
        </Table>
      </ListDetail.Page>
    </Main>
  );
}

export default function EmptySection() {
  return (
    <div style={{ position: 'relative', height: 420 }}>
      <WebhookCalls />
    </div>
  );
}
```

A list that cannot be empty (the members of the first example) gives no
`overview`.

## States

`state` says what the page shows. It uses [`ListOrOverview`](https://react-ui.datocms.com/Layout/ListOrOverview.md),
with one more state:

| State | What shows |
| - | - |
| `loading` | A spinner in all the page, before the first load. |
| `empty` | Only the `overview` (see above). |
| `no-results` | The page, with the “no results” state instead of the table: the filter keeps no element. The section is not empty. |
| `ready` | The page, with the table. |

For a list in memory, `getListOrOverviewState(loaded, empty)` gives
`loading`, `empty` or `ready`; give `no-results` when the filter keeps no
row (the first example). For a log that the server filters and paginates,
`getPaginatedListState(isEmpty, isFiltering)` gives the state: `isEmpty` is
undefined until the first load ends, and it keeps the last value during a
new load, so a refresh does not show the
spinner or the overview again.

## Without the page

`ListDetail.Split` is the split alone: the list on the left and the
`detail` on the right, with the placement, the widths, the sashes and
Escape. Use it only for a list whose page has more than the
states of [`ListDetail.Page`](https://react-ui.datocms.com/Layout/Page.md) (the audit log of DatoCMS, with its own
filter bar). Do not write a
split of a list and a detail again.

