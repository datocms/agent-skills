# Catalog workflow validation

This round extends the earlier recent-change coverage with five prioritized workflows from the wider catalog. Each now has a correct outcome verified through actual API responses, generated code execution, or browser behavior. All evaluated sessions use `gpt-5.6-luna` with medium reasoning. No usage reset credits were consumed.

The [evidence ledger](2026-09-19-catalog-workflows.json) retains twelve evaluated sessions, six model-free rechecks, and three setup failures. It records original failures, copied skill hashes, harness and transcript digests, runtime settings, command failures, and cleanup results. These runs span different candidates and oracle revisions, so they are not combined into a success-rate estimate. Raw workspaces and transcripts remain in ignored local storage.

The initial plugin result predates the separate oracle-manifest field; its digest remains null rather than being reconstructed. Later rechecks record that manifest explicitly.

| Workflow | Independently verified outcome | Final evidence |
| - | - | - |
| CDA and rendering | Real GraphQL pagination and totals; locale fallback; embedded blocks, inline records, links and inline blocks rendered in Chrome; draft/published separation; empty page behavior | Fresh candidate runs for both empty and populated inline-block allowlists |
| Migrations | Repair a partially applied migration; preserve an existing model and record; apply a separate additive migration; verify tracking, a no-op rerun, and execution from an empty schema | One fresh implementation; reruns execute its migration files independently |
| Content and asset import | Parse quoted, comma-containing and multiline CSV; preserve existing record IDs, editor notes and unrelated records; reuse shared assets; verify CDN bytes; rerun without duplicate records or uploads | One fresh implementation and an independent rerun |
| Plugin | Build the real SDK/UI application; exercise localized and nested field writes, host updates, missing values, disabling, theme, sizing and clearing an unlocalized field | One fresh implementation, then two stronger browser rechecks without another model call |
| Visual editing | Build and serve Next.js; isolate draft credentials; authenticate draft mode and reject unsafe redirects; open preview links; verify exact environment/record/field edit destinations and keyboard toggling; receive a real CMS update without reload; synchronize embedded navigation and preserve the localized field path; restore published content | Final implementation passed two model-free browser checks after correcting the local hostname fixture; earlier partial results remain separate |

## What changed in the skills

The original visual-editing implementation built successfully but failed when requesting the actual article. Its server page imported a query from a module marked `'use client'`, producing a client reference instead of a usable query. The Next.js reference now keeps shared queries in a plain module, corrects the example's misleading `page.tsx` caption, and asks for published/draft runtime verification before claiming a working integration. The fresh final application passed those checks.

A CDA run recovered from querying nested fragments on `inlineBlocks` when the schema exposed it as a scalar because its model allowlist was empty. A short clarification now explains inspecting the generated type and selecting only applicable reference fields. Fresh cases passed with both an empty allowlist and real inline blocks; neither case requires one prescribed query spelling.

The browser checks also exposed incorrect keyboard wording shared by four Content Link references. Alt/Option temporarily inverts the current editing state and restores it on release. The references now describe that behavior; the final browser check verifies disabling already-enabled editing and restoring it. This is shared-controller evidence, not four separate framework runs.

No guidance was added for incidental recovered command errors. Strict execution remains diagnostic: the migration session had no failed commands, while successful other sessions include recovered errors. The objective is correct behavior, preservation and bounded execution, not a perfect command trace.

A fresh visual-editing run also returned no preview links because it expected `__itemTypeId` on the incoming JSON item. That discriminator is added by SDK deserialization. The Next.js reference now distinguishes the raw relationship from the SDK property and correctly describes the accompanying `itemType` payload. The final oracle serializes a real CMS record back to its wire shape and includes the model payload, following the [Web Previews contract](https://www.datocms.com/marketplace/plugins/i/datocms-plugin-web-previews#the-preview-links-api-endpoint).

The next implementation mapped the raw payload correctly but passed the draft token to a client component even for a published visitor. Disabling its subscription did not prevent the credential from appearing in the public response. The existing independent assertion caught this; cleanup revoked the temporary token. The real-time reference now explains that the server must keep draft credentials and subscription options inside its enabled-draft branch. This supplements the existing conditional example without prescribing application structure.

Another run correctly isolated credentials and handled previews, but its subscription omitted the sandbox environment and never received the test edit. The shared real-time reference now explains that subscriptions do not inherit a server wrapper's options; the Next.js helper passes the environment explicitly.

Inspection also found a shared documentation and fixture defect: editing base URLs included `/environments/...`, which the CDA appends itself. The shared concepts, framework examples and setup recipe now use the project origin, as specified by the [CDA request contract](https://www.datocms.com/docs/content-delivery-api/api-endpoints). The fixture and oracle now require the exact environment, model, record and localized field path, rather than just matching substrings.

## Failures retained and classified

The ledger preserves the visual-editing runtime, preview-payload, public-page credential and subscription-environment failures as implementation failures. It separately preserves project lookup without organization scope, a reserved fixture field name, and a missing editing-base setting as setup failures that did not run an evaluated session.

Two later visual-editing failures belonged to the oracle. It initially excluded valid HTTP 422 rejection of an unsafe redirect, then held Alt while persistent editing was already enabled and thereby disabled the feature it intended to click. The corrected oracle accepts supported client-error rejection, waits for Content Link hydration, and operates the intended editing state. Rechecks reused the original application with only the task-supplied sandbox and model coordinates rebound; file hashes and substitutions are retained. Application logic was not repaired during rechecks.

The earlier successful visual recheck remains a pass of its original oracle, but is classified as partial evidence because that oracle accepted a duplicated environment path in the editing URL. It proves its live-update and iframe assertions, not a correct complete editing destination. The later exact-path assertion closes that gap.

The final fresh implementation initially lost draft mode during a redirect because Next.js normalizes loopback IPs to `localhost`, while the fixture had set the cookie on `127.0.0.1`. The installed framework source confirms that normalization. Keeping the website and iframe host on `localhost` resolved it without changing the application. The same application then passed the full browser flow, followed by an additional check preserving the complete `title.en` path through the iframe protocol.

The plugin host also needed complete theme tokens and deterministic font loading. Its final recheck uses the same application with the corrected host. Rechecks add outcome evidence without being counted as new model evaluations.

## Scope and reproduction

Plugin and embedded preview checks run real SDK/controller code in Chrome with controlled iframe hosts. They do not visit the hosted CMS editor. This round covers a full Next.js browser flow, CSV/local-file imports and disposable migration sandboxes. It does not add full browser flows for every framework, WordPress/Contentful importer integration, production deployment, environment promotion, or a model/provider matrix. Five useful workflow families are covered; this is not proof of perfect reliability across the entire catalog.

Live scenarios ran serially against an authorized empty throwaway project. Every created sandbox and temporary delivery token was cleaned up, with before/after assertions for primary models, uploads, locales, environments and token IDs. Web implementations received delivery tokens rather than management credentials. Credential output fails the native runner; raw evidence is not suitable for public upload.

Follow the [catalog runner instructions](../catalog/README.md) to reproduce the scenarios. The runner stops on account usage exhaustion, records a resumable result and performs cleanup; it never consumes reset credits. Deterministic validation includes the nine native-runner/replay tests, TypeScript checking, Markdown formatting, repository validation and rebuilt source archives. Skill hashes identify the uncommitted candidates more precisely than their common base revision, `e417b4cb5394f107c0595aac68eed72a5156610a`.

The generic skill checker passed CDA and frontend integrations. It rejects setup's existing `disable-model-invocation` frontmatter property, which is unchanged from the base; the repository's own validator accepts and validates that skill and its recipes. No metadata was removed to satisfy the narrower checker.
