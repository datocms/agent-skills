## Props

### UploadCard with upload

The other props are the props of a [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md).

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | | The card is in a disabled field: it gets the surface of a disabled field. |
| `draggable` | `boolean` | No | | The user can drag the card: it gets the move cursor and a hover border. The drag logic is outside the card. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user clicks the media or the caption. |
| `options` | `MediaCardOption[]` | No | | The options of the ⋮ menu at the top right of the card. For example "Details", "Move to collection" (a submenu) and a red "Delete". |
| `to` (variant) | `string` | No | | The page that the card opens. The media is a link, so the user can open the page in a new tab. |
| `dragging` | `boolean` | No | | The card is the one that the user drags: it fades. |
| `compact` | `boolean` | No | | A small card, for example in a gallery with many items. The actions on the media are in a column. |
| `actions` | `MediaCardAction[]` | No | | The buttons on the media. They show when the pointer is on the card. A touch screen shows them in the ⋮ menu. A disabled action is removed. |
| `selection` | `MediaCardSelection & { checkbox: 'hover' \| 'always'; } \| MediaCardSelection & { checkbox?: never }` | No | | |
| `upload` | `string \| UploadPreviewUpload \| null` | Yes | | The asset as `ctx` gives it, or its ID. An ID loads through the provider of the host: `Canvas` mounts it. `null` is an asset that does not exist: the preview shows a blank file icon. |
| `preferredLocale` | `string` | No | | The locale of the default metadata of the asset, for the caption, for example the locale of the field. When it has no value, the caption uses the main locale of the project, which the provider of the host gives. |
| `fieldValue` | `UploadFieldValue` | No | | The value of the field that holds the asset. Its title and alternate text come before the default metadata of the asset, and its `poster_time` gives the frame of a video. |
| `caption` | `MediaCardCaption \| null` | No | | The text below the preview. Without it, the card computes it with `uploadCardCaption`. `null` shows no caption. |
| `box` | `BoxSize` | No | | The size of the preview, in px. Without it, the CSS gives the size. |
| `padding` | `UploadPreviewPadding` | No | | The space around the asset in the preview, as in `UploadPreview`. |
| `link` | `{ href: string; target?: string }` | No | | The preview is a link. |

### UploadCard, preview mode

The other props are the props of a [`MediaCard`](https://react-ui.datocms.com/Lists/MediaCard.md).

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `disabled` | `boolean` | No | | The card is in a disabled field: it gets the surface of a disabled field. |
| `draggable` | `boolean` | No | | The user can drag the card: it gets the move cursor and a hover border. The drag logic is outside the card. |
| `onClick` (variant) | `(e: React.MouseEvent) => void` | No | | Runs when the user clicks the media or the caption. |
| `options` | `MediaCardOption[]` | No | | The options of the ⋮ menu at the top right of the card. For example "Details", "Move to collection" (a submenu) and a red "Delete". |
| `to` (variant) | `string` | No | | The page that the card opens. The media is a link, so the user can open the page in a new tab. |
| `dragging` | `boolean` | No | | The card is the one that the user drags: it fades. |
| `compact` | `boolean` | No | | A small card, for example in a gallery with many items. The actions on the media are in a column. |
| `actions` | `MediaCardAction[]` | No | | The buttons on the media. They show when the pointer is on the card. A touch screen shows them in the ⋮ menu. A disabled action is removed. |
| `selection` | `MediaCardSelection & { checkbox: 'hover' \| 'always'; } \| MediaCardSelection & { checkbox?: never }` | No | | |
| `children` | `ReactNode` | Yes | | The preview of the asset, an `UploadPreview` |
| `caption` | `MediaCardCaption` | No | | The text below the preview. Use `uploadCaption` to get it from the metadata of the asset. |
| `progress` | `UploadCardProgress` | No | | The asset uploads. The caption shows in the subtle ink. Without a caption, the caption shows the percent or the analysis. |
| `threatDetected` | `boolean` | No | | The antivirus found a threat in the file: the card shows a badge. |

#### Types

`UploadCardProgress` — The upload of the asset, while it is in progress

```ts
export type UploadCardProgress = {
  /**
   * The uploaded part, from 0 to 100. At 100 the server analyses the
   * asset.
   */
  percent: number;
  /**
   * Cancels the upload. With it, the caption shows a cancel button while
   * the transfer is in progress. A card with a checkbox has no cancel
   * button.
   */
  onCancel?: (event: React.MouseEvent) => void;
};
```

### UploadCardProgress

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `percent` | `number` | Yes | | The uploaded part, from 0 to 100. At 100 the server analyses the asset. |
| `onCancel` | `(event: React.MouseEvent) => void` | No | | Cancels the upload. With it, the caption shows a cancel button while the transfer is in progress. A card with a checkbox has no cancel button. |

### uploadCaption

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `title` | `string \| null` | No | | The title of the asset in the record |
| `alt` | `string \| null` | No | | The alternate text of the asset in the record |
| `defaultTitle` | `string \| null` | No | | The default title of the asset, in the media area |
| `defaultAlt` | `string \| null` | No | | The default alternate text of the asset, in the media area |
| `filename` | `string \| null` | No | | The name of the file. Give it only when it is the best name (audio). |
