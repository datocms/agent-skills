# FieldWrapper

`FieldWrapper` draws a field of the forms of DatoCMS around one input: the
label, the input, the error and the hint. Use it around every input of
`datocms-react-ui` ([`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md), [`TextareaInput`](https://react-ui.datocms.com/Forms/TextInputs.md), [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md),
[`NumberInput`](https://react-ui.datocms.com/Forms/TextInputs.md), [`PasswordInput`](https://react-ui.datocms.com/Forms/TextInputs.md), [`RadioGroupInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md), [`TableList`](https://react-ui.datocms.com/Forms/ListInputs.md)...), and
around an input of your own.

**The field owns the accessibility, the input owns the value.** The field
makes the ids: the label points to the input, and the input gets the hint and
the error as its description, `aria-invalid` when there is an error, and
`aria-required` when the field is required. The input gets these props from
the field, so you give them to no one. The input keeps its own props:
`value`, `onChange`, `onBlur`, `disabled`, `placeholder`.

The error shows when the title is empty. Clear the input to see it.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import TextareaInput from 'datocms-react-ui/TextareaInput';
import React, { useState } from 'react';

const MAX_LENGTH = 160;

export default function LabelHintError() {
  const [title, setTitle] = useState<string | null>('Summer sale');
  const [description, setDescription] = useState<string | null>('');
  const length = description?.length ?? 0;

  return (
    <>
      <FieldWrapper
        label="Title"
        required
        hint="The title of the page"
        error={title ? undefined : 'Enter a title'}
      >
        <StringInput
          placeholder="Summer sale"
          value={title}
          onChange={setTitle}
        />
      </FieldWrapper>
      <FieldWrapper
        label="Description"
        hint={`At most ${MAX_LENGTH} characters. ${length} used.`}
        error={length > MAX_LENGTH ? 'The description is too long' : undefined}
      >
        <TextareaInput
          placeholder="A short text for the search engines"
          value={description}
          onChange={setDescription}
        />
      </FieldWrapper>
    </>
  );
}
```

- `label`, `hint` and `error` take a `Message`: a plain string, `{ id,
  values }` for a text of the `texts` of [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md), `{ html }` for markup, or
  an element. A plain string is plain text, so it is safe for a name that
  comes from the user.
- `error` is the error of the value. Without it, the value is valid. The
  field shows it under the input, and a screen reader reads it when it
  shows. Give the error as a prop, because an error that you draw yourself
  does not reach the input.
- `required` adds an asterisk and `aria-required`. `labelExtras.optional`
  adds "(optional)" when most of the fields are required. A field cannot be
  `required` and optional.
- `id` is the `id` of the input. Without it, the field makes one. Give it
  when another element points to the input.

**Do:** Give the error of the value to the field: the input gets the invalid state.

`<FieldWrapper error={title ? undefined : 'Enter a title'}>`

**Don’t:** Do not draw the error under the field yourself: the input does not get the invalid state, and a screen reader does not read it.

`</FieldWrapper>{error && <p>{error}</p>}`

## Switches

A [`SwitchInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md) names itself: its `label` is next to the switch, and a click
on it flips the switch. So a field around a switch takes no `label`, only
the `hint` and the `error`.

In a form, a switch goes in a `FieldWrapper` like every other input, even
without a hint. The field gives the space between the fields, and puts the
reason of `forcedOn` under the label. In a [`SwitchList`](https://react-ui.datocms.com/Forms/ChoiceInputs.md), a row is a bare
[`SwitchInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md), or a `FieldWrapper` with a hint around it. The list gives the
space.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import SwitchInput from 'datocms-react-ui/SwitchInput';
import React, { useState } from 'react';

export default function Switches() {
  const [enabled, setEnabled] = useState<boolean | null>(true);
  const [preview, setPreview] = useState<boolean | null>(false);

  return (
    <>
      <FieldWrapper>
        <SwitchInput
          label="Enable the plugin"
          value={enabled}
          onChange={setEnabled}
        />
      </FieldWrapper>
      <FieldWrapper
        hint="The editors see the draft in the preview pane."
        error={
          preview && !enabled
            ? 'Enable the plugin to use the preview'
            : undefined
        }
      >
        <SwitchInput
          label="Show the preview"
          value={preview}
          onChange={setPreview}
        />
      </FieldWrapper>
    </>
  );
}
```

**Do:** Give the label to the switch, and only the hint and the error to the field.

```tsx
<SwitchDemo />
```

**Don’t:** Do not give a label to the field around a switch: the switch has two names. The development build warns in the console.

`<FieldWrapper label="Show the preview"><SwitchInput … /></FieldWrapper>`

## Composite inputs

A composite input has more inputs in it: [`TableList`](https://react-ui.datocms.com/Forms/ListInputs.md), [`KeyValueList`](https://react-ui.datocms.com/Forms/ListInputs.md),
[`InputGroup.Root`](https://react-ui.datocms.com/Forms/InputGroup.md). It takes the field for its group element (the `id`, the
name and the description of the field). It stops the field for the inputs in
it, so each cell or input keeps its own name. A [`TableList`](https://react-ui.datocms.com/Forms/ListInputs.md) in a
`FieldWrapper` with a `label` needs no `ariaLabel`.

A composite input of your own does the same. It calls `useFieldInput` for
its group element, and renders its inner inputs in a
`FieldWrapper.Boundary`. Without the boundary, each inner input takes the
`id` of the field, and the page has the same `id` more than once.

```tsx
function Size({ width, height, onChange }: SizeProps) {
  // A group has no invalid or required state: take only the name and the
  // description
  const field = useFieldInput({});

  return (
    <div
      role="group"
      id={field.id}
      aria-labelledby={field['aria-labelledby']}
      aria-describedby={field['aria-describedby']}
    >
      <FieldWrapper.Boundary>
        <NumberInput aria-label="Width" value={width} onChange={…} />
        <NumberInput aria-label="Height" value={height} onChange={…} />
      </FieldWrapper.Boundary>
    </div>
  );
}
```

## Custom inputs

A custom input calls `useFieldInput` with its props, and puts the result on
the element that gets the focus. So it works in a `FieldWrapper`. A prop
that you give wins over the field. Outside a `FieldWrapper`, the hook
gives your props as they are. Type the props of the input with
`BaseInputComponentPropsField`, which this module exports (see the contract
of an input in [Forms](https://react-ui.datocms.com/Forms/Form.md)).

```tsx
import FieldWrapper, {
  type BaseInputComponentPropsField,
  useFieldInput,
} from 'datocms-react-ui/FieldWrapper';
import React, { useState } from 'react';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-/, '');
}

type SlugInputProps = BaseInputComponentPropsField<string | null>;

// The input of the plugin calls `useFieldInput`, and puts the result on the
// element that gets the focus: the label of the field points to it, and the
// screen reader reads the hint and the error.
function SlugInput(props: SlugInputProps) {
  const { value, onChange, onBlur, disabled } = props;
  const fieldProps = useFieldInput(props);

  return (
    <input
      type="text"
      {...fieldProps}
      className="form__input--code"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange?.(slugify(event.target.value) || null)}
      onBlur={() => onBlur?.(value)}
    />
  );
}

export default function CustomInput() {
  const [slug, setSlug] = useState<string | null>('summer-sale');

  return (
    <FieldWrapper
      label="Slug"
      hint="Lowercase letters, digits and dashes: the input changes the other characters."
      error={slug ? undefined : 'Enter a slug'}
    >
      <SlugInput value={slug} onChange={setSlug} />
    </FieldWrapper>
  );
}
```

## With react-final-form

`FieldWrapper` needs no form library. With react-final-form, give the
`input` of a `Field` to the input, and the state of `meta` to the
`FieldWrapper`. The `onBlur` of `input` takes no value, so wrap it. A
[`TableList`](https://react-ui.datocms.com/Forms/ListInputs.md) takes the errors of its cells itself: give it `meta.error`, and
`meta.submitFailed` as `touched`.

```tsx
import { Field } from 'react-final-form';

<Field name="title" validate={(value) => (value ? undefined : 'Enter a title')}>
  {({ input, meta }) => (
    <FieldWrapper
      label="Title"
      required
      error={meta.touched ? meta.error : undefined}
    >
      <StringInput
        value={input.value}
        onChange={input.onChange}
        onBlur={() => input.onBlur()}
      />
    </FieldWrapper>
  )}
</Field>

<Field name="options">
  {({ input, meta }) => (
    <FieldWrapper label="Options">
      <TableList
        value={input.value || []}
        onChange={input.onChange}
        errors={meta.error}
        touched={meta.submitFailed}
        columns={columns}
        emptyMessage="No options"
      />
    </FieldWrapper>
  )}
</Field>
```

