# Version 2 rollout

The unification is independent of PR #8. Its source baseline is `86c533b74c2913e590797eb0b2622d2cdfe5cf68`; the unmerged changes from #8 are not included.

## Before merging the unified package

Release and verify the preparation changes in the CLI, remote MCP, and website. They pin legacy reference and archive URLs to the retained baseline commit so removing paths on `master` cannot break those updated consumers. Website archive digests must be calculated from the exact pinned ZIP bytes.

Previously installed CLI binaries still using mutable legacy URLs need an upgrade. A new release cannot change an old binary's resolver.

## After the unified package is approved

1. Merge the unified skill and verify its archive and structural checks.
2. Release the consumer follow-ups that point to the unified references. The upgraded CLI accepts `datocms agents:reference datocms cma/editing-records` and maps legacy command spellings to the same content.
3. Deploy the website catalog with one `datocms` entry. Pin its archive URL to the reviewed immutable artifact revision and verify the digest of those bytes. Confirm the production deployment and CDN purge, not just the source merge.
4. Update public installation instructions with the standalone removal/reinstallation steps and the automatic setup behavior.
5. Run the normal knowledge refresh with its existing manifest intact. Verify completion, new-path retrieval, and old-path deletion. Let the existing search cache expire, or use its supported cache-version update if an immediate cutover is required.

The knowledge loader already includes Markdown below `skills/`; it does not need a new discovery implementation. Do not clear its manifest, which records the old entries that need deletion.

## Review boundaries

Keep preparation and final consumer changes in separate draft PRs with their ordering documented. Nothing in the structural migration authorizes merging, releasing, deploying, submitting feedback, or running production indexing.

Behavioral comparisons and measurements remain local. Do not describe structural validation as proof of better task results or reduced context rot.
