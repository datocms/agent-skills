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

// mdast-util-to-markdown defensively escapes `_` in text. Intra-word
// underscores (e.g. `presentation_title_field`) are never parsed as emphasis
// per CommonMark, so the escape is noise. Unescape them after compile.
function remarkUnescapeIntraWordUnderscores() {
  const Compiler = this.compiler;
  if (!Compiler) return;
  this.compiler = (tree, file) => {
    const out = Compiler(tree, file);
    return out.replace(/(\w)\\_(?=\w)/g, "$1_");
  };
}

// Auto-add/remove/sync a `## Contents` table-of-contents in any reference
// markdown file inside a skill (any `.md` under skills/<skill>/ other than
// SKILL.md itself). Files whose body (excluding any existing TOC) exceeds
// 100 source lines and have ≥2 H2 sections get a TOC inserted right before
// the first non-Contents H2; shorter files have any existing TOC stripped.
// Only H2 headings are listed.
function remarkSyncReferenceToc() {
  const TOC_TITLES = new Set(["contents", "table of contents"]);
  const REFERENCE_PATH = /(?:^|\/)skills\/[^/]+\/.+\.md$/;
  const SKILL_FILE = /(?:^|\/)skills\/[^/]+\/SKILL\.md$/;

  const headingText = (node) => {
    let s = "";
    visit(node, (child) => {
      if (child.type === "text" || child.type === "inlineCode") s += child.value;
    });
    return s;
  };

  const cloneInline = (node) => {
    const out = { ...node };
    delete out.position;
    if (Array.isArray(node.children)) {
      out.children = node.children.map(cloneInline);
    }
    return out;
  };

  const buildTocNodes = (sections) => [
    { type: "heading", depth: 2, children: [{ type: "text", value: "Contents" }] },
    {
      type: "list",
      ordered: false,
      spread: false,
      children: sections.map((inlineChildren) => ({
        type: "listItem",
        spread: false,
        children: [
          {
            type: "paragraph",
            children: inlineChildren.map(cloneInline),
          },
        ],
      })),
    },
  ];

  return (tree, file) => {
    const filePath = (file.path || "").replace(/\\/g, "/");
    if (!REFERENCE_PATH.test(filePath) || SKILL_FILE.test(filePath)) return;

    const children = tree.children;

    const h1Index = children.findIndex(
      (n) => n.type === "heading" && n.depth === 1,
    );
    if (h1Index === -1) return;

    let firstH2 = -1;
    for (let i = h1Index + 1; i < children.length; i++) {
      if (children[i].type === "heading" && children[i].depth === 2) {
        firstH2 = i;
        break;
      }
    }
    if (firstH2 === -1) return;

    let tocStart = -1;
    let tocEnd = -1;
    if (TOC_TITLES.has(headingText(children[firstH2]).trim().toLowerCase())) {
      tocStart = firstH2;
      let j = firstH2 + 1;
      while (
        j < children.length &&
        !(children[j].type === "heading" && children[j].depth <= 2)
      ) {
        j++;
      }
      tocEnd = j;
    }

    const sections = [];
    const scanFrom = tocEnd !== -1 ? tocEnd : firstH2;
    for (let i = scanFrom; i < children.length; i++) {
      const node = children[i];
      if (node.type !== "heading" || node.depth !== 2) continue;
      if (TOC_TITLES.has(headingText(node).trim().toLowerCase())) continue;
      sections.push(node.children);
    }

    const totalLines = String(file.value || "").split("\n").length;
    let tocLines = 0;
    if (tocStart !== -1 && tocEnd > tocStart) {
      const startLine = children[tocStart].position?.start?.line;
      const endLine = children[tocEnd - 1].position?.end?.line;
      if (startLine && endLine) tocLines = endLine - startLine + 1;
    }
    const contentLines = totalLines - tocLines;

    const shouldHaveToc = contentLines > 100 && sections.length >= 2;

    if (shouldHaveToc) {
      const tocNodes = buildTocNodes(sections);
      if (tocStart !== -1) {
        children.splice(tocStart, tocEnd - tocStart, ...tocNodes);
      } else {
        children.splice(firstH2, 0, ...tocNodes);
      }
    } else if (tocStart !== -1) {
      children.splice(tocStart, tocEnd - tocStart);
    }
  };
}

export default {
  plugins: [
    remarkFrontmatter,
    [remarkGfm, { tablePipeAlign: false }],
    remarkUnwrapProse,
    remarkSyncReferenceToc,
    remarkUnescapeIntraWordUnderscores,
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
