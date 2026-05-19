---
paths:
  - "skills/*/SKILL.md"
  - "skills/*/references/*.md"
---

# Caveman Format

All prose in `skills/*/SKILL.md` and `skills/*/references/*.md` must be **caveman** — terse, dense, token-efficient. `scripts/caveman.ts` re-compresses these files; write caveman from the start so re-compression is a no-op.

## What caveman is

Strips natural-language padding, keeps every load-bearing fact. Same content, fewer tokens.

- Drop filler intros ("This reference covers…", "In this section…").
- Drop tables of contents — headings already are the outline.
- Collapse multi-sentence explanations into one dense line. Chain clauses with em-dashes and parentheticals.
- Cut hedges ("you might want to", "generally a good idea to") — state the rule.
- Cut restatements — heading "How it works" → don't open with "Here's how it works."
- Prefer fragments and noun phrases when meaning is unambiguous.

## What caveman is NOT

- **Not** a code rewrite — never modify fenced blocks or inline backticks.
- **Not** a paraphrase of URLs, paths, commands, headings — verbatim.
- **Not** lossy — every fact, edge case, allowed value, gotcha survives. Compress prose, not information.
- **Not** cryptic shorthand — reader unfamiliar with topic must still parse on first read.

## Before/after

Before:

> The DatoCMS Content Delivery API (CDA) can embed invisible Unicode metadata into text field values when queried with `contentLink: 'v1'`. This metadata is stega-encoded — it uses invisible Unicode characters that don't affect visual rendering but encode information about which DatoCMS field produced each piece of text.

After:

> CDA embeds invisible Unicode metadata in text values when queried with `contentLink: 'v1'`. Stega-encoded — invisible characters, no visual impact, encode which field produced each piece of text.

## When editing

Match surrounding density. If section is already terse, new prose matches. Don't reintroduce filler when expanding a paragraph.
