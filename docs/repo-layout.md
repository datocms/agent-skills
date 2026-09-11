# Repository layout

```text
.claude-plugin/             Plugin and marketplace manifests
.codex-plugin/              Plugin manifest
.agents/plugins/           Local development marketplace
plugins/datocms/            Symlinks to the canonical plugin and skill tree
skills/datocms/
  SKILL.md                 The only public skill entrypoint
  agents/openai.yaml       Synchronized discovery metadata
  references/
    cda.md, cli.md, cma.md, modeling.md
    frontend.md, plugin.md, setup.md, feedback.md
    <topic>/               Detailed topic references
    setup/recipe-manifest.json
  recipes/<group>/<id>/    Setup instructions, scripts, and assets
docs/                      Installation and contributor documentation
evals/                     Existing fixtures and maintenance tooling
scripts/                   Development and packaging helpers
zips/datocms.zip           Complete installable archive
```

The public entrypoint describes when each topic applies. It does not load every guide. A topic guide links to the detailed files needed for that task; shared rules have one authoritative copy.

All files needed at runtime live inside `skills/datocms/`. Internal guides are ordinary Markdown files, not additional `SKILL.md` entrypoints. Markdown links are relative to the containing file. Setup manifest paths are relative to the skill root, as declared by `path_base`.

The plugin identifiers and marketplace identifiers are unchanged. Both plugin manifests still discover `./skills/`; the local development package uses symlinks rather than duplicate content. Development helpers outside `skills/` remain marked `metadata.internal: true` so they are excluded from normal installer discovery.
