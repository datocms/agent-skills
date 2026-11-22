## Props

### FeedbackDot

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `tone` | `'success' \| 'warning' \| 'danger' \| 'neutral'` | Yes | | The state that the dot shows. "success" is green, "warning" is amber, "danger" is red and "neutral" is grey. |
| `ariaLabel` | `TextMessage` | No | | The state in words, for the screen readers. Give it when the dot is the only sign of the state (no text near it says the state). Without it, the screen readers do not read the dot. |

### ItemValidityTriangles

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `publishedValid` | `boolean \| null \| undefined` | No | | Is the published version valid? Only `false` shows a triangle. |
| `currentValid` | `boolean \| null \| undefined` | No | | Is the current version valid? Only `false` shows a triangle. |
| `draftModeActive` | `boolean \| null \| undefined` | Yes | | True when the model has a draft mode. Without it, the current version is the published version, so the current triangle does not show. |

### VersionValidityTriangle

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `isVersionValid` | `boolean \| null \| undefined` | Yes | | Is the version valid? Only `false` shows a triangle. |
| `isPublished` | `boolean` | Yes | | True for the published version: the triangle is solid |
