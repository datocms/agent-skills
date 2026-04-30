import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";

// Equivalent of prettier's `proseWrap: "never"` — collapse soft line breaks
// inside paragraphs/headings/table cells into single spaces so prose flows on
// one source line per paragraph. Hard breaks (the `break` node) are preserved.
function remarkUnwrapProse() {
  return (tree) => {
    visit(tree, "text", (node) => {
      if (typeof node.value === "string") {
        node.value = node.value.replace(/\s*\n\s*/g, " ");
      }
    });
  };
}

export default {
  plugins: [
    remarkFrontmatter,
    [remarkGfm, { tablePipeAlign: false }],
    remarkUnwrapProse,
  ],
  settings: {
    bullet: "-",
    emphasis: "_",
    strong: "*",
    fence: "`",
    fences: true,
    listItemIndent: "one",
    rule: "-",
    incrementListMarker: true,
  },
};
