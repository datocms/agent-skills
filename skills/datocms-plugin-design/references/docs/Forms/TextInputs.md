# Text inputs

All the inputs follow one contract: `value`, `onChange`, `onBlur`, `id`,
`name`, `disabled`. Your plugin keeps the value in its own state and gives it
to the input. The props of that contract are not in the tables of this page.

A `disabled` input keeps its value readable, on a neutral fill. A `readOnly`
input keeps the focus and the selection, so the user can copy its value.

Put the input in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md). It adds the label, the hint and the error,
and gives the input its `id` and its ARIA props.

| Use | For |
| - | - |
| `StringInput` | One line of text. It is the input of the string fields of a record, and of most forms. |
| `TextareaInput` | A text of more lines: a description, a note, a payload. It grows with its text. |
| `NumberInput` | An integer or a float. |
| `DebouncedTextInput` | A search or filter: the value changes one second after the last key, not on each key. |
| `AutosizeInput` | A wrapper that makes an `input` as wide as its text. For a filter bar, not a form. |
| `PasswordInput` | A password, with a button that shows it. |
| `OtpInput` | The six digits of an authentication code. |

For a text with formatting (Markdown, HTML, structured text), a choice or a
date, see the other inputs of [Forms](https://react-ui.datocms.com/Forms/Form.md).

## StringInput

`StringInput` is the default look of an input. An empty input gives `null`, not
an empty string, so a click in and out of an empty field does not change the
value. It takes all the attributes of an `input` (`autoComplete`,
`inputMode`, `maxLength`, `spellCheck`, ...).

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function StringInputExample() {
  const [name, setName] = useState<string | null>('');
  const [email, setEmail] = useState<string | null>('');

  return (
    <>
      <FieldWrapper label="Name">
        <StringInput
          placeholder="Marketing site"
          value={name}
          onChange={setName}
        />
      </FieldWrapper>
      <FieldWrapper label="Email" hint="We send the invoices to this address.">
        <StringInput
          placeholder="billing@example.com"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          inputMode="email"
          maxLength={120}
        />
      </FieldWrapper>
    </>
  );
}
```

**Do:** Give a label: it names the field. The placeholder shows an example.

```tsx
<TextDemo label="Name" placeholder="Marketing site" />
```

**Don’t:** Do not put the instructions in the placeholder: it goes away when the user types.

```tsx
<TextDemo label="Name" placeholder="Type the name of the site, 3 to 20 letters" />
```

## TextareaInput

`TextareaInput` is the input of a text of more lines. It follows the same
rules as `StringInput`: an empty input gives `null`, and a click in and out
of it does not change the value. The user cannot resize it, because the
input grows with its text.

- `rows` is the smallest height (2 lines by default).
- `maxRows` is the largest height. After it, the text scrolls.
- `code` gives the monospaced font to a value that is code (a JSON payload,
  a certificate).

It takes all the attributes of a `textarea` (`maxLength`, `spellCheck`,
`dir`, ...), and `readOnly`.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import TextareaInput from 'datocms-react-ui/TextareaInput';
import React, { useState } from 'react';

export default function TextareaInputExample() {
  const [description, setDescription] = useState<string | null>('');
  const [certificate, setCertificate] = useState<string | null>('');

  return (
    <>
      <FieldWrapper
        label="Description"
        hint="The search engines show it under the title."
      >
        <TextareaInput
          placeholder="A short summary of the page"
          value={description}
          onChange={setDescription}
          maxLength={160}
        />
      </FieldWrapper>
      <FieldWrapper label="Certificate">
        <TextareaInput
          placeholder="-----BEGIN CERTIFICATE-----"
          value={certificate}
          onChange={setCertificate}
          code
          rows={4}
          maxRows={10}
          spellCheck={false}
        />
      </FieldWrapper>
    </>
  );
}
```

**Do:** Use a TextareaInput when the value can have more than one line.

```tsx
<TextareaDemo label="Notes" />
```

**Don’t:** Do not use it for a value of one line (a title, a URL): the Enter key adds a line break.

```tsx
<TextareaDemo label="Title" rows={1} />
```

## NumberInput

`NumberInput` shows a text input, not a `type="number"` input, so the browser
does not change the value with the mouse wheel or the arrows. The input keeps
the text that the user types, and `onChange` gets only a number, or `null` for
an empty input. A text that is not a complete number yet (`-`, `1.`) does not
call `onChange`. When the user leaves the input, it goes back to
the `value`.

`inputMode` picks the keyboard of a touch device: `"numeric"` for an integer,
`"decimal"` (the default) for the others.

The input has no `min`, `max` or `step`: check the limits in your own code, and
give the `error` to the field.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import NumberInput from 'datocms-react-ui/NumberInput';
import React, { useState } from 'react';

export default function NumberInputExample() {
  const [quantity, setQuantity] = useState<number | null>(12);
  const [price, setPrice] = useState<number | null>(9.9);

  return (
    <>
      <FieldWrapper label="Quantity">
        <NumberInput
          value={quantity}
          onChange={setQuantity}
          placeholder="0"
          autoComplete="off"
          inputMode="numeric"
        />
      </FieldWrapper>
      <FieldWrapper label="Price">
        <NumberInput
          value={price}
          onChange={setPrice}
          placeholder="0.00"
          autoComplete="off"
        />
      </FieldWrapper>
    </>
  );
}
```

## DebouncedTextInput

Use `DebouncedTextInput` when each change of the value starts work: a search,
a filter of a list. It keeps the text in its own state, and gives it to
`onChange` one second after the user stops. A new `value` replaces the
text. It is the input of the filter of the toolbar.

Type in the input. The value changes later.

```tsx
import DebouncedTextInput from 'datocms-react-ui/DebouncedTextInput';
import React, { useState } from 'react';

// The state changes one second after the last key. The text under the input
// shows the value that the state has now.
export default function DebouncedTextInputExample() {
  const [query, setQuery] = useState<string | null>(null);

  return (
    <>
      <DebouncedTextInput
        name="query"
        placeholder="Search by name or ID"
        aria-label="Search"
        value={query}
        onChange={setQuery}
        onBlur={() => {}}
      />
      <p>Current value: {query ?? '(empty)'}</p>
    </>
  );
}
```

## AutosizeInput

`AutosizeInput` is not an input: it is a wrapper. It puts a hidden copy of
the text in the same grid cell as its `input`, so the browser makes the
cell as wide as the real text in the real font. Give the value as `text` and
the placeholder of the input as `placeholder`. The wrapper uses the
placeholder while the text is empty.

Set the `font-size`, the `--autosize-input-padding-inline` and the
`--autosize-input-border-inline` on the wrapper (with `className`), not on
the input, because the hidden copy uses them too. Their default values are
the padding and the border of a standard input. For an input with no border,
set `--autosize-input-border-inline: 0px`. A CSS variable lets a layout
change the padding, for example in a media query.

`DebouncedTextInput` uses `AutosizeInput` when you give `autosize`.

```tsx
import AutosizeInput from 'datocms-react-ui/AutosizeInput';
import React, { useState } from 'react';

// The wrapper is as wide as the text in the input, or as its placeholder
// when the input is empty.
export default function AutosizeExample() {
  const [text, setText] = useState('');
  const placeholder = 'Filter value';

  return (
    <AutosizeInput text={text} placeholder={placeholder}>
      <input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </AutosizeInput>
  );
}
```

## PasswordInput

`PasswordInput` is a password input with a ghost button inside, on the
right. The button shows or hides the password, and has a translated label.
It has the contract of an input, and it passes the attributes of an `input`
element (`autoComplete`, `onFocus`) to the `input`.

Set `autoComplete` to the value that the password manager needs:
`current-password` to log in, `new-password` to create a password.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import PasswordInput from 'datocms-react-ui/PasswordInput';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function PasswordExample() {
  const [email, setEmail] = useState<string | null>('');
  const [password, setPassword] = useState<string | null>('');

  return (
    <>
      <FieldWrapper label="Email">
        <StringInput
          value={email}
          onChange={setEmail}
          autoComplete="username"
        />
      </FieldWrapper>
      <FieldWrapper label="Password">
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </FieldWrapper>
    </>
  );
}
```

## Props

### StringInput

The contract of an input is at the top of this page. The other props go
to the `input` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### TextareaInput

The contract of an input is at the top of this page. The other props go
to the `textarea` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a JSON payload, a certificate, an XML document. |
| `rows` | `number` | No | `2` | The smallest height of the input, in lines. The input grows with its text. |
| `maxRows` | `number` | No | | The largest height of the input, in lines. A longer text scrolls in the input. Without it, the input grows with all its text. |

Example of `placeholder`:

```tsx
"A short summary for the search engines"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- `autoComplete`, `cols`, `dirName`, `form`, `maxLength`, `minLength`, `required`, `wrap` (from `TextareaHTMLAttributes`)

### NumberInput

The contract of an input is at the top of this page. The other props go
to the `input` element.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `inputMode` | `'numeric' \| 'decimal'` | No | `'decimal'` | The keyboard that a touch device shows: "numeric" for an integer, "decimal" for a number with a decimal point. |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). |

Example of `placeholder`:

```tsx
"0"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### DebouncedTextInput

It has the props of `StringInput`, and the contract of an input.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `autosize` | `boolean` | No | `false` | Makes the input as wide as its text (or its placeholder), with `AutosizeInput`. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### AutosizeInput

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `text` | `string` | Yes | | The text that sets the width, usually the value of the input. |
| `placeholder` | `string \| null` | No | | The text that sets the width when `text` is empty. Give the placeholder of the input. |
| `className` | `string` | No | | A class for the wrapper. Set the `font-size`, the `--autosize-input-padding-inline` and the `--autosize-input-border-inline` of the input with it. The default values are the padding and the border of a standard input. |
| `children` | `ReactNode` | Yes | | The `input` element. |

### PasswordInput

The contract of an input is at the top of this page.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`
