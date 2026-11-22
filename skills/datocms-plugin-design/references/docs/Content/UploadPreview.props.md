## Props

### UploadPreview with upload

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `upload` | `string \| UploadPreviewUpload \| null` | Yes | | The asset as `ctx` gives it, or its ID. An ID loads through the provider of the host: `Canvas` mounts it. While the asset loads, the box is empty. An asset that does not exist, or `null`, shows a blank file icon. |
| `box` | `BoxSize` | No | | The size of the box in px. The box gets this size. Without it, the CSS of the parent gives the size of the box, and the preview measures it. |
| `padding` | `UploadPreviewPadding` | No | `[10, 10]` | The space (vertical, horizontal) in px between the box and the asset. An icon always gets space: with `[0, 0]`, an icon gets `[10, 10]`. |
| `transparent` | `boolean` | No | | The box has no background, so it shows the background of the parent. |
| `link` | `{ href: string; target?: string }` | No | | The box is a link. |
| `fieldValue` | `UploadFieldValue` | No | | The value of the field that holds the asset, as in `UploadCard`. The preview reads its `poster_time`, the frame of a video. When it is not set, the frame is the default of the asset. |
| `children` | `ReactNode` | No | | More content in the box, over the asset |

### UploadPreview, box mode

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `box` | `BoxSize \| null` | Yes | | The size of the box in px, for the fit of the asset. A live host measures the box. A static host gives a constant. `null` says that the size is not known yet: `UploadPreview.Image` then renders nothing. |
| `fixedSize` | `boolean` | No | | The box gets the size of `box` as an inline style. Without it, the CSS of the parent gives the size of the box. |
| `padding` | `UploadPreviewPadding` | No | `[10, 10]` | The space (vertical, horizontal) in px between the box and the asset. An icon always gets space: with `[0, 0]`, an icon gets `[10, 10]`. |
| `transparent` | `boolean` | No | | The box has no background, so it shows the background of the parent. |
| `link` | `{ href: string; target?: string }` | No | | The box is a link to the file. |
| `children` | `ReactNode` | No | | The asset: an `UploadPreview.Image`, an icon or a player. |

### UploadPreview\.Image

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `src` | `string \| undefined` | Yes | | The URL of the image |
| `width` | `number` | Yes | | The real width of the asset, in px |
| `height` | `number` | Yes | | The real height of the asset, in px |
| `upscale` | `boolean` | No | | The image can become larger than its real size, to fill the box. Give it only for a vector image (SVG). |
| `loading` | `'lazy' \| 'eager'` | No | | The `loading` attribute of the image. Without it the browser loads the image at once. |
| `icon` | `boolean` | No | | The image shows instead of an icon (for example the poster of a video), so it always gets space around it, even when the `UploadPreview` has zero padding. |
| `alt` | `TextMessage` | No | `""` | |

### UploadPreview\.Progress

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `percent` | `number` | Yes | | The uploaded part, from 0 to 100. At 0 (the transfer did not start) and at 100 (the server analyses the asset), the bar has no value. |
| `label` | `TextMessage` | No | | The text above the bar, and the name of the bar. Without it, the name of the bar says the percent or the analysis. |
