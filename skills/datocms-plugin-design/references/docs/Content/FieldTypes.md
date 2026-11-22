# Field types

DatoCMS shows the type of a field with the icon and the colors of its group,
and with the name of the type, for example in the fields of a model and in
the "Add new field" menu. Give these components the `field_type` of the
field, as the CMA gives it, so your plugin shows a field type as DatoCMS
does.

| Use | For |
| - | - |
| `FieldTypeAvatar` | The icon of the group of a field type, on the colors of the group. |
| `FieldTypeName` | The name of a field type, as text in the language of the user. |
| `useFieldTypeName` | The name of a field type as a string, when it is a part of a longer string. |
| `fieldTypeSurface` with an [`IconAvatar`](https://react-ui.datocms.com/Content/Avatar.md) | Your own icon on the colors of the group of a field type. |

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FieldTypeAvatar from 'datocms-react-ui/FieldTypeAvatar';
import FieldTypeName from 'datocms-react-ui/FieldTypeName';
import RowList from 'datocms-react-ui/RowList';
import React from 'react';

// The fields of a model, as the CMA gives them
const FIELDS = [
  { id: '1', label: 'Title', api_key: 'title', field_type: 'string' },
  { id: '2', label: 'Body', api_key: 'body', field_type: 'structured_text' },
  { id: '3', label: 'Cover image', api_key: 'cover_image', field_type: 'file' },
  { id: '4', label: 'Author', api_key: 'author', field_type: 'link' },
  {
    id: '5',
    label: 'Published on',
    api_key: 'published_on',
    field_type: 'date',
  },
];

export default function Fields() {
  return (
    <div style={{ width: 380 }}>
      <RowList>
        {FIELDS.map((field) => (
          <RowList.Item key={field.id}>
            <EntityRow
              layout="row"
              image={<FieldTypeAvatar fieldType={field.field_type} size={32} />}
              title={field.label}
              aside={field.api_key}
            >
              <FieldTypeName fieldType={field.field_type} />
            </EntityRow>
          </RowList.Item>
        ))}
      </RowList>
    </div>
  );
}
```

## Groups

DatoCMS puts the field types in groups, and each group has an icon and a
pair of colors. `fieldTypeGroups` gives the groups and their types, in the
order of the "Add new field" menu. The helpers of
`datocms-react-ui/utils/fieldTypes` give the parts of a field type:

| Helper | Gives |
| - | - |
| `fieldTypeGroups` | The groups, each with its `name` and its `types`, in the order of the "Add new field" menu. |
| `fieldGroupOf` | The group of a field type, or `undefined` for a type that it does not know. |
| `fieldTypeMessage` | The name of a field type, as a text for a prop that takes a `Message` or a `TextMessage`. |
| `fieldGroupMessage` | The name of a group, as a text for a prop that takes a `Message` or a `TextMessage`. |
| `fieldTypeSurface` | The `surface` of an [`IconAvatar`](https://react-ui.datocms.com/Content/Avatar.md) in the colors of the group of a field type. |

The module also exports the `FieldType` and `FieldGroupName` types.

```tsx
import { Dropdown } from 'datocms-react-ui/Dropdown';
import ButtonTrigger from 'datocms-react-ui/Dropdown/triggers/ButtonTrigger';
import FieldTypeAvatar from 'datocms-react-ui/FieldTypeAvatar';
import FieldTypeName from 'datocms-react-ui/FieldTypeName';
import {
  fieldGroupMessage,
  fieldTypeGroups,
  fieldTypeMessage,
} from 'datocms-react-ui/utils/fieldTypes';
import React, { useState } from 'react';

export default function TypeMenu() {
  const [fieldType, setFieldType] = useState('string');

  return (
    <Dropdown
      triggerComponent={ButtonTrigger}
      label={fieldTypeMessage(fieldType)}
    >
      <Dropdown.Menu minWidth={260}>
        {fieldTypeGroups.map((group) => (
          <Dropdown.Group key={group.name} name={fieldGroupMessage(group.name)}>
            {group.types.map((type) => (
              <Dropdown.Option
                key={type}
                active={type === fieldType}
                icon={<FieldTypeAvatar fieldType={type} size={20} />}
                onPick={() => setFieldType(type)}
              >
                <FieldTypeName fieldType={type} />
              </Dropdown.Option>
            ))}
          </Dropdown.Group>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

## Name as a string

`FieldTypeName` gives the name in JSX. When the name is a part of a string,
for example the text of a tooltip or a label that you build in a plain
function, call `useFieldTypeName` in your component. It is a named export
of `datocms-react-ui/FieldTypeName`, and it returns a function that gives
the name of a field type as a string. Pass this function to the code that
builds the string.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FieldTypeAvatar from 'datocms-react-ui/FieldTypeAvatar';
import { useFieldTypeName } from 'datocms-react-ui/FieldTypeName';
import RowList from 'datocms-react-ui/RowList';
import React from 'react';

type Field = { id: string; label: string; api_key: string; field_type: string };

const FIELDS: Field[] = [
  { id: '1', label: 'Title', api_key: 'title', field_type: 'string' },
  { id: '2', label: 'Position', api_key: 'position', field_type: 'lat_lon' },
  { id: '3', label: 'Sections', api_key: 'sections', field_type: 'rich_text' },
];

// A plain function, out of React: it gets the function of the hook
function describeField(
  field: Field,
  fieldTypeName: (fieldType: string) => string,
) {
  return `${field.api_key} · ${fieldTypeName(field.field_type)}`;
}

export default function NameAsString() {
  const fieldTypeName = useFieldTypeName();

  return (
    <div style={{ width: 380 }}>
      <RowList>
        {FIELDS.map((field) => (
          <RowList.Item key={field.id}>
            <EntityRow
              layout="row"
              image={<FieldTypeAvatar fieldType={field.field_type} size={32} />}
              title={field.label}
            >
              {describeField(field, fieldTypeName)}
            </EntityRow>
          </RowList.Item>
        ))}
      </RowList>
    </div>
  );
}
```

Do not make the name from the `field_type` string: `lat_lon` is
"Geolocation" in DatoCMS, not "Lat lon".

## Own icon

When your plugin shows its own icon for a field, for example its field
editor, give the [`IconAvatar`](https://react-ui.datocms.com/Content/Avatar.md) the colors of the field type with
`fieldTypeSurface`. The user then sees the group of the field at a glance.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import IconAvatar from 'datocms-react-ui/IconAvatar';
import RowList from 'datocms-react-ui/RowList';
import { fieldTypeSurface } from 'datocms-react-ui/utils/fieldTypes';
import React from 'react';
import { ParagraphIcon } from '@/icons';

// The fields where your plugin is the editor
const FIELDS = [
  { id: '1', label: 'Summary', api_key: 'summary', field_type: 'text' },
  { id: '2', label: 'Body', api_key: 'body', field_type: 'structured_text' },
  { id: '3', label: 'Sections', api_key: 'sections', field_type: 'rich_text' },
];

export default function Surface() {
  return (
    <div style={{ width: 380 }}>
      <RowList>
        {FIELDS.map((field) => (
          <RowList.Item key={field.id}>
            <EntityRow
              layout="row"
              image={
                <IconAvatar
                  icon={ParagraphIcon}
                  size={32}
                  surface={fieldTypeSurface(field.field_type)}
                />
              }
              title={field.label}
              aside={field.api_key}
            >
              Readability editor
            </EntityRow>
          </RowList.Item>
        ))}
      </RowList>
    </div>
  );
}
```

**Do:** Use fieldTypeSurface for the colors of a field type, so they follow the theme of DatoCMS.

```tsx
<IconAvatar icon={ParagraphIcon} size={32} surface={fieldTypeSurface('text')} />
```

**Don’t:** Do not show a field type on the brand surface or on colors of your own, because the user then does not see its group.

```tsx
<IconAvatar icon={ParagraphIcon} size={32} surface="primary" />
```

## Unknown types

The CMA can add a field type that this version of the package does not
know. `FieldTypeAvatar` then shows a generic icon on the neutral surface,
and `FieldTypeName` and `useFieldTypeName` give the `field_type` string.
They do not throw.

```tsx
import EntityRow from 'datocms-react-ui/EntityRow';
import FieldTypeAvatar from 'datocms-react-ui/FieldTypeAvatar';
import FieldTypeName from 'datocms-react-ui/FieldTypeName';
import React from 'react';

export default function UnknownType() {
  return (
    <EntityRow
      layout="row"
      image={<FieldTypeAvatar fieldType="audio" size={32} />}
      title="Podcast episode"
      aside="podcast_episode"
    >
      <FieldTypeName fieldType="audio" />
    </EntityRow>
  );
}
```

## Accessibility

`FieldTypeAvatar` is almost always next to the name of the type, so a
screen reader does not read it. Give it `ariaLabel` when no text near the
avatar says the type of the field.

## Props

### FieldTypeAvatar

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `fieldType` | `FieldType \| (string & {})` | Yes | | The `field_type` of the field, as the CMA gives it, for example `"rich_text"` |
| `size` | `number` | Yes | | The side of the square in pixels, for example 32 in the image of an EntityRow |
| `ariaLabel` | `TextMessage` | No | | The name for the screen readers. Use it only when no text near the avatar says the type of the field. Without it, the screen readers do not read the avatar. |

### FieldTypeName

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `fieldType` | `FieldType \| (string & {})` | Yes | | The `field_type` of the field, as the CMA gives it, for example `"rich_text"` |
