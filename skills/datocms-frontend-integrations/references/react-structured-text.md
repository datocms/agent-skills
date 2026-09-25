# React Structured Text — `<StructuredText />`

React component for rendering DatoCMS [Structured Text (DAST)](https://www.datocms.com/docs/structured-text/dast) fields.

## Contents

- Basic Usage
- Full GraphQL Fragment
- Custom Renderers
- Custom Node Rules
- Custom Mark Rules
- DAST Node Reference
- Conditional Rendering with `isEmptyDocument`
- Related Packages
- Props Reference
- Content Link Integration
- Project Wrapper Component
- Link-to-Record Component Shape

## Basic Usage

For simple Structured Text fields (no blocks, links, or inline records), query only `value`:

```jsx
import { StructuredText } from 'react-datocms/structured-text';

function BlogPost({ data }) {
  return (
    <div>
      <h1>{data.blogPost.title}</h1>
      <StructuredText data={data.blogPost.content} />
    </div>
  );
}
```

```graphql
query {
  blogPost {
    title
    content {
      value
    }
  }
}
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
          title
          url
        }
      }
      inlineBlocks {
        ... on RecordInterface {
          id
          __typename
        }
        ... on MentionRecord {
          username
        }
      }
    }
  }
}
```

**Critical:** Always include `id` and `__typename` on every `links`, `blocks`, and `inlineBlocks` entry via `... on RecordInterface`. The component uses `__typename` for the switch statements in custom renderers.

## Custom Renderers

Use `renderBlock`, `renderInlineRecord`, `renderLinkToRecord`, and `renderInlineBlock` to handle embedded content. Always switch on `record.__typename`:

```jsx
<StructuredText
  data={data.blogPost.content}
  renderBlock={({ record }) => {
    switch (record.__typename) {
      case 'ImageBlockRecord':
        return <Image data={record.image.responsiveImage} />;
      case 'CtaRecord':
        return (
          <a className="button" href={record.url}>
            {record.title}
          </a>
        );
      default:
        return null;
    }
  }}
  renderInlineRecord={({ record }) => {
    switch (record.__typename) {
      case 'TeamMemberRecord':
        return <a href={`/team/${record.slug}`}>{record.firstName}</a>;
      default:
        return null;
    }
  }}
  renderLinkToRecord={({ record, children, transformedMeta }) => {
    switch (record.__typename) {
      case 'TeamMemberRecord':
        return (
          <a {...transformedMeta} href={`/team/${record.slug}`}>
            {children}
          </a>
        );
      default:
        return null;
    }
  }}
  renderInlineBlock={({ record }) => {
    switch (record.__typename) {
      case 'MentionRecord':
        return <code>@{record.username}</code>;
      default:
        return null;
    }
  }}
/>
```

## Custom Node Rules

Override default rendering for any node type using `customNodeRules` with `renderNodeRule`. Import type guards from `datocms-structured-text-utils`.

```jsx
import { renderNodeRule, StructuredText } from 'react-datocms/structured-text';
import { isHeading, isCode } from 'datocms-structured-text-utils';
import { render as toPlainText } from 'datocms-structured-text-to-plain-text';

<StructuredText
  data={data.blogPost.content}
  customNodeRules={[
    // Add anchors to headings for in-page navigation
    renderNodeRule(isHeading, ({ node, children, key }) => {
      const HeadingTag = `h${node.level}`;
      const anchor = toPlainText(node)
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

      return (
        <HeadingTag key={key}>
          {children} <a id={anchor} />
          <a href={`#${anchor}`} />
        </HeadingTag>
      );
    }),

    // Custom syntax highlighting for code blocks
    renderNodeRule(isCode, ({ node, key }) => {
      return (
        <SyntaxHighlight
          key={key}
          code={node.code}
          language={node.language}
          linesToBeHighlighted={node.highlight}
        />
      );
    }),
  ]}
/>
```

Available type guards: `isHeading`, `isCode`, `isParagraph`, `isList`, `isListItem`, `isBlockquote`, `isLink`, `isRoot`, and more — see [datocms-structured-text-utils](https://github.com/datocms/structured-text/tree/main/packages/utils#typescript-type-guards).

The `renderNodeRule` callback receives `{ node, children, key, ancestors, adapter }`. Use `ancestors` to apply different rendering based on parent context (e.g., top-level vs nested paragraphs).

**Note:** If you override the rules for `inlineItem`, `itemLink`, `block`, or `inlineBlock` nodes via `customNodeRules`, the corresponding `renderInlineRecord`, `renderLinkToRecord`, `renderBlock`, and `renderInlineBlock` props are ignored.

## Custom Mark Rules

Override how marks (bold, italic, etc.) render using `customMarkRules` with `renderMarkRule`:

```jsx
import { renderMarkRule, StructuredText } from 'react-datocms/structured-text';

<StructuredText
  data={data.blogPost.content}
  customMarkRules={[
    renderMarkRule('strong', ({ children, key }) => {
      return <b key={key}>{children}</b>;
    }),
  ]}
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

## DAST Node Reference

Custom rendering callbacks receive DAST nodes. Node properties, child rules, and marks live in [document model](../../datocms-structured-text/references/document-model.md); tree traversal and content transforms live in [editing](../../datocms-structured-text/references/editing.md). Keep the framework callback/component API in this reference.

## Conditional Rendering with `isEmptyDocument`

Use `isEmptyDocument()` to skip rendering when a Structured Text field is empty (contains only a single empty paragraph):

```jsx
import { StructuredText } from 'react-datocms/structured-text';
import { isEmptyDocument } from 'datocms-structured-text-utils';

function BlogPost({ data }) {
  return (
    <div>
      <h1>{data.blogPost.title}</h1>
      {!isEmptyDocument(data.blogPost.content) && (
        <StructuredText data={data.blogPost.content} />
      )}
    </div>
  );
}
```

## Related Packages

For framework-independent plain-text, HTML-string, or DOM-node export, load [conversion](../../datocms-structured-text/references/conversion.md). For Markdown/HTML import into DAST, use the same reference; for modifying existing content, use [editing](../../datocms-structured-text/references/editing.md). If a required reference is missing, install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle. Ordinary component wiring needs no specialist dependency.

## Props Reference

| Prop | Type | Required | Description |
| - | - | - | - |
| `data` | `StructuredTextGraphQlResponse \| DastNode` | Yes | The structured text field value from DatoCMS |
| `renderBlock` | `({ record }) => ReactElement \| null` | Only if document has `block` nodes | Render embedded block records |
| `renderInlineRecord` | `({ record }) => ReactElement \| null` | Only if document has `inlineItem` nodes | Render inline record references |
| `renderLinkToRecord` | `({ record, children, transformedMeta }) => ReactElement \| null` | Only if document has `itemLink` nodes | Render links to other records |
| `renderInlineBlock` | `({ record }) => ReactElement \| null` | Only if document has `inlineBlock` nodes | Render inline block records |
| `metaTransformer` | `({ node, meta }) => Object \| null` | No | Transform link/itemLink `meta` into HTML props |
| `customNodeRules` | `Array<RenderRule>` | No | Custom node rendering rules (via `renderNodeRule()`) |
| `customMarkRules` | `Array<RenderMarkRule>` | No | Custom mark rendering rules (via `renderMarkRule()`) |
| `renderText` | `(text: string, key: string) => ReactElement \| string \| null` | No | Custom text node rendering |

## Content Link Integration

Group/boundary rules and example: [react-content-link.md § Structured Text Integration](./react-content-link.md#structured-text-integration).

## Project Wrapper Component

Don't import `<StructuredText />` from `react-datocms` into pages directly — wrap once, use the wrapper everywhere. Conventionally exported as `<Text>` from `src/components/Text/index.tsx` so it's visually distinct from the upstream component at call sites. Reasons:

- Every render needs `data-datocms-content-link-group` for Visual Editing — wrapper enforces it so no page can forget.
- Wrapper is the right place for project-wide `customNodeRules` (headings, code, etc.) so every structured-text field renders consistently without each caller restating them.

Type the wrapper's props by borrowing from upstream `StructuredTextPropTypes`. Stay generic over `BlockRecord` / `LinkRecord` / `InlineBlockRecord`:

```tsx
import {
  StructuredText,
  type StructuredTextPropTypes,
  renderNodeRule,
} from 'react-datocms/structured-text';
import { type CdaStructuredTextRecord, isCode, isHeading } from 'datocms-structured-text-utils';

export function Text<
  BlockRecord extends CdaStructuredTextRecord = CdaStructuredTextRecord,
  LinkRecord extends CdaStructuredTextRecord = CdaStructuredTextRecord,
  InlineBlockRecord extends CdaStructuredTextRecord = CdaStructuredTextRecord,
>({
  customNodeRules,
  ...props
}: StructuredTextPropTypes<BlockRecord, LinkRecord, InlineBlockRecord>) {
  return (
    <div data-datocms-content-link-group>
      <StructuredText<BlockRecord, LinkRecord, InlineBlockRecord>
        {...props}
        customNodeRules={[
          ...(customNodeRules ?? []),
          renderNodeRule(isCode, ({ node, key }) => <Code key={key} node={node} />),
          renderNodeRule(isHeading, ({ node, key, children }) => (
            <HeadingWithAnchorLink node={node} key={key}>
              {children}
            </HeadingWithAnchorLink>
          )),
        ]}
      />
    </div>
  );
}
```

- **Prepend caller's rules**, not append — `customNodeRules` resolves earlier rules first, so caller-supplied rules must come first to take precedence over project defaults.
- Use `CdaStructuredTextRecord`, not the deprecated `Record` alias from `datocms-structured-text-utils`.
- Heavy / client-only node renderers should use `next/dynamic` (e.g. `const Code = dynamic(() => import('@/components/Code'))`) so they aren't pulled into the page's initial JS bundle.

## Link-to-Record Component Shape

Link-to-record components have a different prop signature than blocks/inline records — `{ record, transformedMeta, children }`:

```tsx
import type { TransformedMeta } from 'datocms-structured-text-generic-html-renderer';
import { PageUrlFragment, buildUrlForPage } from '@/lib/datocms/gqlUrlBuilder/page';

export const PageLinkFragment = graphql(
  /* GraphQL */ `
    fragment PageLinkFragment on PageRecord {
      ...PageUrlFragment
    }
  `,
  [PageUrlFragment],
);

type Props = {
  record: FragmentOf<typeof PageLinkFragment>;
  transformedMeta: TransformedMeta;
  children: ReactNode;
};

export default function PageLink({ record, transformedMeta, children }: Props) {
  const unmaskedRecord = readFragment(PageLinkFragment, record);
  return (
    <Link {...transformedMeta} href={buildUrlForPage(unmaskedRecord)}>
      {children}
    </Link>
  );
}
```

- **No `data-datocms-content-link-boundary`** on link-to-record components — renderer handles those boundaries. Inline-record components _do_ set it themselves.
- **Spread `{...transformedMeta}`** so renderer-provided attributes (`target`, `rel`, …) are honored.
