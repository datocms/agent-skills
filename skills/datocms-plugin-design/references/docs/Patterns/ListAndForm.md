# List and form

A section of the settings whose elements are forms: the roles, the API
tokens, the webhooks, the plugins, the build triggers. The list of the
elements is on the left, and the form of the open element is on the right.
Each element has its own URL, so the browser history and a link go to
the element.

For elements with facts to scan and sort across rows (the collaborators, an
activity log), use [List and detail](https://react-ui.datocms.com/Patterns/ListAndDetail.md): a table with a
detail panel, not a form.

Pick a role, change its name and save. “New role” (⌘⇧N) opens an empty
form; “Delete” in the “⋮” of the form goes back to the section.

```tsx
import BlankSlate from 'datocms-react-ui/BlankSlate';
import { Dropdown } from 'datocms-react-ui/Dropdown';
import EntityRow from 'datocms-react-ui/EntityRow';
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useOpenRowRoute } from 'datocms-react-ui/ListDetail';
import ListFormPage from 'datocms-react-ui/ListFormPage';
import Main from 'datocms-react-ui/Main';
import NavList from 'datocms-react-ui/NavList';
import { Page } from 'datocms-react-ui/Page';
import Pane, { useFilteredList } from 'datocms-react-ui/Pane';
import StringInput from 'datocms-react-ui/StringInput';
import Toolbar from 'datocms-react-ui/Toolbar';
import React, { useState } from 'react';
import { DeleteIcon, RolesIcon } from '@/icons';

type Role = { id: string; name: string };

const BASE_URL = '/roles';

export const ROLES: Role[] = [
  { id: 'admin', name: 'Admin' },
  { id: 'editor', name: 'Editor' },
  { id: 'translator', name: 'Translator' },
];

function RoleForm({
  role,
  onSave,
  onDelete,
}: {
  role?: Role;
  onSave: (name: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState<string | null>(role?.name ?? '');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(name ?? '');
      }}
    >
      <Pane
        header={
          <Pane.FormHeader>
            <Pane.FormHeader.Title>
              {role ? `Edit role “${role.name}”` : 'New role'}
            </Pane.FormHeader.Title>
            <Pane.FormHeader.Menu hidden={!onDelete}>
              <Dropdown.Option
                icon={<DeleteIcon />}
                alert={true}
                onPick={() => onDelete?.()}
              >
                Delete
              </Dropdown.Option>
            </Pane.FormHeader.Menu>
            <Pane.FormHeader.Submit>
              <Toolbar.Button tone="primary" submit label="Save" />
            </Pane.FormHeader.Submit>
          </Pane.FormHeader>
        }
      >
        <Page variant="large">
          <Page.Content>
            <FieldWrapper label="Name" required={true}>
              <StringInput value={name} onChange={setName} />
            </FieldWrapper>
          </Page.Content>
        </Page>
      </Pane>
    </form>
  );
}

/** The section of the roles: the list at the left, the form at the right */
export function RolesSection({ initialRoles }: { initialRoles: Role[] }) {
  const [roles, setRoles] = useState(initialRoles);
  // The URL tells what the form shows: nothing, "new", or "<id>/edit"
  const route = useOpenRowRoute(BASE_URL);
  const roleId = route.id?.split('/')[0];
  const role = roles.find(({ id }) => id === roleId);
  const { filter, filteredItems, hasNoResults } = useFilteredList(
    roles,
    (role) => [role.name],
  );

  const addNewButton = (
    <Toolbar.AddNewButton label="New role" to={`${BASE_URL}/new`} />
  );

  return (
    <ListFormPage
      baseUrl={BASE_URL}
      state={roles.length === 0 ? 'empty' : 'ready'}
      overview={
        <Main>
          <BlankSlate
            placement="area"
            icon={<RolesIcon />}
            title="Roles"
            titleLevel={1}
            description="The roles give the permissions to the collaborators."
            actions={addNewButton}
          />
        </Main>
      }
      list={
        <Pane
          ariaLabel="Roles"
          header={
            <Pane.Header filter={filter}>
              <Pane.Header.Title>Roles</Pane.Header.Title>
              <Pane.Header.Button>{addNewButton}</Pane.Header.Button>
            </Pane.Header>
          }
        >
          {hasNoResults ? (
            <Pane.FilterBlankSlate />
          ) : (
            <NavList>
              {filteredItems.map((role) => (
                <NavList.Item key={role.id} to={`${BASE_URL}/${role.id}/edit`}>
                  <EntityRow layout="row" title={role.name} />
                </NavList.Item>
              ))}
            </NavList>
          )}
        </Pane>
      }
    >
      <Main>
        {route.id === 'new' && (
          <RoleForm
            key="new"
            onSave={(name) => {
              const id = String(Date.now());
              setRoles([...roles, { id, name }]);
              route.open(`${id}/edit`);
            }}
          />
        )}
        {role && (
          // A new form for each role: the values come from the role
          <RoleForm
            key={role.id}
            role={role}
            onSave={(name) =>
              setRoles(
                roles.map((r) => (r.id === role.id ? { ...r, name } : r)),
              )
            }
            onDelete={() => {
              setRoles(roles.filter((r) => r.id !== role.id));
              route.close();
            }}
          />
        )}
        {route.id === undefined && (
          <BlankSlate
            placement="area"
            icon={<RolesIcon />}
            title="Pick a role, or create a new one"
          />
        )}
      </Main>
    </ListFormPage>
  );
}

export default function ListAndForm() {
  return (
    <div style={{ position: 'relative', height: 420 }}>
      <RolesSection initialRoles={ROLES} />
    </div>
  );
}
```

## Parts

`ListFormPage` puts the parts together:

- **The list** (`list`) is a [`Pane`](https://react-ui.datocms.com/Layout/Pane.md) of 300px with a
  [`Pane.Header`](https://react-ui.datocms.com/Layout/Pane.md): the title with its help and its presets, the filter, and a
  [`Toolbar.AddNewButton`](https://react-ui.datocms.com/Layout/Toolbar.md) (in the narrow pane, it shows only its icon). The
  content is a [`Nav`](https://react-ui.datocms.com/Layout/Landmarks.md) of links: each row is an inset row with an
  [`EntityRow`](https://react-ui.datocms.com/Lists/EntityRow.md), and the row of the open element is active.
- **The form** (`children`) is a [`Main`](https://react-ui.datocms.com/Layout/Landmarks.md) with the form that the URL of the section shows:
  `<baseUrl>/:id/edit` for an element, `<baseUrl>/new` for the new form,
  and a [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) when no element is open. Each form is a `form` element with a
  [`Pane`](https://react-ui.datocms.com/Layout/Pane.md), a [`Pane.FormHeader`](https://react-ui.datocms.com/Layout/Pane.md) in its `header` (the title, the “⋮” with the
  actions on the element and the delete, the Save button at the end), and a
  [`Page`](https://react-ui.datocms.com/Layout/Page.md) in its content.
- **The overview** (`overview`) is the content of an empty section.

The page has no title bar of its own: the title of the section is the title
of the list.

## Empty section

A section with no elements shows only its overview: a [`BlankSlate`](https://react-ui.datocms.com/Feedback/BlankSlate.md) with
`titleLevel={1}` (the name of the section is the title of the page), a
description, the docs and the button that adds the first element. A list
with no elements and a “No role selected” on its right have no use.

Click “New role”: an empty section shows the new form alone, with no
list. After the save, the list comes back.

```tsx
import React from 'react';
import { RolesSection } from './ListAndForm';

/** The same section with no roles: only the overview, with no list */
export default function EmptySection() {
  return (
    <div style={{ position: 'relative', height: 420 }}>
      <RolesSection initialRoles={[]} />
    </div>
  );
}
```

`ListFormPage` uses [`ListOrOverview`](https://react-ui.datocms.com/Layout/ListOrOverview.md) and takes its
`state` (see `getListOrOverviewState`): before the first load (`loading`) it
shows a spinner, because zero elements before the load does not mean that
the section is empty. A filter that keeps no element is not an
empty section: the list stays, with [`Pane.FilterBlankSlate`](https://react-ui.datocms.com/Layout/Pane.md) in it.

On another URL of the section (the new form), an empty section shows the
form alone.

## In the code

A section uses `ListFormPage` and gives it the list and the open form. The
`route` comes from `useOpenRowRoute(baseUrl)` (`datocms-react-ui/ListDetail`):
its `id` is `new`, `<id>/edit` or nothing.

```tsx
<ListFormPage
  baseUrl={baseUrl}
  state={getListOrOverviewState(loaded, roles.length === 0)}
  overview={<Main><BlankSlate placement="area" titleLevel={1} … /></Main>}
  list={
    <Pane ariaLabel="Roles" header={<Pane.Header filter={filter}>…</Pane.Header>}>
      <Nav ariaLabel="Roles">…</Nav>
    </Pane>
  }
>
  <Main>
    {route.id === 'new' && <NewRole />}
    {role && <EditRole role={role} />}
    {route.id === undefined && <BlankSlate placement="area" … />}
  </Main>
</ListFormPage>
```

Do not write the split, the overview or the spinner again in a section.

## Props

### ListFormPage

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `baseUrl` | `string` | Yes | | The URL of the section. Other URLs (for example the "new" form) always show the children. |
| `state` | `ListOrOverviewState` | Yes | | The state of the section (see getListOrOverviewState) |
| `overview` | `ReactElement` | Yes | | Shows instead of the children when the section is empty: a BlankSlate with titleLevel={1} in a Main |
| `list` | `ReactNode` | No | | The list of the elements: a Pane with a Pane.Header. With a list, the page shows the list and the children in a split. When the section is empty, the list has no use, so the children (for example the "new" form) show alone. |
| `children` | `ReactNode` | Yes | | The open element (a Main with the routes of the forms), or all the content of the section when there is no list |
