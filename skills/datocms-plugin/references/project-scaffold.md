# Project Scaffold Reference

This reference provides the standard project structure and configuration files for creating a new DatoCMS plugin from scratch.

## Contents

- Recommended Directory Structure
- `.gitignore`
- `package.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/vite-env.d.ts`
- `vite.config.ts`
- `index.html`
- `src/utils/render.tsx`
- `src/main.tsx` — Entry Point Template
- Styling
- Local Development
- Building for Production
- After Scaffold: first release checklist
- Publishing to npm

## Recommended Directory Structure

```
my-plugin/
├── .gitignore
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx              # Entry point — calls connect()
    ├── vite-env.d.ts         # Vite type declarations
    ├── utils/
    │   └── render.tsx        # React render utility
    ├── entrypoints/          # One file per render hook entry
    │   ├── FieldExtension.tsx
    │   ├── ConfigScreen.tsx
    │   └── ...
    ├── components/           # Shared components
    └── types.ts              # Shared type definitions (if needed)
```

## `.gitignore`

```
node_modules/
dist/
.env
```

## `package.json`

```json
{
  "name": "datocms-plugin-my-plugin",
  "version": "0.1.0",
  "description": "A DatoCMS plugin",
  "type": "module",
  "keywords": ["datocms-plugin"],
  "homepage": "",
  "datoCmsPlugin": {
    "title": "My Plugin",
    "entryPoint": "dist/index.html",
    "permissions": []
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "datocms-plugin-sdk": "^2.2.2",
    "datocms-react-ui": "^2.2.4",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.16"
  },
  "overrides": {
    "datocms-react-ui": {
      "react-intersection-observer": "^10.0.3",
      "react": "$react",
      "react-dom": "$react-dom"
    }
  }
}
```

Use the `overrides` block for React 19 scaffolds when `datocms-react-ui` internals must share the plugin's React instance.

### Optional Dependencies

Add as needed:

```json
{
  "dependencies": {
    "@datocms/cma-client-browser": "^5.4.22",
    "lodash-es": "^4.18.1",
    "classnames": "^2.5.1",
    "datocms-structured-text-slate-utils": "^6.0.0",
    "use-deep-compare-effect": "^1.8.1"
  },
  "devDependencies": {
    "@types/lodash-es": "^4.17.12"
  }
}
```

### Plugin Permissions

For **marketplace plugins**, declare permissions in `package.json` so DatoCMS prompts users on install:

```json
{
  "datoCmsPlugin": {
    "title": "My Plugin",
    "entryPoint": "dist/index.html",
    "permissions": ["currentUserAccessToken"]
  }
}
```

For **private plugins**, package-level permission prompts are ignored — grant permissions through the DatoCMS UI in the plugin's permissions tab after installation.

Once the installed plugin has the permission, `ctx.currentUserAccessToken` can be available in hooks. Still guard it at runtime.

## `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

## `tsconfig.app.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

## `tsconfig.node.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

## `src/vite-env.d.ts`

```ts
/// <reference types="vite/client" />
```

## `vite.config.ts`

### Basic Configuration

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
});
```

### Advanced Configuration (with code splitting)

For larger plugins:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-datocms': ['datocms-plugin-sdk', 'datocms-react-ui'],
        },
      },
    },
  },
});
```

## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DatoCMS Plugin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## `src/utils/render.tsx`

```tsx
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');
const root = createRoot(container);

export function render(component: ReactNode) {
  root.render(<StrictMode>{component}</StrictMode>);
}
```

## `src/main.tsx` — Entry Point Template

### Minimal (field extension)

```tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import FieldExtension from './entrypoints/FieldExtension';
import 'datocms-react-ui/styles.css';

connect({
  manualFieldExtensions() {
    return [
      {
        id: 'my-extension',
        name: 'My Extension',
        type: 'editor',
        fieldTypes: ['string'],
      },
    ];
  },
  renderFieldExtension(id, ctx) {
    render(<FieldExtension ctx={ctx} />);
  },
});
```

### With Config Screen

```tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import FieldExtension from './entrypoints/FieldExtension';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';

connect({
  manualFieldExtensions() { /* ... */ },
  renderFieldExtension(id, ctx) {
    render(<FieldExtension ctx={ctx} />);
  },
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },
});
```

### With Lazy Loading (recommended for larger plugins)

```tsx
import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import { Spinner } from 'datocms-react-ui';
import { lazy, Suspense } from 'react';
import 'datocms-react-ui/styles.css';

const LazyPage = lazy(() => import('./entrypoints/Page'));
const LazyConfig = lazy(() => import('./entrypoints/ConfigScreen'));

connect({
  mainNavigationTabs() {
    return [{ label: 'My Page', icon: 'cog', pointsTo: { pageId: 'main' } }];
  },
  renderPage(pageId, ctx) {
    render(
      <Suspense fallback={<Spinner size={60} placement="centered" />}>
        <LazyPage ctx={ctx} />
      </Suspense>,
    );
  },
  renderConfigScreen(ctx) {
    render(
      <Suspense fallback={<Spinner size={60} placement="centered" />}>
        <LazyConfig ctx={ctx} />
      </Suspense>,
    );
  },
});
```

## Styling

For inline styles, use CSS custom properties from `<Canvas>` (see `sdk-context-and-cma.md`). For component-scoped styles, use **CSS Modules** (`.module.css` files) — Vite supports them out of the box:

```tsx
import styles from './MyComponent.module.css';
<div className={styles.wrapper}>...</div>
```

## Local Development

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev` (starts on `http://localhost:5173/`)
3. In DatoCMS, open the **Plugins** area and use the **private plugin** flow to add a plugin from a URL
4. Set the entry point URL to `http://localhost:5173/`
5. The plugin will live-reload as you make changes

**Note**: Safari does not properly handle localhost iframes. Use Chrome or Firefox for plugin development.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. The `dist/index.html` is the entry point DatoCMS loads.

## After Scaffold: first release checklist

Once the first local build works, check the official plugin lifecycle docs that match the next step:

- **Additional permissions** — if the plugin needs new capabilities such as `currentUserAccessToken`
- **Publishing to Marketplace** — if the plugin will be public
- **Releasing new plugin versions** — when preparing the first versioned release

## Publishing to npm

When the plugin is ready:

1. Ensure `"files": ["dist"]` in package.json
2. Ensure `datoCmsPlugin.entryPoint` is `"dist/index.html"`
3. Run `npm run build`
4. Run `npm publish`

DatoCMS can install plugins directly from npm using the `datocms-plugin` keyword.

**Requirements**:

- Package name **must** start with `datocms-plugin-`
- `keywords` array **must** contain `"datocms-plugin"`
- `homepage` **must** be set to the plugin's project URL (e.g., GitHub repo)
- All paths in `dist/index.html` must be **relative** (the `base: './'` in vite.config.ts handles this)

**Optional marketplace assets** (add to `datoCmsPlugin` in package.json):

- `previewImage`: path to an MP4 or image showing the plugin in action
- `coverImage`: path to a cover image for the marketplace listing
