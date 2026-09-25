# Deployed website coverage

These opt-in tests extend the local catalog workflows with a real DatoCMS project and one explicitly authorized Vercel project. WordPress and Contentful imports are outside this cohort. Model sessions use the shared native runner's pinned model and reasoning effort. Provider operations and browser rechecks are operator verification, not additional model passes.

Use an isolated checkout of the website and keep credentials, provider snapshots, resource journals and attempt output under ignored `local/`. The fixture used for the recorded run is a Next.js marketing website with localized `post` records in five languages: two published searchable posts, a published `e2e-unlisted-` post, and a draft-only post. All posts belong to the run; preserve existing schema and records. Provision valid author, tag and image references according to the target schema, then independently read back publication and validation state.

Run a fresh implementation with:

```sh
dev/node_modules/.bin/tsx dev/e2e/deployed/actor.mjs local/actor-config.json
```

The JSON config selects `scenario` (`search` or `cache`), `workspace`, a new `output` directory, `environmentFile`, `siteId`, `internalDomain` and HTTPS `origin`. Search also takes a unique `prefix`, `locales`, and `fixtures` containing each record's slug and publication/exclusion purpose. Environment values are read privately and never placed in prompts. The actor cannot deploy or modify existing CMS resources. Inspect the transcript and its provenance, and audit credentials created after the session starts separately: the runner can redact only credentials known at launch.

For cache testing, `createTagStore()` in `tag-store.mjs` supplies a transactional SQLite mapping service. Bind it to loopback and expose only that authenticated service through a temporary HTTPS tunnel. Pass its URL and generated token to the app's server environment. The fixture deliberately uses persistent external storage while leaving Next.js and Vercel caching real. It does not establish compatibility with every managed database provider. `setUnavailable()` provides a controlled dependency failure. Close the service and tunnel after checks.

The remaining modules expose composable verification steps:

- `scopedVercel()` verifies the exact project ID, team, name and Git repository before project mutations. It cannot list or mutate other projects or account settings. Environment variables are owned by ID/key; an existing variable is never overwritten. Environment-list responses may contain ciphertext and must not be forwarded as runtime credentials; obtain and validate runtime values through the provider's environment download flow.
- `deployCandidate()` builds a source patch against an exact baseline revision and applies it through the existing project's deploy hook, with an owned temporary environment variable and build command. It restores the original command in `finally`. This avoids pushing a repository that might also deploy to another project. Production builds include development dependencies. Polling uses project snapshots because an integration may not have account-wide deployment-read permissions.
- `checkDeployedSearch()` requests all fixture URLs, verifies the live sitemap and language output, triggers a real crawl, retains crawl events, and queries the resulting index independently in every locale.
- `checkSearchBrowser()` exercises the deployed UI with real search requests, two-result pagination and empty results. Controlled request delay and a 401 response test loading and error presentation. Pagination waits for the new response and DOM, not only the page-number label.
- `checkDeployedCache()` uses owned content for draft and published checks, exercises the real cache-tag webhook, checks repeated delivery, and interrupts/restores the mapping service. It disables the legacy global webhook to avoid masking tag behavior. It leaves restoration to the outer cleanup journal so the global webhook is not re-enabled against an incompatible candidate route.

Record provider-trigger success and deliberate build failure separately. A failed latest production-target attempt is not necessarily the deployment serving the public alias: verify the actual public alias and response. Associate the owned search index with the authorized trigger to observe indexing after successful deployment.

The outer run must clean up even after a failed check: restore the baseline application and project build settings; remove only journaled environment variables; restore original webhook configuration; delete owned webhooks, indexes, tokens, roles and fixture records; stop local servers/tunnels; and compare original content hashes and resource configuration. Never claim cleanup from a successful delete request alone. Keep failed attempts and evaluator corrections, use a new output directory for each rerun, and do not infer a reliability rate from repairs or changing candidates.
