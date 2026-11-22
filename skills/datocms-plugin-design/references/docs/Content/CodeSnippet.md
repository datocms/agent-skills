# CodeSnippet

Code, a command or a payload: monospaced text on the code surface, with the
copy button in its corner. The button copies the `code`, not the view.

| Use | For |
| - | - |
| `CodeSnippet` | A block of code, a command, a log or a payload. |
| [Copyable values](https://react-ui.datocms.com/Content/CopyableValues.md) | A short value in a form field, such as a URL or a token. |

```tsx
import CodeSnippet from 'datocms-react-ui/CodeSnippet';
import React from 'react';

const CURL_EXAMPLE = `curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"event_type": "deploy_succeeded"}' \\
  https://webhooks.datocms.com/Dc4mVu7RtaBe/deploy-results`;

export default function Command() {
  return <CodeSnippet code={CURL_EXAMPLE} ariaLabel="Example request" />;
}
```

## Long text

Give `maxHeight` to a box with a long text, for example a log. The box
scrolls and the copy button stays in the corner.

```tsx
import CodeSnippet from 'datocms-react-ui/CodeSnippet';
import React from 'react';

const PAYLOAD = JSON.stringify(
  {
    data: {
      id: 'dY9xQ2VZTtKb1mN4sL8WaA',
      type: 'item',
      attributes: {
        title: 'Hello world',
        slug: 'hello-world',
        published_at: '2026-10-14T09:30:00Z',
        tags: ['news', 'product', 'release'],
        author: { name: 'Anna Rossi', role: 'Editor' },
      },
    },
  },
  null,
  2,
);

export default function ScrollingPayload() {
  return (
    <CodeSnippet code={PAYLOAD} ariaLabel="Request body" maxHeight={200} />
  );
}
```

## Custom view

Give `children` when the text has a better view, for example a JSON tree.
`code` stays the text that the button copies.

```tsx
import CodeSnippet from 'datocms-react-ui/CodeSnippet';
import React from 'react';

const TEXT = '{"title": "Hello world", "slug": "hello-world"}';

export default function CustomView() {
  return (
    <CodeSnippet code={TEXT} ariaLabel="Record" maxHeight={400}>
      <ul style={{ margin: 0, padding: 16, listStyle: 'none' }}>
        <li>
          <strong>title</strong>: "Hello world"
        </li>
        <li>
          <strong>slug</strong>: "hello-world"
        </li>
      </ul>
    </CodeSnippet>
  );
}
```

**Do:** Use CodeSnippet for a command that the user must copy.

```tsx
<CodeSnippet code="npm install --save datocms-plugin-sdk" ariaLabel="Install command" />
```

**Don’t:** Do not use it for a short value in a form. Use CopyableValue.

```tsx
<CodeSnippet code="5f7a1c0be2d94e0f8a6b" ariaLabel="API token" />
```

## Accessibility

The box is a region with a name, and the keyboard can focus it. The arrow
keys then scroll a long text. Give `ariaLabel`, the name of the content
("Request body", "Example requests"), often the label above the box.

