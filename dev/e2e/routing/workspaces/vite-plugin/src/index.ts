import type { Plugin } from "vite";

export type BannerOptions = { text: string };

export default function buildBanner(options: BannerOptions): Plugin {
  return {
    name: "build-banner",
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === "chunk") chunk.code = `/* ${options.text} */\n${chunk.code}`;
      }
    },
  };
}
