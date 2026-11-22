## Props

### FramedImage

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `src` | `string` | Yes | | The URL of the image in the frame. |
| `alt` | `TextMessage` | Yes | | What the image shows. It is also the title of the dialog. For example "The trigger of a GitLab pipeline". |
| `caption` | `Message` | No | | One line below the image, in the hint style. |
| `largeSrc` | `string` | No | | The URL of the image that the dialog shows at full size. Use it when the image in the frame is a small rendition of it. Without it, the dialog shows `src`. |
