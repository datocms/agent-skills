# Structured Text Customization Reference

These hooks let you add custom inline marks and block-level styles to Structured Text fields in the DatoCMS editor.

## Contents

- `customMarksForStructuredTextField`
- `customBlockStylesForStructuredTextField`
- Programmatic Structured Text Manipulation

## `customMarksForStructuredTextField`

Defines custom inline marks for Structured Text fields (e.g., custom highlighting).

```ts
customMarksForStructuredTextField(
  field: Field,
  ctx: CustomMarksForStructuredTextFieldCtx  // ctx.itemType available
): StructuredTextCustomMark[] | undefined
```

### `StructuredTextCustomMark` shape

```ts
{
  id: string;
  label: string;
  icon: Icon;
  appliedStyle: React.CSSProperties;  // How the mark looks in the editor
  placement?: [
    'before' | 'after',
    'strong' | 'emphasis' | 'underline' | 'code' | 'highlight' | 'strikethrough'
  ];
  rank?: number;
  keyboardShortcut?: string;  // e.g., 'mod+shift+x' (is-hotkey syntax)
}
```

### Example

```ts
connect({
  customMarksForStructuredTextField(field) {
    if (field.attributes.api_key !== 'body') {
      return undefined;
    }
    return [
      {
        id: 'spoiler',
        label: 'Spoiler',
        icon: 'eye-slash',
        keyboardShortcut: 'mod+shift+s',
        appliedStyle: {
          backgroundColor: 'var(--color--ink)',
          color: 'transparent',
          borderRadius: '2px',
        },
      },
    ];
  },
});
```

## `customBlockStylesForStructuredTextField`

Defines custom block-level styles for Structured Text fields.

```ts
customBlockStylesForStructuredTextField(
  field: Field,
  ctx: CustomBlockStylesForStructuredTextFieldCtx  // ctx.itemType available
): StructuredTextCustomBlockStyle[] | undefined
```

### `StructuredTextCustomBlockStyle` shape

```ts
{
  id: string;
  node: BlockNodeTypeWithCustomStyle;  // 'paragraph' | 'heading'
  label: string;
  appliedStyle: React.CSSProperties;
  rank?: number;
}
```

**Frontend rendering**: Custom marks and block styles only affect the editor preview via `appliedStyle`. Your frontend must implement custom rendering for these marks/styles using the standard DAST output and a rendering library (e.g., `react-datocms`, `vue-datocms`).

## Programmatic Structured Text Manipulation

If your plugin needs to read or modify Structured Text content programmatically (e.g., in a sidebar panel, outlet, or addon), remember that `ctx.formValues` stores Structured Text in **Slate editor format**, not DAST. See `form-values.md` for the full Slate vs DAST comparison.

### Reading Structured Text (analysis, word count, link extraction)

For read-only analysis, convert to DAST first for a cleaner tree structure:

```ts
import { slateToDast } from 'datocms-structured-text-slate-utils';

const slateValue = ctx.formValues.body;
const dast = slateToDast(slateValue);
// Now you can walk the DAST tree to count words, extract links, etc.
```

### Modifying Structured Text (inserting blocks, text)

For write operations, work directly with the Slate format:

```ts
// Insert a new block at the end of a Structured Text field
const currentValue = ctx.formValues.body as unknown[];
await ctx.setFieldValue('body', [
  ...currentValue,
  {
    type: 'block',
    key: `${Date.now()}`,       // temporary unique key — replaced with real ID on save
    blockModelId: '810933',     // the block model's ID
    children: [{ text: '' }],   // required by Slate
    title: 'New Block Title',   // block field values are inline properties
  },
]);
```

### Type guards from `datocms-structured-text-slate-utils`

The package provides TypeScript types and type guards for working with Slate nodes:

```ts
import { isLink, isNonTextNode, type Node } from 'datocms-structured-text-slate-utils';

function extractLinks(nodes: Node[]): string[] {
  const links: string[] = [];
  for (const node of nodes) {
    if (isLink(node)) {
      links.push(node.url);
    }
    if (isNonTextNode(node) && 'children' in node) {
      links.push(...extractLinks(node.children as Node[]));
    }
  }
  return links;
}
```

### Key rules

- **Never use Editor extensions for Structured Text fields** — use Addon extensions instead
- Custom marks defined via `customMarksForStructuredTextField` appear as boolean keys on Slate text nodes (e.g., `{ text: "spoiler text", spoiler: true }`)
- Custom block styles defined via `customBlockStylesForStructuredTextField` appear as `style` properties on block nodes (e.g., `{ type: "paragraph", style: "callout", children: [...] }`)
