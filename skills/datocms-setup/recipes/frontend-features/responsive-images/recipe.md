_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `responsive-images` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Responsive Images Setup

You are an expert at wiring DatoCMS responsive images into existing frontend projects. This recipe creates or patches one shared Dato image wrapper, normalizes `responsiveImage(...)` query shapes, and patches a real usage site when the repo already exposes an image field.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework** — detect Next.js, Nuxt, SvelteKit, or Astro
2. **UI package** — inspect `package.json` for `react-datocms`, `vue-datocms`, `@datocms/svelte`, and `@datocms/astro`
3. **Existing Dato query utility** — inspect the shared query wrapper and Dato helper folder
4. **Existing image usage** — search for `responsiveImage`, `coverImage`, `heroImage`, `seoImage`, and current wrapper components
5. **File layout** — detect `src/` vs non-`src/`, plus any existing `lib/datocms`, `components/datocms`, or similar shared area
6. **Typed query context** — preserve gql.tada or GraphQL Code Generator usage if the repo already has it

### Stop conditions

- If the framework cannot be determined, ask the user which supported stack they are using.
- If the repo already has a materially different image abstraction, patch it in place by default instead of replacing it wholesale.

---

## Step 2: Ask Questions

Infer first from the repo.

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

If you do ask, make it one concise question, put the recommended/default path first, and explain whether skipping it will leave placeholders, ownership, or project-specific values unresolved.

Only ask if the repo exposes multiple competing image abstractions and it is unclear which one owns the rendered output.

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cda/references/client-and-config.md`
- `../../../../datocms-cda/references/images-and-videos.md`

Then load the matching framework references:

| Framework | Reference |
| - | - |
| Next.js / React | `../../../../datocms-frontend-integrations/references/react-image.md` |
| Nuxt / Vue | `../../../../datocms-frontend-integrations/references/vue-image.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-image.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro-image.md` |

If the repo has no shared Dato query utility yet, also inspect the matching framework guidance used by the CDA client baseline:

| Framework | Reference |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro | `../../../../datocms-frontend-integrations/references/astro.md` |

---

## Step 4: Generate Code

Generate the smallest reusable responsive-image setup that fits the repo.

### Required project changes

1. **Install the framework package if missing**
   - React / Next.js -> `react-datocms`
   - Vue / Nuxt -> `vue-datocms`
   - SvelteKit -> `@datocms/svelte`
   - Astro -> `@datocms/astro`
2. **Create or patch the shared Dato query utility**
   - If one already exists, patch it in place
   - If none exists, create the same thin published-content CDA baseline used by the setup bundle's CDA client setup
3. **Create one shared Dato image wrapper**
   - Reuse the repo's existing Dato helper area
   - If none exists, place it under the Dato lib folder:
     - with `src/`: `src/lib/datocms/DatoImage.*`
     - without `src/`: `lib/datocms/DatoImage.*`
     - Nuxt may also use `components/datocms/DatoImage.vue` when that better matches the repo's structure
4. **Patch one obvious query or component usage**
   - Prefer an existing hero, cover, card, or SEO image field that is already rendered on the site
   - If no safe target exists, create only the shared wrapper and report `scaffolded`

### Wrapper defaults

- **React / Next.js:** default to `<SRCImage />`; support an opt-in path to `<Image />` only for transparency, crossfade, or custom intersection tuning
- **Vue / Nuxt:** default to `<NakedImage>`; support an opt-in path to `<Image>`
- **SvelteKit:** default to `<NakedImage />`; support an opt-in path to `<Image />`
- **Astro:** wrap the native `@datocms/astro/Image` component only

### Required query shape

Patch real image fields toward this shape:

```graphql
responsiveImage(imgixParams: { auto: format }) {
  src
  width
  height
  alt
  title
  base64
}
```

Add `sizes` only when the rendered component needs it. Prefer omitting `srcSet` unless the project clearly needs explicit CDN-generated variants.

### Mandatory rules

- Always use `responsiveImage(imgixParams: { auto: format })`
- Never request both `base64` and `bgColor`
- Prefer omitting `srcSet` unless the repo clearly needs it
- Preserve framework-specific prop casing:
  - React -> `pictureClassName`, `imgClassName`
  - Vue -> `picture-class`, `img-class`, `src-set-candidates`
  - Svelte / Astro -> `pictureClass`, `imgClass`, `srcSetCandidates`
- Astro imports must use `@datocms/astro/Image`, never `@datocms/astro`
- Patch existing query ownership in place instead of adding a parallel query path

### Output status

- Report `scaffolded` if only the wrapper was created, if no real image field was patched, or if the query shape still contains placeholders
- Report `production-ready` only when a concrete Dato image field renders through the shared wrapper with no unresolved responsive-image TODOs

---

## Step 5: Next Steps

After generating the files, tell the user:

1. Which image field was patched, if any
2. Which wrapper component was created and where
3. Whether the repo is still `scaffolded` because a real field integration was not safe to patch automatically
4. Whether a thin shared CDA query utility had to be created as part of the setup

---

## Verification Checklist

Before presenting the result, verify:

1. The framework-appropriate Dato image package is installed or added
2. The repo has a shared Dato query utility after the change
3. The shared image wrapper matches the framework defaults
4. The patched query uses `responsiveImage(imgixParams: { auto: format })`
5. The query does not request both `base64` and `bgColor`
6. Astro uses only `@datocms/astro/Image` subpath imports
7. The result is `scaffolded` if no real image field could be integrated
