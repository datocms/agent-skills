# ApiKey

The API key of a model, a block, a field or a rule set: small, monospaced,
and in the subtle ink. Put it next to a name, in a row, in a toolbar title,
or in a text. A key of a field can be joined with the key of its model by a
dot (`blog_post.title`).

It takes no `className`, and a space separates it from the name. Do not add
a class for it to each block. A key does not wrap. When it is longer than
its container, it ends with an ellipsis, like [`CopyableId`](https://react-ui.datocms.com/Content/CopyableValues.md).

```tsx
import ApiKey from 'datocms-react-ui/ApiKey';
import React from 'react';

export default function NextToName() {
  return (
    <ul className="DocsNarrow">
      <li>
        Blog post <ApiKey>blog_post</ApiKey>
      </li>
      <li>
        Title <ApiKey>blog_post.title</ApiKey>
      </li>
    </ul>
  );
}
```

**Do:** Use ApiKey next to the name.

```tsx
<p>Blog post <ApiKey>blog_post</ApiKey></p>
```

**Don’t:** Do not write the key in a code tag or with a class of its own.

Blog post `blog_post`

## Props

### ApiKey

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `children` | `ReactNode` | Yes | | The API key, or keys joined with a dot ("article.title"). |
