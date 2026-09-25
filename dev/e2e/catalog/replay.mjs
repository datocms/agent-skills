import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

// A recheck never repairs implementation logic. Only the two coordinates
// explicitly supplied in the original task are rebound to the new fixture.
export function replayVisualApplication({
  previous,
  workspace,
  project,
  state,
  save,
  scenario = "visual-editing",
}) {
  previous = resolve(previous);
  const prior = JSON.parse(readFileSync(join(previous, "result.json")));
  const provenance = JSON.parse(
    readFileSync(join(previous, "native/provenance.json")),
  );
  assert.ok(
    ["visual-editing", "public-site", "video-playback"].includes(scenario),
  );
  assert.equal(prior.scenario, scenario);
  assert.equal(prior.siteId, project.siteId);
  assert.equal(
    prior.framework ?? "nextjs",
    state.framework ?? "nextjs",
    "Recheck must use the original framework",
  );
  assert.ok(prior.environment?.startsWith("e2e-"));
  const modelId = provenance.prompt.match(
    /Map the catalog_article model ([\w-]+) to /,
  )?.[1];
  const bindings = [[prior.environment, project.environment]];
  if (scenario === "visual-editing") {
    assert.ok(modelId, "Original prompt does not identify the fixture model");
    bindings.push([modelId, state.records[0].item_type.id]);
  }
  const source = join(previous, "workspace");
  const allowedDirectories = [
    "src",
    "app",
    "pages",
    "components",
    "lib",
    "public",
    "styles",
    "server",
    "composables",
    "plugins",
    "middleware",
    "utils",
    "types",
    "layouts",
  ];
  const allowedFiles =
    /^(package(?:-lock)?\.json|tsconfig.*\.json|next(?:\.config\.[cm]?[jt]s|-env\.d\.ts)|(?:nuxt|astro|svelte|vite)\.config\.[cm]?[jt]s|app\.vue|README\.md)$/;
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (
      !(entry.isDirectory()
        ? allowedDirectories.includes(entry.name)
        : entry.isFile() && allowedFiles.test(entry.name))
    )
      continue;
    cpSync(join(source, entry.name), join(workspace, entry.name), {
      recursive: true,
    });
  }
  rmSync(join(workspace, "node_modules"), { recursive: true, force: true });
  assert.ok(
    existsSync(join(source, "node_modules")),
    "Original dependency installation is needed for a model-free recheck",
  );
  symlinkSync(join(source, "node_modules"), join(workspace, "node_modules"));
  const files = [];
  const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
  function rebind(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        rebind(file);
        continue;
      }
      if (
        !entry.isFile() ||
        !/[.](?:[cm]?[jt]sx?|json|md|html|vue|svelte|astro)$/.test(entry.name)
      )
        continue;
      const original = readFileSync(file);
      const updated = bindings.reduce(
        (text, [from, to]) => text.replaceAll(from, to),
        original.toString(),
      );
      writeFileSync(file, updated);
      files.push({
        path: file.slice(workspace.length + 1),
        before: hash(original),
        after: hash(updated),
        rebound: !original.equals(Buffer.from(updated)),
      });
    }
  }
  rebind(workspace);
  save("replay.json", {
    previous,
    bindings,
    files,
    modelCalls: 0,
    note: "Only task-supplied environment and model IDs changed; application logic is unchanged.",
  });
}
