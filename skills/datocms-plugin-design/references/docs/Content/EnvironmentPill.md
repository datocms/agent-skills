# EnvironmentPill

A pill that shows the type of an environment: primary or sandbox, with its
icon. DatoCMS shows it next to the name of the environment in the
environment switcher, in the list of the environments and in the warning of
a sandbox.

Without `label`, the pill shows "Primary" or "Sandbox". Give `label` only to
show another text.

```tsx
import EnvironmentPill from 'datocms-react-ui/EnvironmentPill';
import React from 'react';

export default function Basic() {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
      <EnvironmentPill primary />
      <EnvironmentPill primary={false} />
    </div>
  );
}
```

## Props

### EnvironmentPill

| Prop | Type | Required | Default | Description |
| - | - | - | - | - |
| `primary` | `boolean` | Yes | | True for the primary environment, false for a sandbox |
| `label` | `Message` | No | `"Primary" or "Sandbox"` | The type of the environment |
