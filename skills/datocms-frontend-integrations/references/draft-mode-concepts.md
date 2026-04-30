# Draft Mode Concepts

This reference covers core concepts that apply to all frameworks when implementing draft mode for DatoCMS.

## Contents

- [Overview](#overview)
- [Token Validation Pattern](#token-validation-pattern)
- [Open Redirect Prevention](#open-redirect-prevention)
- [Cookie Attributes for Iframe Support](#cookie-attributes-for-iframe-support)
- [Query Function Modification](#query-function-modification)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)
- [JWT-Based Draft Mode (Nuxt, SvelteKit, Astro)](#jwt-based-draft-mode-nuxt-sveltekit-astro)

---

## Overview

Draft mode allows content editors to preview unpublished content on the frontend before publishing it. The implementation uses a **two-token architecture**:

- **Published Content CDA Token** — Used for production queries, returns only published content
- **Draft Content CDA Token** — Used in draft mode, returns draft (unpublished) content alongside published content

When an editor enables draft mode, the frontend:

1. Receives a request at the **enable endpoint** with a secret token
2. Sets a **draft mode cookie** (framework-specific mechanism)
3. Redirects to the content page
4. The page's query function detects draft mode and switches to the draft token with `includeDrafts: true`

---

## Token Validation Pattern

The enable endpoint must validate that requests come from a trusted source by checking a shared secret:

```ts
// Parse query string parameters
const token = request.searchParams.get('token');

// Ensure that the request is coming from a trusted source
if (token !== SECRET_API_TOKEN) {
  // Return 401 unauthorized
}
```

The `SECRET_API_TOKEN` is a random string that you configure in your environment variables. It is **not** a DatoCMS API token — it's a shared secret between your app and DatoCMS.

**Important:** The disable endpoint does NOT require token validation. It simply removes the draft cookie and redirects. This is safe because the disable endpoint only reduces access (from draft to published).

---

## Open Redirect Prevention

Both enable and disable endpoints accept a redirect URL parameter. To prevent open redirect vulnerabilities (where an attacker could redirect users to a malicious site), validate that the URL is relative:

```ts
function isRelativeUrl(path: string): boolean {
  try {
    // Try to create a URL object — if it succeeds without a base, it's absolute
    new URL(path);
    return false;
  } catch {
    try {
      // Verify it can be parsed as a relative URL by providing a base
      new URL(path, 'http://example.com');
      return true;
    } catch {
      // If both attempts fail, it's not a valid URL at all
      return false;
    }
  }
}
```

Use it in every endpoint that redirects:

```ts
const redirectUrl = request.searchParams.get('redirect') || '/';

if (!isRelativeUrl(redirectUrl)) {
  // Return 422 - "URL must be relative!"
}
```

---

## Cookie Attributes for Iframe Support

DatoCMS can load your site inside an iframe (e.g., via the "Web Previews" plugin). Setting a cookie inside an iframe is considered a third-party cookie. Modern browsers require specific attributes for third-party cookies to work:

- **`partitioned: true`** — Required for CHIPS (Cookies Having Independent Partitioned State). Creates a separate cookie jar partitioned by the top-level site.
- **`sameSite: 'none'`** — Required because the cookie is set in a cross-site context (your site inside DatoCMS's iframe).
- **`secure: true`** — Required whenever `sameSite` is `'none'`.

These three attributes must be set on every cookie operation (set, delete) related to draft mode.

### Next.js Special Case

Next.js has a built-in `draftMode()` API that sets a `__prerender_bypass` cookie. However, it does NOT set the `partitioned` attribute. You must rewrite this cookie after calling `draft.enable()` or `draft.disable()`:

```ts
async function makeDraftModeWorkWithinIframes() {
  const cookie = (await cookies()).get('__prerender_bypass')!;

  (await cookies()).set({
    name: '__prerender_bypass',
    value: cookie?.value,
    httpOnly: true,
    path: '/',
    secure: true,
    sameSite: 'none',
    partitioned: true,
  });
}
```

### Other Frameworks (Nuxt, SvelteKit, Astro)

These frameworks use a custom cookie with a JWT token. The cookie attributes are set directly when creating/deleting the cookie.

---

## Query Function Modification

The existing `executeQuery` wrapper (or a new one if none exists) must be modified to support draft mode:

1. **Accept an `includeDrafts` option**
2. **Switch tokens** based on `includeDrafts`:
   - `true` → use the Draft Content CDA Token
   - `false`/`undefined` → use the Published Content CDA Token
3. **Always set `excludeInvalid: true`**

Pattern:

```ts
const result = await executeQuery(query, {
  variables: options?.variables,
  excludeInvalid: true,
  includeDrafts: options?.includeDrafts,
  token: options?.includeDrafts
    ? DRAFT_CDA_TOKEN
    : PUBLISHED_CDA_TOKEN,
});
```

---

## Error Handling

All endpoints should catch unexpected errors using a shared `handleUnexpectedError` utility:

```ts
import { serializeError } from 'serialize-error';

function handleUnexpectedError(error: unknown) {
  try {
    throw error;
  } catch (e) {
    console.error(e);
  }

  // Return 500 with serializeError(error)
}
```

This pattern:

1. Logs the error
2. Serializes the error into a response-safe shape with `serialize-error`

Required packages: `serialize-error`.

If a companion feature later adds direct DatoCMS client calls, you can extend this helper to surface structured request/response details there without making the base draft mode flow depend on the CMA client.

---

## Environment Variables

All frameworks need these core environment variables (names vary by framework):

| Variable | Description | Where to find it |
| - | - | - |
| Published Content CDA Token | Read-only token for published content | DatoCMS → Settings → API tokens → Create with "Published" access |
| Draft Content CDA Token | Read-only token for draft content | DatoCMS → Settings → API tokens → Create with "Include drafts" checked |
| Secret API Token | Shared secret for endpoint authentication | Generate with `openssl rand -hex 32` |
| Signed Cookie JWT Secret | Secret for signing the draft mode JWT cookie (non-Next.js only) | Generate with `openssl rand -hex 32` |
| Draft Mode Cookie Name | Name of the draft mode cookie (non-Next.js only) | Choose any name, e.g., `datocms-draft-mode` |

Next.js does NOT need the JWT secret or cookie name variables because it uses the built-in `draftMode()` API with the `__prerender_bypass` cookie.

---

## JWT-Based Draft Mode (Nuxt, SvelteKit, Astro)

For frameworks without a built-in draft mode mechanism, the pattern uses a JWT-signed cookie:

### Enable

1. Sign a JWT containing draft mode state (e.g., `{ enabled: true }` or `{ datocmsDraftContentCdaToken: '...' }`)
2. Set the JWT as a cookie with the CHIPS-compatible attributes

### Disable

1. Delete the cookie (using the same attributes)

### Check

1. Read the cookie
2. Verify the JWT signature
3. Return the payload's `enabled` state (or falsy if missing/invalid)

The JWT secret must be a strong random string stored in an environment variable.

**Nuxt difference:** The Nuxt starter kit stores the actual draft CDA token inside the JWT payload (`{ datocmsDraftContentCdaToken: '...' }`), so the client can decode it and use it for real-time subscriptions. SvelteKit and Astro use a simpler `{ enabled: true }` payload and keep the token server-side only.
