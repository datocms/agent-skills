export const specifications = {
  nextjs: {
    dependencies: { next: "16.3.5", react: "19.3.0", "react-dom": "19.3.0" },
    scripts: { build: "next build --webpack", start: "next start" },
    files: {
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          resolveJsonModule: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
      }),
      "src/app/layout.tsx":
        "export default function Layout({children}:{children:React.ReactNode}) {return <html><body>{children}</body></html>}",
      "src/app/page.tsx":
        "export default function Page(){return <h1>Preview fixture</h1>}",
    },
    start: (port) => [
      "node_modules/next/dist/bin/next",
      "start",
      "--port",
      String(port),
    ],
  },
  nuxt: {
    dependencies: { nuxt: "4.5.2" },
    scripts: { build: "nuxt build", start: "node .output/server/index.mjs" },
    files: {
      "nuxt.config.ts":
        "export default defineNuxtConfig({compatibilityDate:'2026-09-18',srcDir:'.',devtools:{enabled:false}})",
      "app.vue": "<template><h1>Preview fixture</h1></template>",
      "tsconfig.json": JSON.stringify({ extends: "./.nuxt/tsconfig.json" }),
    },
    start: () => [".output/server/index.mjs"],
  },
  astro: {
    dependencies: { astro: "7.3.3", "@astrojs/node": "11.1.6" },
    scripts: { build: "astro build", start: "node dist/server/entry.mjs" },
    files: {
      "astro.config.mjs":
        "import {defineConfig} from 'astro/config';import node from '@astrojs/node';export default defineConfig({output:'server',adapter:node({mode:'standalone'})});",
      "tsconfig.json": JSON.stringify({
        extends: "astro/tsconfigs/strict",
        compilerOptions: {
          baseUrl: ".",
          paths: { "~/*": ["src/*"], "@/*": ["src/*"] },
        },
      }),
      "src/pages/index.astro":
        "<html><body><h1>Preview fixture</h1></body></html>",
    },
    start: () => ["dist/server/entry.mjs"],
  },
  sveltekit: {
    dependencies: {
      "@sveltejs/kit": "2.70.3",
      "@sveltejs/adapter-node": "5.5.7",
      "@sveltejs/vite-plugin-svelte": "7.3.0",
      svelte: "5.57.0",
      vite: "8.3.0",
    },
    scripts: { build: "vite build", start: "node build" },
    files: {
      "svelte.config.js":
        "import adapter from '@sveltejs/adapter-node';export default {kit:{adapter:adapter()}};",
      "vite.config.ts":
        "import {sveltekit} from '@sveltejs/kit/vite';import {defineConfig} from 'vite';export default defineConfig({plugins:[sveltekit()]});",
      "tsconfig.json": JSON.stringify({
        extends: "./.svelte-kit/tsconfig.json",
        compilerOptions: { strict: true, moduleResolution: "bundler" },
      }),
      "src/app.html":
        "<!doctype html><html><head>%sveltekit.head%</head><body><div>%sveltekit.body%</div></body></html>",
      "src/routes/+page.svelte": "<h1>Preview fixture</h1>",
    },
    start: () => ["build"],
  },
};
