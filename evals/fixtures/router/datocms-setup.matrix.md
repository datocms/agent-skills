# DatoCMS setup routing matrix

Use this file for manual routing and orchestration verification after updating the setup topic of `datocms`.

## Global pass criteria

For every case below, verify:

- the router picks the smallest correct recipe or internal bundle
- prerequisites are queued automatically
- Stage A is only used for broad or ambiguous requests
- Stage B asks only high-impact unresolved questions
- question wording includes the recommended default and the consequence of skipping it
- final output distinguishes `scaffolded` vs `production-ready`
- final output includes an explicit `Unresolved placeholders` section
- no recipe tells the user to stop and run another recipe manually

## Next.js

| Prompt | Expected recipe or bundle | Notes |
| - | - | - |
| `Use datocms to add website click-to-edit only for this Next.js draft site.` | `draft-mode` + `content-link` | No `web-previews`. Ask the grouped visual-editing follow-up only if the intent is still ambiguous. |
| `Use datocms to add a preview-links endpoint, CORS handling, and record-to-URL routing for this Next.js repo.` | `draft-mode` + `web-previews` | Reuse existing route helpers before asking for mappings. |
| `Use datocms to set up full visual editing for this Next.js site with DatoCMS draft mode, Web Previews, and click-to-edit overlays.` | `visual-editing` bundle → `draft-mode`, `content-link`, `web-previews` (+ `realtime` only if confirmed) | Default mode should be both. |
| `Use datocms to set up DatoCMS preview and editor workflows for this Next.js repo.` | `visual-editing` bundle | Stage A may be broad; Stage B should collapse to the single grouped visual-editing follow-up. |
| `Use datocms to wire DatoCMS visual mode into a Vercel project that already has Edit Mode enabled.` | `visual-editing` bundle with Vercel conflict question | Recommend Dato Visual Editing only when side-by-side editing or the full bundle is requested. |
| `Use datocms to configure typed GraphQL queries in a repo that already uses GraphQL Code Generator and .graphql documents.` | `graphql-types` | Preserve Code Generator; do not force a gql.tada choice. |
| `Use datocms to configure Site Search for a site with /blog and /docs sections.` | `site-search` | Ask one-vs-many index topology only if the repo does not already make the boundary obvious. |

## Nuxt

| Prompt | Expected recipe or bundle | Notes |
| - | - | - |
| `Use datocms to add side-by-side editing in DatoCMS for this Nuxt project.` | `draft-mode` + `web-previews` + `content-link` | This should route through `visual-editing`, not just `content-link`. |
| `Use datocms to add a preview-links endpoint for this Nuxt repo and reuse any existing URL helpers.` | `draft-mode` + `web-previews` | Only ask for mappings if helper reuse stays ambiguous. |
| `Use datocms to set up DatoCMS preview and editor workflows for this Nuxt repo.` | `visual-editing` bundle | Grouped visual-editing follow-up only. |
| `Use datocms to add live DatoCMS preview updates over SSE to this Nuxt draft site.` | `draft-mode` + `realtime` | Treat realtime as an optional enhancement, not a replacement for the visual-editing bundle. |

## SvelteKit

| Prompt | Expected recipe or bundle | Notes |
| - | - | - |
| `Use datocms to add website click-to-edit only for this SvelteKit draft site.` | `draft-mode` + `content-link` | No Web Previews unless the user expands the request. |
| `Use datocms to add side-by-side editing in DatoCMS for this SvelteKit project.` | `visual-editing` bundle → `draft-mode`, `content-link`, `web-previews` | Ensure the route does not collapse to `content-link`. |
| `Use datocms to add a preview-links endpoint and reuse sitemap or SEO URL helpers if they exist.` | `draft-mode` + `web-previews` | Inspect helpers first. |
| `Use datocms to provision DatoCMS Site Search for a SvelteKit site with /blog, /docs, and /help.` | `site-search` | Recommend one shared index first. |

## Astro

| Prompt | Expected recipe or bundle | Notes |
| - | - | - |
| `Use datocms to set up DatoCMS preview and editor workflows for this Astro project.` | `visual-editing` bundle | Stage A may be needed if the rest of the request is broad. |
| `Use datocms to add a preview-links endpoint, CORS handling, and record-to-URL routing for this Astro repo.` | `draft-mode` + `web-previews` | Route inference first, TODO mappings only when needed. |
| `Use datocms to add live DatoCMS preview updates over SSE to this Astro draft site.` | `draft-mode` + `realtime` | Astro should use `QueryListener` semantics instead of pretending to offer live data hydration. |
| `Use datocms to configure typed GraphQL queries for this Astro project.` | `graphql-types` | Default greenfield setups to `gql.tada`. |

## Negative controls

| Prompt | Expected outcome | Notes |
| - | - | - |
| `Can you wire a ContentLink component into my existing Next.js page and patch the current renderer only?` | Do **not** route to setup recipes | Route to the frontend topic for the targeted patch. |
| `Can you patch my existing preview-links route handler only and keep the rest untouched?` | Do **not** route to setup recipes | This is targeted implementation, not one-shot setup orchestration. |
| `Can you wire @vercel/toolbar into this Next.js repo for Edit Mode overlays?` | Do **not** route to setup recipes | This is Vercel-specific implementation work, not DatoCMS setup. |
| `I need a GraphQL query and page component for blog posts from DatoCMS.` | Do **not** route to setup recipes | This is CDA implementation work. |
