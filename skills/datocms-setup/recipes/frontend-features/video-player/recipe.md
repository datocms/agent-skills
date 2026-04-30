_Internal recipe for `datocms-setup`. Use this file only after the parent skill selects the `video-player` recipe and queues any prerequisites from `../../../references/recipe-manifest.json`._

# DatoCMS Video Player Setup

You are an expert at wiring DatoCMS streaming video into existing frontend projects. This recipe creates one shared `DatoVideoPlayer` wrapper, normalizes the Dato video query shape, and patches a real usage site when the repo already exposes a video field.

See `../../../patterns/OUTPUT_STATUS.md` for output status definitions.

Follow these steps in order. Do not skip steps.

---

## Step 1: Detect Context (silent)

Silently examine the project:

Follow the shared repo inspection conventions in `../../../references/repo-conventions.md`, then inspect the recipe-specific signals below.

1. **Framework** — detect Next.js, Nuxt, SvelteKit, or Astro
2. **UI package** — inspect `package.json` for `react-datocms`, `vue-datocms`, `@datocms/svelte`, `@datocms/astro`, and any Astro React integration
3. **Existing Dato query utility** — inspect the shared query wrapper and Dato helper folder
4. **Existing video usage** — search for `muxPlaybackId`, `blurUpThumb`, `VideoPlayer`, `mux-player`, `video {`, and likely content models such as hero videos or media blocks
5. **Content Link state** — detect whether stega / Content Link is already set up so query fields like `alt` are preserved when needed
6. **File layout** — detect `src/` vs non-`src/` and the repo's current Dato component area

### Stop conditions

- If the framework cannot be determined, ask the user which supported stack they are using.
- If the repo already has a materially different video abstraction, patch it in place by default instead of replacing it wholesale.
- If the project is Astro without React integration and relies only on `@datocms/astro`, stop with an explicit explanation that there is no native `@datocms/astro` video player component in v1.

---

## Step 2: Ask Questions

Infer first from the repo.

Follow the zero-question default and question-format rules in `../../../patterns/MANDATORY_RULES.md`.

If you do ask, make it one concise question, put the recommended/default path first, and explain whether skipping it will leave placeholders, ownership, or project-specific values unresolved.

Only ask if an Astro project appears to have partial React integration and it is unclear whether reusing that path is safe.

---

## Step 3: Load References

Read only these references:

- `../../../../datocms-cda/references/client-and-config.md`
- `../../../../datocms-cda/references/images-and-videos.md`

Then load the matching supported video reference:

| Framework | Reference |
| - | - |
| Next.js / React | `../../../../datocms-frontend-integrations/references/react-video-player.md` |
| Nuxt / Vue | `../../../../datocms-frontend-integrations/references/vue-video-player.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-video-player.md` |

If Content Link is already configured, also load the matching Content Link reference:

| Framework | Reference |
| - | - |
| Next.js / React | `../../../../datocms-frontend-integrations/references/react-content-link.md` |
| Nuxt / Vue | `../../../../datocms-frontend-integrations/references/vue-content-link.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/svelte-content-link.md` |
| Astro with React integration | `../../../../datocms-frontend-integrations/references/react-content-link.md` |

If the repo has no shared Dato query utility yet, also inspect the matching framework guidance used by the CDA client baseline:

| Framework | Reference |
| - | - |
| Next.js | `../../../../datocms-frontend-integrations/references/nextjs.md` |
| Nuxt | `../../../../datocms-frontend-integrations/references/nuxt.md` |
| SvelteKit | `../../../../datocms-frontend-integrations/references/sveltekit.md` |
| Astro with React integration | `../../../../datocms-frontend-integrations/references/astro.md` |

---

## Step 4: Generate Code

Generate the smallest reusable Dato video-player setup that fits the repo.

### Supported stacks

- Next.js / plain React via `react-datocms`
- Nuxt / plain Vue via `vue-datocms`
- SvelteKit via `@datocms/svelte`
- Astro only when the repo already uses React integration and the video path clearly belongs to `react-datocms`

### Required project changes

1. **Install the framework package if missing**
   - React -> `react-datocms`
   - Vue -> `vue-datocms`
   - SvelteKit -> `@datocms/svelte`
2. **Install the correct Mux peer dependency**
   - React -> `@mux/mux-player-react`
   - Vue / SvelteKit -> `@mux/mux-player`
3. **Create or patch the shared Dato query utility**
   - If one already exists, patch it in place
   - If none exists, create the same thin published-content CDA baseline used by the setup bundle's CDA client setup
4. **Create one shared `DatoVideoPlayer` wrapper**
   - Reuse the repo's existing Dato helper area
   - If none exists, place it under the Dato lib folder:
     - with `src/`: `src/lib/datocms/DatoVideoPlayer.*`
     - without `src/`: `lib/datocms/DatoVideoPlayer.*`
5. **Patch one obvious usage site**
   - Prefer an existing hero video, media block, or content page that already reads a Dato video field
   - If no safe target exists, create only the shared wrapper and report `scaffolded`

### Required query shape

Patch real video fields toward this shape:

```graphql
video {
  muxPlaybackId
  title
  width
  height
  blurUpThumb
  alt
}
```

### Wrapper defaults

Preserve the library's privacy-first defaults:

- `disableCookies: true`
- `disableTracking: true` where the selected component supports it
- `preload="metadata"`
- `style.aspectRatio` derived from `width` and `height` when both are present

### Mandatory rules

- Use the correct Mux package for the selected framework
- Never claim native `@datocms/astro` video-player support in v1
- Preserve `alt` in the query when Content Link is already configured
- Patch existing query ownership in place instead of adding a parallel query path
- Do not mark the result `production-ready` without a real video field wired through the shared wrapper

### Output status

- Report `scaffolded` if only the wrapper was created, if no real video field was patched, or if required peer dependencies / supported integration remain unresolved
- Report `production-ready` only when a supported stack has at least one real Dato video field wired through the shared wrapper with no unresolved TODOs

---

## Step 5: Next Steps

After generating the files, tell the user:

1. Which video field was patched, if any
2. Which shared wrapper component was created and where
3. Whether Content Link forced the query to keep `alt`
4. Whether the repo remains `scaffolded` because no safe video integration target was found or a supported runtime path is still missing

---

## Verification Checklist

Before presenting the result, verify:

1. The framework-appropriate Dato video package is installed or added
2. The correct Mux peer dependency is installed or added
3. The repo has a shared Dato query utility after the change
4. The patched video query includes `muxPlaybackId`, `title`, `width`, `height`, `blurUpThumb`, and `alt`
5. The shared wrapper preserves privacy-first defaults and `preload="metadata"`
6. Unsupported native-Astro-only projects stop with a clear explanation
7. The result is `scaffolded` if no real video field could be integrated
