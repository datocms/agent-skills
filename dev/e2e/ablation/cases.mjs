import { cases as workflows } from '../workflows/cases.mjs';

// Review criteria stay outside actor workspaces. Held-out cases run only after
// the candidate has been frozen; they are not author-blinded holdouts.
export const cases = [
  { ...workflows.find(c => c.id === 'setup-discovery-existing-nuxt'), area: 'setup', phase: 'screen' },
  {
    id: 'setup-bundle', area: 'setup', phase: 'screen',
    files: { 'package.json': JSON.stringify({ private: true, dependencies: { next: '16.3.5', react: '19.3.0' } }), 'src/app/page.tsx': 'export default function Page(){return <h1>Existing website</h1>}', 'src/lib/query.ts': 'export const existingQueryOwner = true;' },
    prompt: '$datocms-setup Plan the implementation for our existing Next.js website and existing DatoCMS project. We want website click-to-edit and the side-by-side DatoCMS preview panel, but no live updates. There is one frontend. We already fetch published content through src/lib/query.ts; we have no preview routes yet. Explain the necessary pieces in implementation order, what existing code you will extend, and which project-specific values you still need. Do not edit files or connect to any service yet.',
    rubric: ['Includes draft mode before Content Link and Web Previews', 'Extends existing query owner and preserves published-read behavior', 'Does not add realtime, bootstrap a new project, or impose unrelated CMA setup', 'Identifies unresolved route mapping, credentials and preview configuration without claiming readiness', 'No writes or external calls'],
  },
  {
    id: 'cli-inspection', area: 'cli', phase: 'screen',
    prompt: '$datocms-cli Give me commands only; do not execute them. Our linked CLI project uses pnpm and profile client_b. In environment editorial-qa, inspect the article model including validators, fieldsets and nested blocks, and generate types for article and author into src/cms/schema.ts. Then show how to inspect the API documentation for fetching one record and how to fetch record abc123 from that environment as a single CLI call. No config changes or login are needed.',
    rubric: ['Keeps pnpm execution style, client_b profile and editorial-qa environment', 'Uses schema:inspect and appropriate detail flags', 'Uses schema:generate output path and item-types filter', 'Distinguishes cma:docs items self from cma:call items find abc123, with positional syntax', 'Does not connect or ask for credentials'],
  },
  {
    id: 'cli-release-plan', area: 'cli', phase: 'screen',
    prompt: '$datocms-cli Write a concrete release checklist with commands, without running them. We use npm, profile customer_c and TypeScript migrations. The source is main and the new release environment must be autumn-release. Maintenance mode is approved, including restoring editor access after failure; interrupting active editors with force is not approved. The sandbox allowance and cost are already checked and approved. We want a dry run, migration into a fork, manual verification, then promotion only after review. Keep a recoverable prior environment and explain what to do if migration or verification fails.',
    rubric: ['Explicit profile, source and destination with dry-run then fork-and-run', 'No default force or primary in-place mutation', 'Manual verification separates migration from promotion', 'Failure prevents promotion and restores maintenance state/editor access', 'Preserves rollback environment; no unrequested destructive cleanup or repeated cost approval', 'No live commands'],
  },
  {
    id: 'content-link-card', area: 'frontend', phase: 'screen', fixture: 'react',
    files: { 'ProductCard.tsx': `export type Product = { title: string; category: string; price: number; _editingUrl: string; video: { url: string; alt: string }; author: { name: string }; };\nexport default function ProductCard({product}: {product: Product}) { return <article><h2>{product.title}</h2><p>{product.category}</p><span>{product.price}</span><video src={product.video.url}/><aside>{product.author.name}</aside></article>; }\n` },
    prompt: '$datocms-frontend-integrations Patch ProductCard.tsx for DatoCMS Content Link. Our shared draft query and root ContentLink controller already work. Product title, category, video.alt and author.name arrive stega-encoded; price is numeric and _editingUrl is the record edit URL. Make the article card area select the title; the author name and video must remain independently editable without stealing the card target. The price should select the record explicitly. Display category as plain text and add data-category equal to its clean lowercase value, so filtering works. Preserve the exported props and component API and all visible content. Do not add a second controller, fetch data or change packages.',
    rubric: ['Builds with installed React SDK', 'Real Content Link DOM stamping resolves card title, author and video independently', 'Numeric field uses the supplied edit URL', 'Category comparison value is clean and lowercase while visible content remains', 'No second controller or network activity'],
  },
  {
    id: 'content-link-nuxt', area: 'frontend', phase: 'screen',
    files: { 'package.json': JSON.stringify({ private: true, dependencies: { nuxt: '4.5.2', 'vue-datocms': '8.1.19' } }), 'nuxt.config.ts': 'export default defineNuxtConfig({})' },
    prompt: '$datocms-frontend-integrations Give us a Nuxt Content Link wrapper and explain its integration, without editing files. It will be mounted only in draft mode and must synchronize route changes with the DatoCMS Web Previews panel, including query strings. We also need a numeric inventory count to be editable, a video without visible caption to select its encoded alt field, and Structured Text blocks to remain independent from surrounding prose. Show the relevant small snippets and explain unmount cleanup. We have no Vercel overlays.',
    rubric: ['Nuxt router afterEach updates fullPath before next page DOM, rather than delayed Nuxt useRoute watcher', 'Disposes controller and unregisters router hook on unmount', 'Record edit URL for number and encoded source for video', 'Structured Text outer group and block/inline boundaries, without unnecessary record-link boundary', 'Keeps draft-only controller and describes query requirements'],
  },
  // The two *-reserved cases ran on 2026-09-19 and are no longer held out;
  // their ids stay so existing reports still match.
  {
    id: 'cli-reserved', area: 'cli', phase: 'regression',
    prompt: '$datocms-cli Explain the commands and TypeScript shapes; do not execute or connect. I need a one-off script to loop over existing article records in sandbox copy-review and print their IDs. It will run once from stdin with our linked OAuth session, not be committed. Later I may need a longer local file version, and separately a reviewed schema migration. Contrast these three execution forms, their imports, type checking and file placement. Do not create a token or scaffold migrations for the one-off content read.',
    rubric: ['Stdin uses ambient client and Schema/top-level await, no exported function/bootstrap client', 'Explains stdin typecheck versus file-mode opt-in checking and generated types', 'File mode default function receives Client from datocms/lib/cma-client-node', 'One-off scratch versus reviewed migrations, scaffold migration with CLI', 'Targets copy-review and handles pagination, respects existing OAuth'],
  },
  {
    id: 'content-link-reserved', area: 'frontend', phase: 'regression',
    prompt: '$datocms-frontend-integrations Review this plan without editing files: we share content between Astro with View Transitions and a SvelteKit site. A developer wants to pass currentPath and onNavigateTo to both ContentLink components, wrap every link inside Structured Text in a boundary, strip stega from the whole response before rendering, and use a single group around title, author and video caption. Identify which choices need changing, show framework-appropriate imports and navigation wiring, and describe a debugging method that exposes invisible metadata. Published queries still select _editingUrl; should baseEditingUrl disappear outside draft mode?',
    rubric: ['Astro handles navigation automatically with no unsupported router props; Svelte supplies route/navigation wiring', 'Does not strip whole rendered response; cleans logic/meta separately', 'Separates competing targets with grouping/boundaries; record links in Structured Text keep prose ownership', 'Uses valid per-framework imports and a metadata-revealing debugger', 'Keeps baseEditingUrl on published queries selecting _editingUrl, without exposing draft credentials'],
  },
];
