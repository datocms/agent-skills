# Astro Structured Text — `<StructuredText />`

Astro component for rendering DatoCMS [Structured Text (DAST)](https://www.datocms.com/docs/structured-text/dast) fields. Unlike React (render props with `renderBlock`), Vue (`h()` render functions), or Svelte (predicate-component tuples), Astro uses **`__typename`-keyed objects** with separate `.astro` component files.

## Contents

- Setup
- Basic Usage
- Full GraphQL Fragment
- Custom Components (`__typename`-Keyed Objects)
- Override Default Rendering of Nodes
- Override Default Rendering of Marks
- Strict Props Type Checking
- Props Reference
- Conditional Rendering with `isEmptyDocument`
- Related Packages
- Content Link Integration
- Project Wrapper Component
- Link-to-Record Component Shape

## Setup

```js
import { StructuredText } from '@datocms/astro/StructuredText';
```

**Note:** `@datocms/astro` uses subpath imports — always import from `@datocms/astro/StructuredText`, not from `@datocms/astro`.

## Basic Usage

For simple Structured Text fields (no blocks, links, or inline records), query only `value`:

```astro
---
import { StructuredText } from '@datocms/astro/StructuredText';
import { executeQuery } from '@datocms/cda-client';

const query = `
  query {
    blogPost {
      title
      content {
        value
      }
    }
  }
`;

const { blogPost } = await executeQuery(query, { token: '<YOUR-API-TOKEN>' });
---

<article>
  <h1>{blogPost.title}</h1>
  <StructuredText data={blogPost.content} />
</article>
```

## Full GraphQL Fragment

When using blocks, inline records, links, or inline blocks, query the full shape:

```graphql
query {
  blogPost {
    content {
      value
      links {
        ... on RecordInterface {
          id
          __typename
        }
        ... on TeamMemberRecord {
          firstName
          slug
        }
      }
      blocks {
        ... on RecordInterface {
          id
          __typename
        }
        ... on ImageBlockRecord {
          image {
            responsiveImage(imgixParams: { auto: format }) {
              src
              width
              height
              alt
              base64
            }
          }
        }
        ... on CtaRecord {
          label
          url
        }
      }
      inlineBlocks {
        ... on RecordInterface {
          id
          __typename
        }
        ... on NewsletterSignupRecord {
          title
        }
      }
    }
  }
}
```

**Critical:** Always include `id` and `__typename` on every `links`, `blocks`, and `inlineBlocks` entry via `... on RecordInterface`. The component uses `__typename` to match records to components.

## Custom Components (`__typename`-Keyed Objects)

Unlike React (render props), Vue (`h()` render functions), or Svelte (predicate-component tuples), Astro uses **objects keyed by `__typename`** pointing to separate `.astro` component files:

```astro
---
import { StructuredText, ensureValidStructuredTextProps } from '@datocms/astro/StructuredText';
import { executeQuery } from '@datocms/cda-client';

import Cta from '~/components/Cta.astro';
import NewsletterSignup from '~/components/NewsletterSignup.astro';
import InlineTeamMember from '~/components/InlineTeamMember.astro';
import LinkToTeamMember from '~/components/LinkToTeamMember.astro';

const { blogPost } = await executeQuery(query, { token: '<YOUR-API-TOKEN>' });
---

<article>
  <h1>{blogPost.title}</h1>
  <StructuredText
    {...ensureValidStructuredTextProps({
      data: blogPost.content,
      blockComponents: {
        CtaRecord: Cta,
      },
      inlineBlockComponents: {
        NewsletterSignupRecord: NewsletterSignup,
      },
      inlineRecordComponents: {
        TeamMemberRecord: InlineTeamMember,
      },
      linkToRecordComponents: {
        TeamMemberRecord: LinkToTeamMember,
      },
    })}
  />
</article>
```

### Props Received by Custom Components (via `Astro.props`)

| Prop type | Prop name | Description |
| - | - | - |
| `blockComponents` | `{ block }` | The block record data |
| `inlineBlockComponents` | `{ block }` | The inline block record data |
| `inlineRecordComponents` | `{ record }` | The inline record data |
| `linkToRecordComponents` | `{ node, record, attrs }` | The link node, linked record, and custom link attributes |

### Block Component Example

```astro
---
// src/components/Cta.astro
const { block } = Astro.props;
---

<a class="button" href={block.url}>{block.label}</a>
```

### Inline Record Component Example

```astro
---
// src/components/InlineTeamMember.astro
const { record } = Astro.props;
---

<a href={`/team/${record.slug}`}>{record.firstName}</a>
```

### Link-to-Record Component Example

```astro
---
// src/components/LinkToTeamMember.astro
const { record, attrs } = Astro.props;
---

<a href={`/team/${record.slug}`} {...attrs}>
  <slot />
</a>
```

### Inline Block Component Example

```astro
---
// src/components/NewsletterSignup.astro
const { block } = Astro.props;
---

<div class="newsletter-signup">
  <h3>{block.title}</h3>
  <input type="email" placeholder="Enter your email" />
</div>
```

## Override Default Rendering of Nodes

Override default rendering for any node type using the `nodeOverrides` prop. Keys are DAST node type names, values are Astro components. For node properties and child rules, load [document model](../../datocms-structured-text/references/document-model.md):

```astro
---
import { StructuredText, ensureValidStructuredTextProps } from '@datocms/astro/StructuredText';
import HeadingWithAnchorLink from '~/components/HeadingWithAnchorLink.astro';
import Code from '~/components/Code.astro';
---

<StructuredText
  {...ensureValidStructuredTextProps({
    data: blogPost.content,
    nodeOverrides: {
      heading: HeadingWithAnchorLink,
      code: Code,
    },
  })}
/>
```

### Custom Heading Example

Node override components receive a `node` prop with the DAST node data, plus children are passed via `<slot />`:

```astro
---
// src/components/HeadingWithAnchorLink.astro
import { render as toPlainText } from 'datocms-structured-text-to-plain-text';

const { node } = Astro.props;
const HeadingTag = `h${node.level}`;
const anchor = toPlainText(node)
  ?.toLowerCase()
  .replace(/ /g, '-')
  .replace(/[^\w-]+/g, '');
---

<HeadingTag>
  <slot />
  <a id={anchor}></a>
  <a href={`#${anchor}`}>#</a>
</HeadingTag>
```

### Custom Code Block Example

```astro
---
// src/components/Code.astro
const { node } = Astro.props;
---

<pre class="code-block" data-language={node.language}>
  <code>{node.code}</code>
</pre>
```

## Override Default Rendering of Marks

Override how marks (bold, italic, etc.) render using the `markOverrides` prop:

```astro
---
import { StructuredText, ensureValidStructuredTextProps } from '@datocms/astro/StructuredText';
import Strong from '~/components/Strong.astro';
---

<StructuredText
  {...ensureValidStructuredTextProps({
    data: blogPost.content,
    markOverrides: {
      strong: Strong,
    },
  })}
/>
```

### Available Marks

| Mark | Default HTML tag | Description |
| - | - | - |
| `'strong'` | `<strong>` | Bold text |
| `'emphasis'` | `<em>` | Italic text |
| `'underline'` | `<u>` | Underlined text |
| `'strikethrough'` | `<s>` | Strikethrough text |
| `'highlight'` | `<mark>` | Highlighted text |
| `'code'` | `<code>` | Inline code |

## Strict Props Type Checking

Astro doesn't support generics-typed components. Always wrap props with `ensureValidStructuredTextProps()` whenever passing custom components (`blockComponents`, `inlineBlockComponents`, `inlineRecordComponents`, `linkToRecordComponents`, `nodeOverrides`, `markOverrides`) — validates all possible block and linked record types are managed. Especially useful with [gql.tada](https://gql-tada.0no.co/):

```astro
---
import { StructuredText, ensureValidStructuredTextProps } from '@datocms/astro/StructuredText';
---

<StructuredText
  {...ensureValidStructuredTextProps({
    data: blogPost.content,
    blockComponents: {
      CtaRecord: Cta,
    },
    inlineBlockComponents: {
      NewsletterSignupRecord: NewsletterSignup,
    },
    inlineRecordComponents: {
      TeamMemberRecord: InlineTeamMember,
    },
    linkToRecordComponents: {
      TeamMemberRecord: LinkToTeamMember,
    },
  })}
/>
```

## Props Reference

| Prop | Type | Required | Description |
| - | - | - | - |
| `data` | `StructuredText \| DastNode` | Yes | The structured text field value from DatoCMS |
| `blockComponents` | `Record<string, AstroComponent>` | Only if document has `block` nodes | Object keyed by `__typename` of blocks to render |
| `inlineBlockComponents` | `Record<string, AstroComponent>` | Only if document has `inlineBlock` nodes | Object keyed by `__typename` of inline blocks to render |
| `linkToRecordComponents` | `Record<string, AstroComponent>` | Only if document has `itemLink` nodes | Object keyed by `__typename` of linked records to render |
| `inlineRecordComponents` | `Record<string, AstroComponent>` | Only if document has `inlineItem` nodes | Object keyed by `__typename` of inline records to render |
| `nodeOverrides` | `Record<string, AstroComponent>` | No | Object keyed by DAST node type to override default rendering |
| `markOverrides` | `Record<string, AstroComponent>` | No | Object keyed by mark type to override default mark rendering |

## Conditional Rendering with `isEmptyDocument`

Use `isEmptyDocument()` to skip rendering when a Structured Text field is empty (contains only a single empty paragraph):

```astro
---
import { StructuredText } from '@datocms/astro/StructuredText';
import { isEmptyDocument } from 'datocms-structured-text-utils';
---

<article>
  <h1>{blogPost.title}</h1>
  {!isEmptyDocument(blogPost.content) && (
    <StructuredText data={blogPost.content} />
  )}
</article>
```

## Related Packages

For framework-independent plain-text, HTML-string, or DOM-node export, load [conversion](../../datocms-structured-text/references/conversion.md). For Markdown/HTML import into DAST, use the same reference; for modifying existing content, use [editing](../../datocms-structured-text/references/editing.md). If a required reference is missing, install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle. Ordinary component wiring needs no specialist dependency.

## Content Link Integration

Group/boundary rules and example: [astro-content-link.md § Structured Text Integration](./astro-content-link.md#structured-text-integration).

## Project Wrapper Component

Don't import `<StructuredText />` from `@datocms/astro` into pages directly — wrap once, use the wrapper everywhere. Reasons:

- Every render needs `data-datocms-content-link-group` for Visual Editing — wrapper enforces it so no page can forget.
- Wrapper is the right place for project-wide `nodeOverrides` (headings, code, etc.) so every structured-text field renders consistently without each caller restating them.

Type the wrapper's props by borrowing from the upstream component via `ComponentProps<typeof StructuredText>` — transparently accepts everything `<StructuredText />` does without maintaining a parallel prop list:

```astro
---
// src/components/StructuredText/index.astro
import { StructuredText } from '@datocms/astro/StructuredText';
import type { ComponentProps } from 'astro/types';

type Props = ComponentProps<typeof StructuredText>;

const { nodeOverrides, ...props } = Astro.props;
---

<div data-datocms-content-link-group>
  <StructuredText
    {...props}
    nodeOverrides={{
      // project defaults, e.g. `heading: HeadingWithAnchorLink`
      ...nodeOverrides,
    }}
  />
</div>
```

Spread caller's `nodeOverrides` **after** project defaults — caller can opt out of any project default.

## Link-to-Record Component Shape

Link-to-record components have a different prop signature than blocks/inline records — `{ node, attrs, record }`:

```astro
---
// src/components/LinkToBlogPost.astro
import type { TransformedMeta } from 'datocms-structured-text-generic-html-renderer';
import type { ItemLink } from 'datocms-structured-text-utils';
import { readFragment, type FragmentOf } from 'gql.tada';
import { buildUrlForBlogPost } from '~/lib/datocms/gqlUrlBuilder/blogPost';
import { BlogPostLinkFragment } from './fragments';

interface Props {
  node: ItemLink;
  attrs: TransformedMeta;
  record: FragmentOf<typeof BlogPostLinkFragment>;
}

const { record, attrs } = Astro.props;
const unmaskedRecord = readFragment(BlogPostLinkFragment, record);
---

<a {...attrs} href={buildUrlForBlogPost(unmaskedRecord)}><slot /></a>
```

- **No `data-datocms-content-link-boundary`** on link-to-record components.
- **Spread `{...attrs}`** so renderer-provided attributes (`target`, `rel`, …) are honored.
