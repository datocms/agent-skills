# Structured Text extraction baseline snapshots

Historical Claude/frontmatter results from commit `94e4bd8128e52963829f65bce8f202fcd68ac8d6`, preserved byte-for-byte when the neighboring Structured Text trigger fixtures were expanded. These are baseline evidence, not results for the current fixtures. The Claude runner was unavailable during this refresh; no classifications were synthesized or relabeled.

Each file originally lived at `evals/results/trigger/<skill>/claude/frontmatter/results.json`. The same `<skill>/claude/frontmatter/results.json` suffix is retained here. The existing validator excludes underscore-prefixed result directories; canonical result discovery also excludes this deeper archive. No validation rules were changed.

The CMA and CLI snapshots were already shorter than their fixtures at the source commit. Other snapshots became stale when the document-work boundary cases were added.

| Skill | Snapshot rows | Source fixture rows | Expanded fixture rows | SHA-256 of unchanged result file |
| - | - | - | - | - |
| `datocms-cda` | 22 | 22 | 25 | `b3fb49a1a4f95fa170a6af5a9b3b2eff7c70a8c3fb75bc0b886044a90fc534f0` |
| `datocms-cli` | 32 | 46 | 48 | `91414ebe586d2b91e4efa68690904908f02e6edb9e91ddf501a61f5d187439d1` |
| `datocms-cma` | 21 | 33 | 36 | `923a6088cc4bb1e3aea5509f0abd32b0b7504e4ad496af32ea4dd968e356a7ea` |
| `datocms-frontend-integrations` | 23 | 23 | 25 | `4ec6449bd76ee7a5121b42feec2fce564ff823813aa290b0bd137955a7d7393e` |
| `datocms-setup` | 59 | 59 | 61 | `16231044f610cc35c698b101782f2c836e657aac7e7b837a097050df7fbfd21d` |

Use the current canonical snapshots to assess the expanded fixtures. Compare these historical snapshots only against the matching source fixture and routing surface.
