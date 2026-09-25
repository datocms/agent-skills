# SEO & Meta Tags Concepts

Shared concepts for DatoCMS SEO metadata rendering across all frameworks. For framework-specific rendering utilities and components, see the dedicated framework reference.

For missing SEO images or fallback precedence, see the CDA [computed SEO tag guidance](../../datocms-cda/references/seo-and-meta.md#_seometatags). Render the returned tags using the framework's existing helpers.

## GraphQL Query

```graphql
query {
  page: homepage {
    seo: _seoMetaTags {
      attributes
      content
      tag
    }
  }

  site: _site {
    favicon: faviconMetaTags {
      attributes
      content
      tag
    }
  }
}
```

## Tag Concatenation Pattern

Always concatenate page SEO tags with site favicon tags before rendering:

```js
const allMetaTags = [...data.page.seo, ...data.site.favicon];
```

This ensures both page-specific meta tags (title, description, OG tags) and site-wide favicon tags are rendered together.

## Tag Object Shape

Each tag in the `_seoMetaTags` and `faviconMetaTags` arrays has this shape:

```ts
{
  tag: string;        // "title", "meta", or "link"
  attributes: object | null; // HTML attributes (e.g., { property: "og:title", content: "..." })
  content: string | null;    // Inner content (only for "title" tags)
}
```

## Canonical URLs and Site URL

`_seoMetaTags` emits no canonical tag ([generated tags](../../datocms-cda/references/seo-and-meta.md#generated-tags-include)) — the app adds it.

- **One site URL owner.** Reuse the repo's existing `*_SITE_URL` / `SITE_URL` variable or Astro `site` config. None → add `SITE_URL`, the name the [Web Previews plugin install](web-previews-concepts.md#programmatic-install-default) reads; server-only reads (metadata, robots, sitemap) need no public prefix. Nuxt head renders on both sides → `runtimeConfig.public.siteUrl`, set by `NUXT_PUBLIC_SITE_URL` (pattern: [Nuxt Config Additions](nuxt.md#nuxt-config-additions)). No value → placeholder, `scaffolded`.
- **One helper** in the repo's Dato helper area: reads the owner, exposes `buildCanonicalUrl(pathname)` → `new URL(pathname, siteUrl).toString()`. Canonical tags, sitemap entries and the robots `Sitemap:` line all call it — no per-page string concatenation. Pathname from the route or the record's URL builder ([url-builders.md](url-builders.md)), locale prefix included.
- **Output** beside the DatoCMS tags:

| Framework | Read site URL | Canonical tag |
| - | - | - |
| Next.js | `process.env.SITE_URL` (server) | `generateMetadata` → `{ ...toNextMetadata(tags), alternates: { canonical } }` |
| Nuxt | `useRuntimeConfig().public.siteUrl` | `useHead({ link: [{ rel: 'canonical', href: canonical }] })` beside `useHead(toHead(...))` |
| SvelteKit | `env.SITE_URL` from `$env/dynamic/private` in `+page.server.ts` | `<svelte:head><link rel="canonical" href={data.canonical} /></svelte:head>` |
| Astro | `Astro.site`, else a `SITE_URL` field in `env.schema` (`context: 'server', access: 'public'`) via `astro:env/server` | `<link rel="canonical" href={canonical} />` in `<head>` beside `<Seo />` |
