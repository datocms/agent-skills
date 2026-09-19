import assert from "node:assert/strict";

export async function prepare({ project, save }) {
  const client = project.cmaClient;
  await client.site.update({ locales: ["en", "it"] });
  const model = await client.itemTypes.create({
    name: "Scheduled announcement",
    api_key: "scheduled_announcement",
    draft_mode_active: true,
  });
  await client.fields.create(model.id, {
    label: "Title",
    api_key: "title",
    field_type: "string",
    localized: true,
  });
  const records = [];
  for (const name of ["Timed release", "Cancel release", "Untouched release"])
    records.push(
      await client.items.create({
        item_type: model,
        title: { en: name, it: `Italiano ${name}` },
      }),
    );
  const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  for (const record of records.slice(1))
    await client.scheduledPublication.create(record.id, {
      publication_scheduled_at: later,
    });
  const untouched = await client.items.find(records[2].id);
  const state = { records, untouched };
  save("fixture.json", state);
  return state;
}

export function prompt({ project, state }) {
  return `In sandbox ${project.environment}, schedule the entire announcement ${state.records[0].id} to publish about two minutes from the moment you submit the schedule, then unpublish three minutes after its scheduled publication. Use real scheduled operations, not immediate publication or a local timer. Cancel the pending publication of ${state.records[1].id}. Preserve both locales and leave announcement ${state.records[2].id} and its existing schedule untouched. Do not change schema, records, webhooks, build triggers or primary. Check the resulting schedules and summarize their UTC times, then finish without waiting for execution; the evaluator will observe the timed publication and unpublishing. Authentication is already configured. Do not print credentials.`;
}

export async function check({ project, state, save }) {
  const client = project.cmaClient;
  const target = await client.items.find(state.records[0].id);
  const cancelled = await client.items.find(state.records[1].id);
  const publishAt = Date.parse(target.meta.publication_scheduled_at);
  const unpublishAt = Date.parse(target.meta.unpublishing_scheduled_at);
  assert.ok(
    Number.isFinite(publishAt) && Number.isFinite(unpublishAt),
    "Both timed operations must remain scheduled",
  );
  assert.equal(
    target.meta.status,
    "draft",
    "Record was published immediately or the actor waited past its schedule",
  );
  assert.ok(publishAt > Date.now(), "Publication must still be in the future");
  assert.ok(
    publishAt - Date.now() <= 180000,
    "Publication falls outside the bounded test window",
  );
  assert.ok(
    unpublishAt - publishAt >= 120000 && unpublishAt - publishAt <= 240000,
    "Expected an approximately three-minute visibility window",
  );
  assert.equal(cancelled.meta.publication_scheduled_at, null);
  assert.equal(cancelled.meta.status, "draft");
  assert.deepEqual(
    await client.items.find(state.untouched.id),
    state.untouched,
  );
  save("scheduled.json", { target, cancelled });
  const observations = [];
  const deadline = Math.min(unpublishAt + 180000, Date.now() + 10 * 60 * 1000);
  let published = false,
    expired = false;
  while (Date.now() < deadline) {
    const record = await client.items.find(target.id);
    const observation = {
      at: new Date().toISOString(),
      status: record.meta.status,
      publicationScheduledAt: record.meta.publication_scheduled_at,
      unpublishingScheduledAt: record.meta.unpublishing_scheduled_at,
      firstPublishedAt: record.meta.first_published_at,
    };
    if (
      !observations.length ||
      JSON.stringify({ ...observation, at: null }) !==
        JSON.stringify({ ...observations.at(-1), at: null })
    ) {
      observations.push(observation);
      save("schedule-observations.json", observations);
      console.log(
        JSON.stringify({
          scenario: "scheduling",
          status: record.meta.status,
          observedAt: observation.at,
        }),
      );
    }
    assert.deepEqual(
      record.title,
      state.records[0].title,
      "Scheduling changed localized content",
    );
    if (record.meta.status === "published") {
      assert.ok(
        Date.parse(record.meta.first_published_at) >= publishAt - 1000,
        "Record published before its schedule",
      );
      assert.equal(record.meta.publication_scheduled_at, null);
      published = true;
    }
    if (
      published &&
      record.meta.status === "draft" &&
      record.meta.unpublishing_scheduled_at === null
    ) {
      assert.ok(
        Date.now() >= unpublishAt - 1000,
        "Record unpublished before its schedule",
      );
      expired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  assert.ok(
    published,
    "Scheduled publication did not execute within the observation window",
  );
  assert.ok(
    expired,
    "Scheduled unpublishing did not execute within the observation window",
  );
  const stillCancelled = await client.items.find(cancelled.id);
  assert.equal(stillCancelled.meta.status, "draft");
  assert.equal(stillCancelled.meta.publication_scheduled_at, null);
  assert.deepEqual(stillCancelled.title, state.records[1].title);
  assert.deepEqual(
    await client.items.find(state.untouched.id),
    state.untouched,
  );
  return [
    "real scheduled publication and unpublishing coexist on one record",
    "scheduled publication executes and exposes the expected localized content",
    "scheduled unpublishing executes after the visibility window",
    "explicit cancellation preserves content and leaves the unrelated schedule untouched",
  ];
}
