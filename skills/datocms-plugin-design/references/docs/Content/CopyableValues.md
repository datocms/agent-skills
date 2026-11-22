# Copyable values

Four small components show a value and copy it. Pick the one that fits the
value.

An ID is monospaced and complete, without a "#" prefix. Do not shorten it
in the middle. When its container is too narrow, the container cuts it with
an ellipsis at the end.

| Use | For |
| - | - |
| `CopyableId` | An ID that is a value of its own: an info row, a column of a table, a detail page. |
| `IdText` | An ID inside other text, or in a row that is a link to a record. It does not copy. |
| `CopyableValue` | A value in a form field with a label: a URL, a token, a key. |
| `CopyButton` | The copy action next to a value that has its own layout, or in the corner of a box. |

## Copyable ID

A click copies the ID. A ghost surface shows on hover, and the tooltip
says “Copy ID”, then “Copied”. The feedback is in the control, so do not add
a toast. The ID takes the color of the text around it. In the subtle detail
of a [`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md) bar (`extraInfo`), it is subtle.

```tsx
import CopyableId from 'datocms-react-ui/CopyableId';
import InfoList from 'datocms-react-ui/InfoList';
import React from 'react';

export default function IdInInfoList() {
  return (
    <div className="DocsNarrow">
      <InfoList>
        <InfoList.Row title="Record ID">
          <CopyableId id="dY9xQ2VZTtKb1mN4sL8WaA" />
        </InfoList.Row>
        <InfoList.Row title="Model ID">
          <CopyableId id="168342" />
        </InfoList.Row>
      </InfoList>
    </div>
  );
}
```

**Do:** Use CopyableId for an ID in a row of values.

```tsx
<CopyableId id="168342" />
```

**Don’t:** Do not make a row that is a link to a record show its ID with CopyableId: a click on the ID would not open the record.

```tsx
<a href="#record">
  Hello world <CopyableId id="168342" />
</a>
```

## ID in text

`IdText` is the ID in the monospaced font, as plain text. A row that is a
link to a record shows no ID, because the title and the model say what the
record is. It shows the ID only when the search finds the record by its ID.
Give `labeled` when the ID follows another detail on the same line, so it is
not the ID of that detail.

```tsx
import IdText from 'datocms-react-ui/IdText';
import React from 'react';

export default function IdInText() {
  return (
    <div className="DocsNarrow">
      <p>
        Blog post <IdText id="dY9xQ2VZTtKb1mN4sL8WaA" />
      </p>
      <p>
        Blog post <IdText id="dY9xQ2VZTtKb1mN4sL8WaA" labeled />
      </p>
    </div>
  );
}
```

**Do:** Use IdText for an ID in other text. Add the label when another detail is before it.

```tsx
<p>Blog post <IdText id="168342" labeled /></p>
```

**Don’t:** Do not write a new class for monospaced IDs.

```tsx
<p>Blog post <code style={{ fontFamily: 'monospace' }}>168342</code></p>
```

## Value in a form field

`CopyableValue` is a read-only input with a copy button inside. A click in
the field selects all the text.

- Give `label` (and an optional `hint`). The component draws the form field,
  with a label that names the input.
- Without a visible label (a link under a text that says what it is), give
  `ariaLabel`.
- Use `code` for a token or a key.
- Use `openable` when the value is a URL that the user can visit.

Do not write a `form__field` around it. Do not make a read-only input with a
"Copy" link, a textarea with the text to copy, or a link with a copy icon.

```tsx
import CopyableValue from 'datocms-react-ui/CopyableValue';
import React from 'react';

export default function FieldValues() {
  return (
    <div className="DocsNarrow">
      <CopyableValue
        label="Webhook URL"
        hint="DatoCMS calls this URL at the end of each build."
        value="https://webhooks.datocms.com/Dc4mVu7RtaBe/deploy-results"
      />
      <CopyableValue
        label="Website URL"
        value="https://www.example.com"
        openable
      />
      <CopyableValue label="Secret" value="5f7a1c0be2d94e0f8a6b" code />
    </div>
  );
}
```

**Do:** Give CopyableValue its label: it draws the field.

```tsx
<CopyableValue label="Webhook URL" value="https://webhooks.datocms.com/Dc4mVu7RtaBe" />
```

**Don’t:** Do not use CopyableValue for a value of an info row: it is a form input. Use CopyableId or text.

```tsx
<CopyableValue ariaLabel="Record ID" value="168342" />
```

## Copy button

`CopyButton` is a ghost icon button with the tooltip “Copy”. It shows a
check and “Copied” after the click. Use it in the corner of a box
([`CodeSnippet`](https://react-ui.datocms.com/Content/CodeSnippet.md)), at the end of a field (`CopyableValue`) or in the action
of a row.

The feedback is in the control, not in a toast. Every control that copies
uses `useCopyToClipboard()` (`datocms-react-ui/hooks/useCopyToClipboard`)
for the copy and for the copied state. Use a toast (`notice`) only for a
copy action in a menu, because no control there can show the state.

```tsx
import CopyButton from 'datocms-react-ui/CopyButton';
import SettingsList from 'datocms-react-ui/SettingsList';
import React from 'react';

export default function CopyInRow() {
  return (
    <SettingsList>
      <SettingsList.Row
        title="Clone the repository"
        value="git clone https://github.com/datocms/website.git"
        action={
          <CopyButton value="git clone https://github.com/datocms/website.git" />
        }
      />
    </SettingsList>
  );
}
```

