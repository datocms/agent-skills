# Local plugin readiness

The plugin manifest must discover only `skills/datocms/`, with one synchronized `agents/openai.yaml`. The local marketplace must resolve through the tracked plugin symlinks to that same directory.

Check that:

- Automatic discovery is enabled and explicit invocation uses `$datocms`.
- The installed directory has all references, recipes, scripts, and assets.
- The public skill has a matching trigger fixture; historical measurements are not represented as results for this layout.
- The repository validator and isolated-package tests pass.
- The generated archive matches the source and the working tree is clean before release.

See [maintenance](maintenance.md) for commands. Structural readiness does not prove triggering quality or reduced context usage; those measurements are separate local work.
