# Structured Text

Query Structured Text through `value`, `blocks`, `links`, and `inlineBlocks`. Keep GraphQL selection and record resolution here; use [document model](../../datocms-structured-text/references/document-model.md) for DAST structure, [editing](../../datocms-structured-text/references/editing.md) for traversal/transforms, and [conversion](../../datocms-structured-text/references/conversion.md) for Markdown/HTML import or format export. Load only the reference the task needs; if missing, install `datocms-structured-text` from `datocms/agent-skills` or update the full bundle. Routine GraphQL reads need no additional skill.

## Contents

- Response Shape
- The `value` Field — DAST Structure
- The `blocks` Field
- The `links` Field
- The `inlineBlocks` Field
- Rendering
- Complete Example

## Response Shape

Structured text fields return an object with up to four sub-fields:

| Sub-field | Description |
| - | - |
| `value` | The DAST (DatoCMS Abstract Syntax Tree) JSON document — contains the text structure |
| `blocks` | Array of embedded block records (referenced by `block` nodes in DAST) |
| `links` | Array of linked records (referenced by `itemLink` and `inlineItem` nodes in DAST) |
| `inlineBlocks` | Array of inline block records (referenced by `inlineBlock` nodes in DAST) |

**Critical:** Always query all sub-fields that the structured text field uses. If you query only `value` but the content contains embedded blocks or links, those references will be unresolvable and content will be silently missing during rendering.

Check the generated GraphQL type before adding record fragments: an empty model allowlist can expose a sub-field such as `inlineBlocks` as a scalar `String`, which rejects nested selections. Omit unused reference sub-fields; for populated allowlists, select fragments only for the permitted record types. Inline records belong in `links`, while inline blocks belong in `inlineBlocks`.

```graphql
query {
  blogPost(filter: { slug: { eq: "hello-world" } }) {
    content {
      value
      blocks {
        ... on RecordInterface { id _modelApiKey }
        ... on ImageBlockRecord {
          image {
            responsiveImage(imgixParams: { w: 800 }) {
              src
              srcSet
              width
              height
              alt
            }
          }
        }
        ... on CtaBlockRecord {
          label
          url
        }
      }
      links {
        ... on RecordInterface { id _modelApiKey }
        ... on BlogPostRecord {
          slug
          title
        }
        ... on AuthorRecord {
          name
          slug
        }
      }
    }
  }
}
```

## The `value` Field — DAST Structure

`value` contains the DAST document, `{ schema: "dast", document: { type: "root", children: [...] } }`. The field's GraphQL response wraps it alongside resolved record arrays; do not confuse that wrapper with a CMA field value. For node properties, child rules, and marks, load [document model](../../datocms-structured-text/references/document-model.md).

## The `blocks` Field

Query embedded block records using inline fragments. Each block node in the DAST references a block by its `item` ID, which corresponds to a record in the `blocks` array.

```graphql
blocks {
  __typename
  ... on RecordInterface { id }
  ... on ImageBlockRecord {
    image {
      responsiveImage(imgixParams: { w: 800 }) {
        src
        width
        height
        alt
      }
    }
    caption
  }
  ... on VideoBlockRecord {
    video {
      video {
        streamingUrl
        thumbnailUrl(format: jpg)
      }
    }
  }
}
```

## The `links` Field

Query linked records (referenced by `itemLink` and `inlineItem` nodes in the DAST). These are full DatoCMS records from any model.

```graphql
links {
  __typename
  ... on RecordInterface { id }
  ... on BlogPostRecord {
    slug
    title
  }
  ... on AuthorRecord {
    name
    slug
    avatar { url }
  }
}
```

## The `inlineBlocks` Field

Query inline block records (referenced by `inlineBlock` nodes in the DAST). These appear inline within text, unlike regular blocks which are full-width.

```graphql
inlineBlocks {
  __typename
  ... on RecordInterface { id }
  ... on MentionBlockRecord {
    username
    displayName
  }
}
```

## Rendering

DatoCMS provides `<StructuredText>` components for popular frameworks that handle DAST rendering automatically:

| Framework | Package | Component |
| - | - | - |
| React | `react-datocms` | `<StructuredText>` |
| Vue | `vue-datocms` | `<StructuredText>` |
| Svelte | `@datocms/svelte` | `<StructuredText>` |
| Astro | `@datocms/astro` | `<StructuredText>` |

For framework-independent plain-text, HTML-string, or DOM-node export, load [conversion](../../datocms-structured-text/references/conversion.md). For framework rendering APIs, load the matching [frontend reference](../../datocms-frontend-integrations/SKILL.md).

The framework components accept custom renderers for blocks, inline records, inline blocks, and record links:

```tsx
import { StructuredText } from "react-datocms/structured-text";

<StructuredText
  data={post.content}
  renderBlock={({ record }) => {
    switch (record._modelApiKey) {
      case "image_block":
        return <img src={record.image.url} alt={record.image.alt} />;
      case "cta_block":
        return <a href={record.url}>{record.label}</a>;
      default:
        return null;
    }
  }}
  renderInlineRecord={({ record }) => {
    return <a href={`/posts/${record.slug}`}>{record.title}</a>;
  }}
  renderLinkToRecord={({ record, children }) => {
    return <a href={`/posts/${record.slug}`}>{children}</a>;
  }}
  renderInlineBlock={({ record }) => {
    switch (record._modelApiKey) {
      case "mention_block":
        return <span className="mention">@{record.username}</span>;
      default:
        return null;
    }
  }}
/>
```

## Complete Example

```ts
import { executeQuery } from "@datocms/cda-client";

const query = `
  query ArticleBySlug($slug: String!) {
    article(filter: { slug: { eq: $slug } }) {
      title
      body {
        value
        blocks {
          ... on RecordInterface {
            id
            _modelApiKey
          }
          ... on ImageBlockRecord {
            image {
              responsiveImage(imgixParams: { w: 800, auto: format }) {
                src
                srcSet
                sizes
                width
                height
                alt
                base64
              }
            }
            caption
          }
          ... on CodeBlockRecord {
            language
            code
          }
        }
        links {
          ... on RecordInterface {
            id
            _modelApiKey
          }
          ... on BlogPostRecord {
            slug
            title
          }
          ... on AuthorRecord {
            name
            slug
          }
        }
      }
    }
  }
`;

const data = await executeQuery(query, {
  token: process.env.DATOCMS_CDA_TOKEN!,
  variables: { slug: "my-article" },
});

// data.article.body.value — DAST JSON tree
// data.article.body.blocks — embedded block records
// data.article.body.links — linked records
```
