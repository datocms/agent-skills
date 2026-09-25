# Video Player Concepts

Shared concepts for DatoCMS/Mux video player components across all frameworks. For framework-specific component APIs and props, see the dedicated framework reference.

## GraphQL Query

```graphql
query {
  blogPost {
    cover {
      video {
        muxPlaybackId
        title
        width
        height
        blurUpThumb
        alt
      }
    }
  }
}
```

## Video Object Fields

| Field | Type | Required | Description |
| - | - | - | - |
| `muxPlaybackId` | string | Yes | Identifies the video to stream from Mux CDN |
| `title` | string | No | Displayed in the player overlay |
| `width` | integer | No | Video width (used with `height` for `aspectRatio` style) |
| `height` | integer | No | Video height (used with `width` for `aspectRatio` style) |
| `blurUpThumb` | string | No | Base64-encoded blurred placeholder |
| `alt` | string | No | Alt text (also enables Content Link overlays) |

## Privacy Defaults

All DatoCMS video player components override upstream Mux player defaults to be privacy-first:

| Setting | DatoCMS Default | Mux Default |
| - | - | - |
| Cookies | Disabled | Enabled |
| Tracking/Analytics | Disabled | Enabled |
| Preload | `"metadata"` | Varies |
| Aspect ratio | Auto-set from `width`/`height` | None |

## Mux Data Analytics (Opt-in)

Video playback analytics are **disabled by default**. To enable:

1. Create a [Mux Data](https://www.mux.com/data) account (free)
2. Pass the analytics env key prop to the component (`envKey` for React/Svelte, `env-key` for Vue)

## Peer Dependencies

| Framework | Player package |
| - | - |
| React | `@mux/mux-player-react` |
| Vue | `@mux/mux-player` (web component) |
| Svelte | `@mux/mux-player` (web component) |
| Astro (no React integration) | `@mux/mux-player` (web component, used directly) |

## Astro without React integration

`@datocms/astro` has no video component. Install `@mux/mux-player`, import it in a `<script>` in the `.astro` component (Astro bundles it as a client module; empty in SSR). Set the privacy defaults by hand — raw Mux defaults keep cookies and tracking on:

```astro
<mux-player
  playback-id={video.muxPlaybackId}
  stream-type="on-demand"
  disable-cookies
  disable-tracking
  preload="metadata"
  style={video.width && video.height ? `aspect-ratio: ${video.width} / ${video.height}` : undefined}
  placeholder={video.blurUpThumb}
  title={video.title}
></mux-player>

<script>
  import '@mux/mux-player';
</script>
```

Mux Data: add `env-key` only when user opts in.
