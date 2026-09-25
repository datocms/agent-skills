# Deployed workflow validation

This follow-up covers the previously deferred hosting, real search crawling, and Next.js cache-tag workflows on one authorized disposable Vercel project. WordPress and Contentful imports remain deferred. Seven evaluated sessions used `gpt-5.6-luna` with medium reasoning; provider operations and independent browser/API checks are separate evidence. No usage resets were used. The [attempt ledger](2026-09-19-deployed-workflows.json) retains failed attempts, repairs, evaluator corrections, source hashes and cleanup results.

The final fresh cache implementation passes all six deployed cache checks. The search implementation, after focused repairs, passes all four browser checks and real indexing checks in five locales. A separate fresh credential-provisioning run passes real search and denied-write checks. These are representative verified outcomes, not an aggregate reliability estimate or a claim that every model/framework/provider combination is covered.

| Workflow | Independently verified result | Boundary |
| - | - | - |
| CMS deployment trigger | Actual Vercel build failure and success reach CMS build-event logs; failed build leaves the public site available; original build command restored | Operator verification through the existing authorized project hook |
| Automatic indexing | Successful deployment triggers and completes indexing; deliberate failed build does not start another crawl | Owned index associated with the existing trigger |
| Real search crawler | Published fixture URLs appear in all five locale indexes; draft-only and deliberately excluded post URLs do not; excluded posts remain directly accessible | Actual DatoCMS crawler, not simulated search results |
| Public routes and sitemap | Twenty localized fixture requests return expected 200/404 statuses and language output; the deployed sitemap includes only the intended published fixture URLs | One existing Next.js website |
| Search credential | Dedicated token can search, cannot edit a record, has no CDA access, and its role has no content/upload/configuration-management/trigger grants | Some project metadata remains readable; this is not a claim that every CMA read is denied |
| Search UI | Route locale initializes the filter; real pagination changes result URLs; loading, empty and error states render; no browser runtime exceptions | Loading delay and error response are controlled faults; normal queries use the real index |
| Published cache mappings | Real CDA response tags persist in an external transactional mapping service under distinct query identities | SQLite-backed test service; other database providers are not validated |
| Draft separation | Updated unpublished title appears with authenticated draft cookies while public content remains published; draft reads do not replace published mappings | Owned record only |
| Real cache webhook | CMS publication delivers its real nested cache-tag payload; the first checked published response contains the new title | Shared CDA dependencies can legitimately invalidate multiple query identities |
| Cache failure paths | Unauthorized, malformed and invalid-type payloads are rejected; empty tags are a successful no-op; repeated delivery succeeds; mapping-service outage returns 5xx and recovery succeeds | Controlled dependency outage against the real deployed route |
| Credential boundaries | Public HTML and 18 script artifacts contain none of the supplied server/CMS/provider/mapping credentials | The dedicated browser search token is intentionally public |

The website's lockfile pins Next.js 16.0.7, React 19.2.1, react-datocms 8.1.2, cda-client 0.3.1, and cma-client-browser 6.1.0. The final deployment installs from that lockfile. Its fresh actor's local build encountered missing installed Site Search dependencies in the fixture; the unchanged implementation subsequently built and passed on Vercel. This is a verified functional outcome, not a strict execution pass.

## What changed in the skill

The first search credential had `can_access_cma: false`, which rejected search itself with 401. Site Search is served through a CMA endpoint: the token must enable that transport gate while its dedicated role grants only search. The reference now distinguishes transport access from management permissions and requires a real search request plus a denied management action. A guided repair and separate fresh provisioning run verify that clarification.

The initial localized search page defaulted to English on an Italian route. The shared search guidance now takes the initial locale from the validated route and keeps it synchronized on navigation. The React example accepts a locale and also removes an unrelated undefined query variable from its basic form example; that latter correction is static example review, not an additional live test.

The first cache run read the framework reference's Core section and missed its granular-cache section. It rejected valid empty-tag notifications. A focused repair fixed that behavior and followed the existing immediate-expiration guidance. The entrypoint now points cache work directly to the framework's Cache Tags section instead of duplicating that section's implementation instructions. A fresh run loaded that section and passes the final deployed checks.

## Corrections retained as evidence

The initial provider environment read returned ciphertext rather than usable credentials. The fixture now uses and validates the provider's environment download. The deployment adapter also accommodates the integration's limited API scopes: project snapshots are readable even where account-level deployment APIs and direct CLI production deployment are denied. Candidate deployment uses a temporary source patch through the one existing project hook; no Git push can trigger another linked project. The first such build omitted development dependencies under production settings; including lockfile development dependencies fixed the deployment harness.

An early failure oracle confused Vercel's latest attempted production target with the deployment serving the public alias. The public site remained healthy throughout the deliberate build failure. The browser checker initially lacked its configured Chrome channel, then observed a pagination label before new results arrived. Those are evaluator corrections, not skill regressions. Corrected pagination checks wait for both the new response and rendered URLs.

One repair's privacy flag was a false positive because its secret list incorrectly included the public origin and index ID. The original flag remains in the ledger alongside the context audit; no actual credential output was observed. Later runs register only credential variables. Newly created token values were audited separately because they were unknown to the runner at launch.

## Scope and restoration

The [reusable harness](../deployed/README.md) includes exact-project guards, isolated actor configuration, deployed search/cache oracles, a persistent mapping fixture, and source-patch deployment with build-command restoration. Seven deterministic scope tests cover identity mismatches, environment-variable ownership and error redaction, alongside the existing twelve harness tests.

Cleanup is independently verified: all 731 original record hashes and original role/token permissions match; the original application, build settings, webhook and seven runtime variables are restored; owned CMS resources and environment variables are absent; the linked Git revision is unchanged. The mapping service, tunnel and evaluated application listeners are stopped. No other Vercel project or account setting was changed.

The broader [capability inventory](2026-09-19-capability-audit.json) keeps remaining combinations explicit. This closes representative Vercel deployment, external Site Search crawling and Next.js cache-tag behavior. It does not cover deferred imports, all alternate CDN/database providers, every permission combination, or every plugin surface.
