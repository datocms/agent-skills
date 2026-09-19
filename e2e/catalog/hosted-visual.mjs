import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function checkHostedVisual({ project, state, save, output }) {
  const client = project.cmaClient;
  const plugin = await client.plugins.create({
    package_name: "datocms-plugin-web-previews",
  });
  project.catalogPluginIds ??= [];
  project.catalogPluginIds.push(plugin.id);
  await client.plugins.update(plugin.id, {
    parameters: {
      frontends: [
        {
          name: "Disposable browser validation",
          previewWebhook: `${state.origin}/api/preview-links?token=${state.environment.SECRET_API_TOKEN}`,
          visualEditing: {
            enableDraftModeUrl: `${state.origin}/api/draft-mode/enable?token=${state.environment.SECRET_API_TOKEN}`,
            initialPath: "/articles/article-0",
          },
        },
      ],
      startOpen: true,
    },
  });
  const before = await client.items.find(state.records[0].id);
  const untouched = await client.items.find(state.records[1].id);
  const title = `Hosted browser edit ${state.marker}`;
  const editorUrl = `${state.environment.DATOCMS_BASE_EDITING_URL}/environments/${project.environment}/editor/item_types/${state.records[0].item_type.id}/items/${state.records[0].id}/edit`;
  save("hosted-browser-task.json", {
    editorUrl,
    pluginId: plugin.id,
    pluginPackage: plugin.package_name,
    pluginVersion: plugin.package_version,
    origin: state.origin,
    initialTitle: before.title.en,
    expectedTitle: title,
    firstRecord: state.records[0].id,
    secondRecord: state.records[1].id,
    secondTitle: `English 1 ${state.marker}`,
    instructions:
      "Use the actual Web Previews Visual tab. Confirm the initial article renders in draft mode, enable editing and click its heading to select the localized title. Edit the English title to expectedTitle in the hosted editor and save without publishing. Verify that the embedded website updates. Navigate the preview to /articles/article-1 and verify click-to-edit selects secondRecord. Write hosted-finish.json with draftVisible, editSelected, liveUpdateVisible and secondRecordSelected observations. Do not record credentials.",
  });
  save("checkpoint-hosted.json", {
    environment: project.environment,
    ownedPluginIds: project.catalogPluginIds,
    ownedTokenIds: project.catalogTokenIds,
  });
  console.log(
    JSON.stringify({
      status: "awaiting-hosted-visual-browser",
      output,
      editorUrl,
    }),
  );
  const finish = join(output, "hosted-finish.json");
  const deadline = Date.now() + 20 * 60 * 1000;
  while (!existsSync(finish) && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 500));
  assert.ok(existsSync(finish), "Hosted visual browser check timed out");
  const observation = JSON.parse(readFileSync(finish));
  for (const key of [
    "draftVisible",
    "editSelected",
    "liveUpdateVisible",
    "secondRecordSelected",
  ])
    assert.equal(
      observation[key],
      true,
      `Hosted browser check incomplete: ${key}`,
    );
  const after = await client.items.find(state.records[0].id);
  assert.deepEqual(after.title, { ...before.title, en: title });
  for (const key of ["slug", "sort_index", "body", "item_type"])
    assert.deepEqual(after[key], before[key], `Hosted edit changed ${key}`);
  assert.deepEqual(
    await client.items.find(untouched.id),
    untouched,
    "Preview navigation changed the second record",
  );
  const publicHtml = await (
    await fetch(`${state.origin}/articles/article-0`)
  ).text();
  assert.ok(
    publicHtml.includes(`English 0 ${state.marker}`),
    "Hosted edit changed published content",
  );
  assert.ok(
    !publicHtml.includes(title),
    "Hosted draft appeared in public content",
  );
  save("hosted-record-after.json", after);
  return [
    "actual hosted Web Previews loads draft content and selects a localized field",
    "hosted editor save updates the embedded website and preserves published content",
    "actual Visual-tab navigation selects the second record without changing it",
  ];
}
