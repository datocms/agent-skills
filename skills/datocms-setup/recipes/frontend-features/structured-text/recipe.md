_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `structured-text` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Structured Text Setup

You are an expert at rendering DatoCMS Structured Text in existing frontend projects. This recipe creates one shared `DatoStructuredText` renderer, patches query shapes toward the full DAST payload when needed, and integrates Content Link boundaries when visual editing is already configured.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework** — detect Next.js, Nuxt, SvelteKit, or Astro
2. **UI package** — inspect `package.json` for `react-datocms`, `vue-datocms`, `@datocms/svelte`, and `@datocms/astro`
3. **Existing Dato query utility** — inspect the shared query wrapper and Dato helper folder
4. **Existing Structured Text usage** — search for `StructuredText`, `.value`, `inlineBlocks`, `renderBlock`, `blockComponents`, and current DAST helpers
5. **Existing custom block or link components** — reuse them where practical
6. **Content Link state** — detect whether stega / Content Link is already set up so boundaries and groups can be added correctly
7. **Typed query context** — preserve gql.tada or GraphQL Code Generator usage if present

### Stop conditions

- If the framework cannot be determined, ask the user which supported stack they are using.
- If the repo already has a materially different Structured Text abstraction, patch it in place by default instead of replacing it wholesale.

---

## Step 2: Ask Questions

Infer first from the repo.

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

If you do ask, make it one concise question, put the recommended/default path first, and explain whether skipping it will leave placeholders, ownership, or project-specific values unresolved.

Only ask if the repo exposes multiple incompatible Structured Text renderers and it is genuinely unclear which one owns production rendering.

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cda/references/client-and-config.md`
- `../../../../datocms-cda/references/structured-text.md`

Then load the matching framework reference:

| Framework | Reference |
| - | - |
| Next.js / React | `../../../../datocms-frontend-integrations/references/react-structured-text.md` |
| Nuxt / Vue | `../../../../datocms-frontend-integrations/references/vue-structured-text.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-structured-text.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro-structured-text.md` |

If Content Link is already configured, also load the matching Content Link reference:

| Framework | Reference |
| - | - |
| Next.js / React | `../../../../datocms-frontend-integrations/references/react-content-link.md` |
| Nuxt / Vue | `../../../../datocms-frontend-integrations/references/vue-content-link.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-content-link.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro-content-link.md` |

If the repo has no shared Dato query utility yet, also inspect the matching framework guidance used by the CDA client baseline:

| Framework | Reference |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

---

## Step 4: Generate Code

Generate one reusable Structured Text renderer that matches the framework.

### Required project changes

1. **Install the framework package if missing**
   - React / Next.js -> `react-datocms`
   - Vue / Nuxt -> `vue-datocms`
   - SvelteKit -> `@datocms/svelte`
   - Astro -> `@datocms/astro`
2. **Install DAST helper packages only when required by the generated pattern**
   - Svelte predicate-component setups require `datocms-structured-text-utils`
   - Add other DAST helper packages only if the generated renderer actually uses them
3. **Create or patch the shared Dato query utility**
   - If one already exists, patch it in place
   - If none exists, create the same thin published-content CDA baseline used by the setup bundle's CDA client setup
4. **Create one shared `DatoStructuredText` renderer**
   - Reuse the repo's existing Dato helper area
   - If none exists, place it under the Dato lib folder:
     - with `src/`: `src/lib/datocms/DatoStructuredText.*`
     - without `src/`: `lib/datocms/DatoStructuredText.*`
5. **Add any required sidecar renderer files**
   - React -> keep render callbacks in the wrapper or colocated helpers
   - Vue -> keep `h()` renderers in the wrapper or small composable sidecars
   - Svelte -> create predicate/component sidecars
   - Astro -> create `__typename`-keyed `.astro` sidecars
6. **Patch one obvious Structured Text usage**
   - Prefer an existing page body, article body, or content section already in production flow
   - If no safe target exists, create only the shared renderer and report `scaffolded`

### Required query shape

When the field is more than simple `value`-only content, patch it toward this shape:

```graphql
content {
  value
  links {
    ... on RecordInterface {
      id
      __typename
    }
  }
  blocks {
    ... on RecordInterface {
      id
      __typename
    }
  }
  inlineBlocks {
    ... on RecordInterface {
      id
      __typename
    }
  }
}
```

Extend the concrete fragments only for the record types the patched page already uses.

### Framework renderer rules

- **React / Next.js:** use `renderBlock`, `renderInlineRecord`, `renderLinkToRecord`, and `renderInlineBlock`
- **Vue / Nuxt:** use the same rendering categories via `h()` callbacks
- **SvelteKit:** use predicate-component tuples and sidecar `.svelte` files
- **Astro:** use `blockComponents`, `inlineBlockComponents`, `inlineRecordComponents`, and `linkToRecordComponents` keyed by `__typename`

### Content Link rules

If Content Link is already configured:

- Wrap the main `<StructuredText>` renderer in `data-datocms-content-link-group`
- Add `data-datocms-content-link-boundary` to block, inline block, and inline record render targets
- Do not add boundaries to record-link renderers

### Mandatory rules

- Support `value`, `links`, `blocks`, and `inlineBlocks` by default in the reusable renderer
- Always require `id` and `__typename` on linked records, blocks, and inline blocks
- Reuse existing custom block components when they are already present instead of creating duplicates
- Patch existing query ownership in place instead of adding a second query path
- Do not mark the result `production-ready` while any discovered record type is handled by a placeholder switch case or TODO component

### Output status

- Report `scaffolded` if only the reusable renderer was created, if no real field was patched, or if any record-type mapping still contains placeholders
- Report `production-ready` only when a concrete Structured Text field renders through the shared wrapper and every discovered record type in the patched query has concrete handling

---

## Step 5: Next Steps

After generating the files, tell the user:

1. Which Structured Text field was patched, if any
2. Which shared renderer and sidecar files were created
3. Whether Content Link boundaries were added
4. Whether the repo is still `scaffolded` because concrete record mappings or a live field integration remain unresolved

---

## Verification Checklist

Before presenting the result, verify:

1. The framework-appropriate Dato Structured Text package is installed or added
2. The repo has a shared Dato query utility after the change
3. The shared renderer supports `value`, `links`, `blocks`, and `inlineBlocks`
4. The patched query includes `id` and `__typename` on every linked record, block, and inline block
5. The framework-specific rendering model matches the chosen stack
6. Content Link groups and boundaries were added correctly when that feature is already configured
7. The result is `scaffolded` if no real Structured Text field could be patched or any discovered record type still has placeholder handling
