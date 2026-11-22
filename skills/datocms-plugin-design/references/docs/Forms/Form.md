# Forms

The inputs of the package are controlled: each one gets a `value` and calls
`onChange` with the new value. They use no form library, so your plugin keeps
the values in `useState`, or in the form library that you like. Put each
input in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md). It draws the label, the error and the hint, and
gives the input its ids and its ARIA props. Each input has its own page in
the sidebar.

## Label and hint

[`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md) draws its label and its hint with `Label` and `FieldHint`. Use
them alone only for a control that is not an input of a field.

`Label` draws the label above the input. Its `htmlFor` is the `id` of the
input, so a click on the label moves the focus to the input, and a screen
reader reads the label as the name of the input. `FieldHint` draws a short
help text under the input, and a link to the docs.

- `label` is a `Message`: a plain string, an element, or `{ html }` for
  markup. `required` adds an asterisk. `optional` adds “(optional)”. Use it
  when most of the fields are required. A label cannot be `required` and
  `optional`: the types do not let you give both.
- `hidden` hides the label from the eye, and a screen reader still reads
  it. Use it when a text near the input shows what it is.
- `hint` is a short help text, and it is a `Message` too. The HTML of a hint
  (`hint={{ html }}`) is the one `Message` that the package does not
  sanitize: give it only HTML that you trust. `docs` adds a link to the
  docs: `{ label, to }`.

The label points to the input, and the hint says what to type.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function LabelAndHint() {
  const [name, setName] = useState<string | null>('');

  return (
    <FieldWrapper
      label="Project name"
      required
      hint="The name that the dashboard shows."
      docs={{ label: 'About projects', to: 'https://www.datocms.com/docs' }}
    >
      <StringInput
        value={name}
        placeholder="Marketing site"
        onChange={setName}
      />
    </FieldWrapper>
  );
}
```

## Space between fields

The fields of a form are one under the other, with `--form-field-gap`
between them. The last field has no space below it. A block of your own
between two fields (a note, a preview) takes the same space:
`margin-bottom: var(--form-field-gap)`.

## Fields side by side

Two fields that the user reads as one line (first name and last name, city
and ZIP) go in a `<div className="form__field form__row">`, with one
`form__row__cell` for each field (`form__row__cell--wide` for a field that
takes two parts). When the row is too narrow, even in a modal or a panel,
the fields go one under the other.

`form__field-group` is a different thing: small inputs as wide as their
content, with text between them, for example the limits of a validator.

## Input contract

All the inputs of the package have the same props. An input is a React
component that does not know the form. It gets the value and two functions,
and it calls them.

- `value` is the value of the field. `onChange(newValue)` takes the new
  value, not an event. `onBlur(newValue)` runs when the user leaves the
  input: the form marks the field as touched and checks the value. A choice
  input (a radio group, a switch, a SegmentedControl) has no typing, and a
  pick is a finished edit. So it calls `onChange` and then `onBlur`.
- `id` is the `id` that the label points to. Put it on the element that has
  the focus. `name` is the name of the field. `disabled` says that the user
  cannot change the value.
- The `aria-labelledby`, `aria-invalid`, `aria-required` and
  `aria-describedby` of the field go to the input, and `lang` and `dir` for
  a text with a language. The input passes them on to its element. A group
  input (a radio group, a SegmentedControl) has no element for the `id`: it
  puts `aria-labelledby` on its group element. An input in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md)
  gets them from `useFieldInput`.
- The other props of an input are in its page, after the contract.

Type the props of an input with `BaseInputComponentPropsField<Value>`. An
input that has a `readOnly` mode uses
`BaseInputComponentPropsFieldWithReadOnly<Value>`.

- `name` and `onBlur` are optional. A controlled input outside a form needs
  no name and no blur.
- The `onBlur` of a react-final-form `input` takes no value, so give
  `() => input.onBlur()`.
- A disabled input has no use for `onChange` either, so it is optional in
  the `disabled: true` variant.

An input of your own calls `useFieldInput`: see the example in [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md).

The page of each input has only the props of that input, and links here for
the contract.

## CSS variables

## CSS variables

- `--form-field-gap`: The space between two fields, one under the other. A block of your own between the fields uses it to keep the rhythm of the form.

