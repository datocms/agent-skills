# Choice inputs

Three inputs: two for a choice that shows all its options, and one for a
single toggle.

| Use | For |
| - | - |
| `SwitchInput` | One setting that is on or off, and takes effect as it is. The label is next to the switch. |
| `RadioGroupInput` | Two to five options that the user must compare, or a boolean where each answer needs a name (“The whole record” or “Only some content”). Each option can have a hint. |
| [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md) | More than five options, or options that the user must search. |

Both follow the contract of an input: `value`, `onChange` and `onBlur`.
[`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md) adds the hint and the error, and the label of a radio group.
The tables below show only the own props of the inputs.

## SwitchInput

A switch with its label next to it. The `label` names the switch, and a
click on it flips the switch. A switch with no label is a switch that no one
can name. In a form, put it in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md) with no `label`, like every
other input. The field gives the space between the fields, and draws the
`hint`, the `error` and the reason of `forcedOn` under the label of the
switch.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import React, { useState } from 'react';

export default function Switches() {
  const [publish, setPublish] = useState<boolean | null>(true);
  const [canDelete, setCanDelete] = useState<boolean | null>(false);
  const [inherited, setInherited] = useState<boolean | null>(false);

  return (
    <>
      <FieldWrapper>
        <SwitchInput
          label="Can publish records"
          value={publish}
          onChange={setPublish}
        />
      </FieldWrapper>
      <FieldWrapper hint="The role can also delete the records of other users.">
        <SwitchInput
          label="Can delete records"
          value={canDelete}
          onChange={setCanDelete}
        />
      </FieldWrapper>
      <FieldWrapper>
        <SwitchInput
          label="Can edit the schema"
          value={inherited}
          onChange={setInherited}
          forcedOn={{ reason: 'The role Editor gives this permission.' }}
        />
      </FieldWrapper>
      <FieldWrapper>
        <SwitchInput label="Disabled" value={true} disabled />
      </FieldWrapper>
    </>
  );
}
```

**Do:** Name the setting, not the action: “Can publish records”.

```tsx
<SwitchDemo label="Can publish records" initial={true} />
```

**Don’t:** Do not use a switch for a choice between two things. Use radios, so each answer has a name.

```tsx
<SwitchDemo label="Whole record or some content" initial={true} />
```

### Switch lists

Put a list of related switches, for example the permissions of a role, in a
`SwitchList`. Each `SwitchInput` in it is an inset row: the label on the
left, the switch on the right, and a box that shows on hover. The switches
are in one column, where the eye finds them, and a click anywhere in the row
changes the switch. Put one list in a [`Page.Group`](https://react-ui.datocms.com/Layout/Page.md) for each topic.

In a row, the reason of `forcedOn` is on the left of the switch. When the
label and the reason do not fit on one line of the row, the reason goes under
the label. A row with a hint is a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md) with a `hint` around the
switch. The hint is under the label, and the column of the switch stays
empty under the switch.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { Page } from 'datocms-react-ui/Page';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import SwitchList from 'datocms-react-ui/SwitchList';
import React, { useState } from 'react';

export default function SwitchListExample() {
  const [webhooks, setWebhooks] = useState<boolean | null>(true);
  const [tokens, setTokens] = useState<boolean | null>(false);
  const [builds, setBuilds] = useState<boolean | null>(false);
  const [search, setSearch] = useState<boolean | null>(true);

  return (
    <Page>
      <Page.Content>
        <Page.Group title="Automations and integrations">
          <SwitchList>
            <SwitchInput
              label="Create and edit webhooks"
              value={webhooks}
              onChange={setWebhooks}
            />
            <FieldWrapper hint="Also lets the role delete API tokens.">
              <SwitchInput
                label="Create and edit API tokens"
                value={tokens}
                onChange={setTokens}
              />
            </FieldWrapper>
            <SwitchInput
              label="Create and edit build triggers"
              value={builds}
              onChange={setBuilds}
              forcedOn={{ reason: 'Inherited from Developer' }}
            />
            <SwitchInput
              label="Perform Site Search API calls"
              value={search}
              onChange={setSearch}
            />
          </SwitchList>
        </Page.Group>
      </Page.Content>
    </Page>
  );
}
```

## RadioGroupInput

A list of options, each with a string `value`. Give `options`. In a
[`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md), the label of the field names the group. A `hint` shows
under the label of an option. A disabled option can have a `tooltip` that
says why.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import RadioGroupInput from 'datocms-react-ui/RadioGroupInput';
import React, { useState } from 'react';

export default function Radios() {
  const [metadataType, setMetadataType] = useState<string | null>('url');
  const [format, setFormat] = useState<string | null>('email');

  return (
    <>
      <FieldWrapper label="Metadata type">
        <RadioGroupInput
          value={metadataType}
          onChange={setMetadataType}
          options={[
            {
              value: 'url',
              label: 'Metadata URL',
              hint: 'We read the metadata from a URL.',
            },
            {
              value: 'xml',
              label: 'Metadata XML',
              hint: 'You paste the metadata.',
            },
          ]}
        />
      </FieldWrapper>
      <FieldWrapper label="Format">
        <RadioGroupInput
          small
          value={format}
          onChange={setFormat}
          options={[
            { value: 'url', label: 'URL' },
            { value: 'email', label: 'E-mail address' },
            { value: 'custom', label: 'Custom pattern' },
            {
              value: 'locked',
              label: 'Not available',
              disabled: true,
              tooltip: 'Your plan has no access.',
            },
          ]}
        />
      </FieldWrapper>
    </>
  );
}
```

The user picks one option. A group with no value shows no option as on. The
user cannot clear the value. To let the user pick “none”, add an option for
it.

A choice between a few options that stand for a service or a place (where
the code of a website goes: Netlify, Vercel, the machine of the user) is a
`RadioGroupInput` whose options have an `icon` and a `hint`. The `icon` is
the logo of the service, after the text. The `hint` says what happens, and
what it needs. It is not a [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md) with logos in the options: the
options are the decision of the step, so they must all show.

For a boolean, map `true` and `false` to two string values.

## Props

### SwitchList

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The fields: a `Field` with a `SwitchInput` for each setting |
| `className` | `string` | No | | |

### SwitchInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `label` | `Message` | Yes | | The text next to the switch. It is the name of the switch, and a click on it flips the switch. An element shows as it is: it must be a `Label` that points to the `id` of the switch. Do not give a `label` to a `FieldWrapper` around the switch. |
| `forcedOn` | `{ reason: Message; }` | No | | Another setting forces the value to true, for example a permission that a role gets from another role. An off switch then shows as on and faded, and the reason shows under it (in a `SwitchList`, before the switch). The screen reader reads the reason too. |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label. |
| `aria-invalid` | `boolean` | No | | Set when the value has an error. A `FieldWrapper` gives it. |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint. A `FieldWrapper` gives it. |
| `aria-required` | `boolean` | No | | Set when the field is required. A `FieldWrapper` gives it. |

### RadioGroupInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `aria-describedby` | `string` | No | | The `id` of the error and of the hint of the field |
| `aria-invalid` | `React.AriaAttributes['aria-invalid']` | No | | Set when the value has an error |
| `aria-labelledby` | `string` | No | | The `id` of the text of the label of the field |
| `aria-required` | `React.AriaAttributes['aria-required']` | No | | Set when the field is required |
| `options` | `readonly RadioGroupOption<T>[]` | Yes | | The options of the group. To let the user pick no value, add an option for it. |
| `small` | `boolean` | No | | A group with a smaller gap and smaller text |

#### Types

`RadioGroupOption` — One option of a radio group

```ts
export type RadioGroupOption<T extends string = string> = {
  /** The value that the form gets when the user picks this option */
  value: T;
  /** The text of the option */
  label: Message;
  /** A short help text under the label */
  hint?: Message | null;
  /** A tooltip for the option, for example the reason why it is disabled */
  tooltip?: TextMessage | null;
  /** Tells that the user cannot pick this option */
  disabled?: boolean;
  /**
   * An icon or a logo before the text, for an option that stands for a
   * service or a place (a hosting provider, the machine of the user). Give it
   * to all the options of the group, or to none.
   */
  icon?: React.ReactNode;
  /**
   * An extra class for a mark of your own on this option, for example the
   * diff of two versions marks the options that changed
   */
  className?: string;
};
```

### RadioGroupOption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `value` | `T` | Yes | | The value that the form gets when the user picks this option |
| `label` | `Message` | Yes | | The text of the option |
| `hint` | `Message \| null` | No | | A short help text under the label |
| `tooltip` | `TextMessage \| null` | No | | A tooltip for the option, for example the reason why it is disabled |
| `disabled` | `boolean` | No | | Tells that the user cannot pick this option |
| `icon` | `React.ReactNode` | No | | An icon or a logo before the text, for an option that stands for a service or a place (a hosting provider, the machine of the user). Give it to all the options of the group, or to none. |
| `className` | `string` | No | | An extra class for a mark of your own on this option, for example the diff of two versions marks the options that changed |
