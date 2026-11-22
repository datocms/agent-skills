# InputGroup

An input with a text before it, after it, or both: the protocol and the domain
of a URL, the extension of a file name, the unit of a number. The addons show
the part of the value that the user does not type. The value of the field has
only the part that the user types.

| Use | For |
| - | - |
| `InputGroup` | A text input with a fixed text before or after it. |
| [`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md) | A text input with no fixed text. |

The group is the box of the field: the focus, the error and the disabled state
are on the box, not on the input. A click on an addon puts the focus in the
input. `InputGroup` has the contract of an input (`value`, `onChange`,
`onBlur`). Put it in a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md), like all the inputs.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import InputGroup from 'datocms-react-ui/InputGroup';
import React, { useState } from 'react';

export default function Addons() {
  const [confirm, setConfirm] = useState<string | null>('');
  const [basename, setBasename] = useState<string | null>('team-photo');
  const [width, setWidth] = useState<string | null>('1200');

  return (
    <div className="DocsNarrow">
      <FieldWrapper label="Type the subdomain of the project to confirm">
        <InputGroup
          value={confirm}
          onChange={setConfirm}
          pre="https://"
          post=".admin.datocms.com"
        />
      </FieldWrapper>
      <FieldWrapper label="File name">
        <InputGroup value={basename} onChange={setBasename} post=".jpeg" />
      </FieldWrapper>
      <FieldWrapper label="Max width">
        <InputGroup value={width} onChange={setWidth} post="px" />
      </FieldWrapper>
    </div>
  );
}
```

**Do:** Put the fixed part in an addon: the user types only the part that changes.

```tsx
<DomainDemo initial="marketing" post=".admin.datocms.com" />
```

**Don’t:** Do not ask the user to type the fixed part: it is long, and a typo makes the value not valid.

```tsx
<DomainDemo initial="marketing.admin.datocms.com" />
```

## Code

Give `code` to show the input and the addons in the monospaced font. Use it
when the value is code: a pattern, a slug, an API key. [`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md) takes
`code` too.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import InputGroup from 'datocms-react-ui/InputGroup';
import React, { useState } from 'react';

export default function Code() {
  const [pattern, setPattern] = useState<string | null>('^[a-z]+$');

  return (
    <div className="DocsNarrow">
      <FieldWrapper
        label="Custom pattern"
        hint="A regular expression, without the slashes."
      >
        <InputGroup
          value={pattern}
          onChange={setPattern}
          code={true}
          pre="/"
          post="/"
        />
      </FieldWrapper>
    </div>
  );
}
```

## More inputs in one box

`InputGroup` has one input. For more values in one box, for example a width
and a height, use the parts:

- `InputGroup.Root` is the box. With `inline`, it is as wide as its content.
- `InputGroup.Input` is a bare input with the props of [`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md). Give it
  a `value` and an `onChange`, so each value has its own state and its own
  error.
- `InputGroup.Addon` is a fixed text between or after the inputs. A click on
  it does nothing, because the box has more inputs.

In a [`FieldWrapper`](https://react-ui.datocms.com/Forms/FieldWrapper.md), the box takes the `id` and the hint of the field, and
the inputs in it do not: each one keeps its own name.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import InputGroup from 'datocms-react-ui/InputGroup';
import React, { useState } from 'react';

export default function MoreInputs() {
  const [width, setWidth] = useState<string | null>('1920');
  const [height, setHeight] = useState<string | null>('1080');

  return (
    <div className="DocsNarrow">
      <FieldWrapper label="Size" hint="The size of the cover image.">
        <InputGroup.Root inline={true} ariaLabel="Size in pixels">
          <InputGroup.Input
            placeholder="Width"
            ariaLabel="Width"
            size={5}
            value={width}
            onChange={setWidth}
          />
          <InputGroup.Addon>x</InputGroup.Addon>
          <InputGroup.Input
            placeholder="Height"
            ariaLabel="Height"
            size={5}
            value={height}
            onChange={setHeight}
          />
          <InputGroup.Addon>px</InputGroup.Addon>
        </InputGroup.Root>
      </FieldWrapper>
    </div>
  );
}
```

## Accessibility

The addons are in the `aria-describedby` of the input, after the error. A
screen reader reads "Subdomain, edit text, .admin.datocms.com".

The box has `role="group"`, and its `ariaLabel` is the name of
the group. A screen reader does not read the addons, so put the unit in the
name of the group ("Size in pixels"). When an input has no label, give
`ariaLabel` to `InputGroup.Input` ("Width").

## Props

### InputGroup

The props of the input (`value`, `onChange`, `onBlur`, `name`, `id`,
`disabled`, ...) are the contract of an input. The
other props go to the input. `InputGroup` has the props of
[`StringInput`](https://react-ui.datocms.com/Forms/TextInputs.md), but no `className`: the package draws the box. For a class
of layout, put a wrapper around the field. `InputGroup.Input` has the
same props.

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `pre` | `Message` | No | | A text or an icon before the input, for example "https://" |
| `post` | `Message` | No | | A text or an icon after the input, for example ".admin.datocms.com" |

Example of `placeholder`:

```tsx
"Marketing site"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### InputGroup.Root

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The inputs (`InputGroup.Input`) and the addons. In a `FieldWrapper`, the box takes the `id` and the description of the field, and each input keeps its own name. |
| `ariaLabel` | `TextMessage` | Yes | | The name of the group for a screen reader. The box has `role="group"`. Put the unit in it, because a screen reader does not read the addons. |
| `inline` | `boolean` | No | `false` | The box is as wide as its content, not as wide as its container. Use it for short values on one line, for example a width and a height. |
| `code` | `boolean` | No | `false` | Shows the inputs and the addons in the monospaced font. An `InputGroup.Input` can set its own `code`. |

Example of `ariaLabel`:

```tsx
"Minimum size in pixels"
```

### InputGroup.Input

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `placeholder` | `TextMessage \| null` | No | | The text that shows when the input is empty (a plain string or `{ id }`). `null` is the same as no text. |
| `code` | `boolean` | No | `false` | Shows the value in the monospaced font, for a value that is code: a pattern, a URL, an API key. |
| `ariaLabel` | `TextMessage` | No | | The name of the input for a screen reader, when its field has no label. The name of the group comes before it. |

Example of `placeholder`:

```tsx
"Marketing site"
```

Example of `ariaLabel`:

```tsx
"Width"
```

Also accepts:

- all of `AriaAttributes`
- all of `DOMAttributes`
- all of `HTMLAttributes`
- all of `InputHTMLAttributes`

### InputGroup.Addon

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The fixed text, for example "px" or "x" |
