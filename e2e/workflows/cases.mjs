// These are complete advisory tasks. Rubrics are evaluator-only, not added to prompts.
// Execution tasks belong to the live CMS and built-application suites.
export const cases = [
  {
    id: "setup-discovery-existing-nuxt",
    commits: ["94e4bd8"],
    files: {
      "package.json": JSON.stringify({
        private: true,
        dependencies: { nuxt: "4.5.2", "vue-datocms": "9.0.0" },
      }),
      "nuxt.config.ts": "export default defineNuxtConfig({})",
    },
    prompt:
      "$datocms-setup Our existing DatoCMS site is in this repository. Editors want a better preview experience but have not chosen between a draft URL, sidebar preview, and clicking fields on the website. Help us choose before implementing anything.",
    rubric: [
      "Uses the existing Nuxt repository and project context",
      "Explains distinct preview outcomes and asks only unresolved preferences",
      "Does not require project creation or broad framework rediscovery",
      "Makes no edits",
    ],
  },
  {
    id: "paid-allowance-unseen",
    commits: ["246ff19"],
    prompt:
      "We verified that this DatoCMS project includes 4 collaborators and already has 4. Its technical hard cap is 20. I approved the charge for inviting 2 more collaborators. Explain the capacity and billing preflight for these invitations, without inviting anyone. Does my approval change the included allowance?",
    rubric: [
      "Keeps included allowance at 4 and planned usage at 6",
      "Recognizes approval covers the 2 extra collaborators",
      "Does not require a subscription upgrade or entitlement activation solely because of cost approval",
      "Does not execute invitations or request duplicate cost approval",
    ],
  },
  {
    id: "setup-discovery",
    commits: ["94e4bd8"],
    prompt:
      "$datocms-setup Help me set up previews for our existing DatoCMS website. I am not sure which kind of preview I need. Before changing anything, help me choose and ask what you need to know.",
    rubric: [
      "Distinguishes relevant preview outcomes in plain language",
      "Asks for unknown framework and desired outcome without assuming features",
      "Uses ordinary questions when no question tool exists",
      "Makes no changes or invented project claims",
    ],
  },
  {
    id: "plugin-development-copy",
    commits: ["da25e13"],
    prompt:
      "Our Marketplace field editor must keep working for editors while I test local changes on two test fields. Explain the practical DatoCMS development workflow and how to return to the working version afterward. Do not change anything.",
    rubric: [
      "Uses a separate development copy without converting the production installation",
      "Explains field assignments are not copied and restricts reassignment to test fields",
      "Keeps original enabled unless explicitly intended otherwise",
      "Explains return to original and unique plugin names",
    ],
  },
  {
    id: "plugin-package-switch",
    commits: ["da25e13"],
    prompt:
      "We have a private DatoCMS plugin with saved global settings. The package datocms-plugin-example is now published. Write the CMA operation to connect that existing installation to the package, retain settings, and then disable it without deleting it. Also show how to list affected fields. Our pinned SDK may predate these update attributes. Do not execute anything.",
    rubric: [
      "Uses package_name update separately from unrelated attributes except enabled",
      "Preserves parameters without reconstructing legacy definitions",
      "Uses enabled false and plugins.fields",
      "Checks serialization support and proposes supported SDK or documented raw request, not a cast",
    ],
  },
  {
    id: "theme-compatibility",
    commits: ["f013cde"],
    prompt:
      "This DatoCMS project reports site.meta.allow_custom_theme=false. The current theme is monochromatic. Can I set an arbitrary multi-color palette by leaving theme.type out of the update? Explain what I can safely change, and whether renaming the project requires touching the theme. Do not execute changes.",
    rubric: [
      "Omitting type does not bypass restriction; legacy custom form is rejected",
      "Uses supported monochromatic settings only if requested",
      "Unrelated rename leaves theme untouched",
    ],
  },
  {
    id: "paid-environment-preflight",
    commits: ["246ff19"],
    prompt:
      "Plan a release for our DatoCMS project. The verified plan includes 2 sandboxes, there are already 2 sandboxes plus main, and the technical hard limit is 10 environments. The rollback workflow needs one additional sandbox. We have not approved extra charges. Can you proceed because we are under 10? Do not perform any operations.",
    rubric: [
      "Distinguishes included allowance from technical hard limit",
      "Excludes primary from sandbox allowance",
      "Requires authorization for the new cost",
      "Does not replace rollback with in-place changes, delete existing sandboxes, or upgrade plan",
    ],
  },
  {
    id: "paid-preflight-authorized",
    commits: ["246ff19"],
    prompt:
      "For this DatoCMS release, current verified usage is 2 sandboxes plus main, the included allowance is 2, and the hard limit is 10. I already approved the extra charge for one more sandbox and want to keep our fork-and-promote workflow. Give me the next steps without executing them.",
    rubric: [
      "Reuses explicit cost authorization rather than asking again",
      "Preserves fork-and-promote and rollback workflow",
      "Does not count main as sandbox or claim remaining hard capacity means free",
    ],
  },
  {
    id: "cda-cache-diagnostics",
    commits: ["382fae2"],
    prompt:
      "Our DatoCMS CDA response has X-Cacheable-On-Cdn: true, X-Cacheable-On-Cdn-Query-Length-Limit: 7200/8192 and CF-Cache-Status: MISS. The JSON query body is small. Another job sees 429s with four API tokens, each below its per-second limit, while many workers run expensive queries. Explain what these observations establish and what you would change first. Do not access our project.",
    rubric: [
      "Eligibility is not an actual cache hit",
      "Length pair measures encoded GET URL including variables, not gzip JSON body",
      "Project-wide concurrency is shared across tokens",
      "Recommends coordinated concurrency reduction and inspecting error/reset data, not more tokens or automatic billing explanation",
    ],
  },
  {
    id: "seo-image-fallback",
    commits: ["3eeb2a5"],
    prompt:
      "Our DatoCMS model has an explicit SEO field but its image points at a PDF without dimensions. The model image-preview field is a gallery whose first upload is also unusable and second upload is a valid photo. Global SEO has a valid image. What image should _seoMetaTags return, and should our frontend reconstruct the fallback logic? Also explain what happens if every candidate is unusable.",
    rubric: [
      "Unusable SEO image is skipped despite explicit SEO field",
      "Only first gallery upload is considered; global image wins",
      "No usable candidate means no image tags",
      "Renders returned _seoMetaTags rather than rebuilding fallback algorithm",
    ],
  },
  {
    id: "image-defaults",
    commits: ["9769977"],
    prompt:
      "A DatoCMS project defaults image URLs to auto=format and q=75. If my GraphQL query requests url(imgixParams: {w: 240}), are all project optimizations disabled? Show a query that bypasses every project default for this one image while still setting width. Explain the tradeoff without changing project settings.",
    rubric: [
      "Unspecified defaults remain active; explicit params override matching defaults only",
      "Uses skipDefaultOptimizations:true alongside w",
      "Explains possible larger images/bandwidth and avoids project-wide changes",
    ],
  },
  {
    id: "visual-editing-sidebar",
    commits: ["eb952f6", "94dfa32"],
    prompt:
      "We added DatoCMS Content Link overlays and now editors want a preview inside the record sidebar. Are overlays enough, or does the Web Previews plugin need configuration too? Some fields are excluded from content links, and the preview page shows warning badges. Explain what to configure and how to handle those warnings without globally disabling useful diagnostics.",
    rubric: [
      "Distinguishes Visual Editing overlays from sidebar preview configuration",
      "Explains Web Previews plugin and previewLinks endpoint plus draft mode when needed",
      "Recognizes field-level content_link_enabled controls",
      "Handles warning/overlay behavior from the actual available guidance without inventing flags",
    ],
  },
  {
    id: "astro-native-cache",
    commits: ["7ae28ef", "4db6ce5"],
    prompt:
      "We use Astro 7 SSR with an adapter that supports its native cache. Add DatoCMS cache-tag invalidation to the implementation plan: how should page rendering collect tags, how should draft pages behave, and what should the webhook invalidate? Is an application-owned Cloudflare purge implementation mandatory? This is a design review; do not edit files.",
    rubric: [
      "Uses Astro native cache and supported adapter by default",
      "Draft content is private/no-store and does not enter public caches",
      "Connects received DatoCMS tags with native invalidation",
      "Does not mandate a CDN purge adapter when native cache is supported",
    ],
  },
];
