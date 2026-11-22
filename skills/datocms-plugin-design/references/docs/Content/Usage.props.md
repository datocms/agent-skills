## Props

### UsageMeter

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `usage` | `number` | Yes | | The current usage, in the same unit as `limit`, for example 820 |
| `limit` | `number` | Yes | | The included amount, in the same unit as `usage`, for example 1000 |
| `ariaLabel` | `TextMessage` | No | | The accessible name of the meter. Without it, the meter has no role: give the name to the element around it (for example, the target of a tooltip). usageMeterLabel gives a name. |
| `blocked` | `boolean` | No | `false` | Tells that the usage over the limit is stopped (a free plan): the part over the limit is red. Without it, the owner pays for the usage over the limit, and this part is amber. |
| `className` | `string` | No | | Only for the size and the position of the meter, not for its look |
