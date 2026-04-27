# Migration Patterns

Covers common scripting patterns for data migrations, bulk operations, upload migrations, field type migrations, and resumable migration patterns.

> For endpoint shapes of any resource the script touches, consult `npx datocms cma:docs <resource> <action> --types-depth 2` (raise the depth or use `--expand-types` for deeper nested types). This file covers the migration script boilerplate, idempotent loops, progress reporting, and bulk-operation patterns — not the per-endpoint payload.

## Quick Navigation

- [Migration Script Boilerplate](#migration-script-boilerplate)
- [Iterating All Records with Progress](#iterating-all-records-with-progress)
- [Bulk Content Updates](#bulk-content-updates)
- [Upload Migration from External URLs](#upload-migration-from-external-urls)
- [Field Type Migration](#field-type-migration)
- [Resumable / Idempotent Migrations](#resumable--idempotent-migrations)
- [Common Migration Checklist](#common-migration-checklist)

---

## Migration Script Boilerplate

Every migration script should follow this pattern:

```ts
import { buildClient, ApiError } from "@datocms/cma-client-node";

const client = buildClient({
  apiToken: process.env.DATOCMS_API_TOKEN!,
  // Target sandbox for safety:
  // environment: "migration-sandbox",
});

async function migrate() {
  console.log("Starting migration...");
  const startTime = Date.now();

  // ... migration logic here ...

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Migration complete in ${elapsed}s`);
}

migrate().catch((error) => {
  if (error instanceof ApiError) {
    console.error("API Error:", error.response.status);
    console.error("Errors:", JSON.stringify(error.errors, null, 2));
  } else {
    console.error(error);
  }
  process.exit(1);
});
```

---

## Iterating All Records with Progress

```ts
async function processAllRecords() {
  let processed = 0;
  let errors = 0;

  for await (const record of client.items.listPagedIterator(
    { filter: { type: "blog_post" } },
    { perPage: 100 },
  )) {
    try {
      // Process the record...
      await client.items.update(record.id, {
        slug: record.title.toLowerCase().replace(/\s+/g, "-"),
      });
      processed++;
    } catch (error) {
      errors++;
      console.error(`Error processing ${record.id}:`, error);
    }

    if (processed % 50 === 0) {
      console.log(`Processed: ${processed}, Errors: ${errors}`);
    }
  }

  console.log(`Done. Processed: ${processed}, Errors: ${errors}`);
}
```

**Important:** Use `concurrency: 1` (the default) when the loop performs writes. This prevents exceeding rate limits.

---

## Bulk Content Updates

### Update a Field Across All Records

```ts
async function addDefaultCategory() {
  let updated = 0;

  for await (const record of client.items.listPagedIterator(
    { filter: { type: "blog_post" } },
    { perPage: 100 },
  )) {
    if (!record.category) {
      await client.items.update(record.id, {
        category: "uncategorized",
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} records with default category`);
}
```

### Bulk Publish All Draft Records

```ts
async function publishAllDrafts() {
  const draftRecords = [];

  for await (const record of client.items.listPagedIterator({
    filter: {
      type: "blog_post",
      fields: { _status: { eq: "draft" } },
    },
  })) {
    draftRecords.push({ id: record.id, type: "item" });
  }

  if (draftRecords.length === 0) {
    console.log("No draft records found");
    return;
  }

  // Bulk publish in batches of 200 (API limit: max 200 items per bulk request)
  const batchSize = 200;
  for (let i = 0; i < draftRecords.length; i += batchSize) {
    const batch = draftRecords.slice(i, i + batchSize);
    await client.items.bulkPublish({ items: batch });
    console.log(`Published batch ${Math.floor(i / batchSize) + 1}`);
  }

  console.log(`Published ${draftRecords.length} records total`);
}
```

---

## Upload Migration from External URLs

Migrate images from an external CMS or URL source:

```ts
async function migrateUploads(
  imageUrls: Array<{ url: string; alt: string }>,
) {
  const uploadMap = new Map<string, string>(); // old URL → new upload ID
  let done = 0;

  for (const { url, alt } of imageUrls) {
    try {
      const upload = await client.uploads.createFromUrl({
        url,
        skipCreationIfAlreadyExists: true,
        default_field_metadata: {
          en: { alt, title: null, custom_data: {}, focal_point: null },
        },
      });
      uploadMap.set(url, upload.id);
      done++;
      console.log(`[${done}/${imageUrls.length}] Uploaded: ${url}`);
    } catch (error) {
      console.error(`Failed to upload ${url}:`, error);
    }
  }

  return uploadMap;
}
```

---

## Field Type Migration

Change a field's type or migrate data between fields:

```ts
async function migrateTextToStructuredText() {
  const models = await client.itemTypes.list();
  const blogModel = models.find((m) => m.api_key === "blog_post");
  if (!blogModel) throw new Error("blog_post model not found");

  // Step 1: Create the new structured text field
  await client.fields.create(blogModel.id, {
    label: "Content (New)",
    api_key: "content_new",
    field_type: "structured_text",
    validators: {
      structured_text_blocks: { item_types: [] },
      structured_text_links: { item_types: [] },
    },
  });

  // Step 2: Migrate data from old text field to new structured text
  let migrated = 0;

  for await (const record of client.items.listPagedIterator({
    filter: { type: "blog_post" },
  })) {
    const oldText = record.content;
    if (!oldText) continue;

    // Convert plain text to a DAST document with a single paragraph
    const dastDocument = {
      schema: "dast",
      document: {
        type: "root",
        children: oldText.split("\n\n").map((paragraph: string) => ({
          type: "paragraph",
          children: [{ type: "span", value: paragraph }],
        })),
      },
    };

    await client.items.update(record.id, {
      content_new: dastDocument,
    });

    migrated++;
    if (migrated % 20 === 0) {
      console.log(`Migrated ${migrated} records`);
    }
  }

  // Step 3: After verifying, delete old field and rename new one
  // (Do this manually or in a separate script after verification)

  console.log(`Migrated ${migrated} records total`);
}
```

---

## Resumable / Idempotent Migrations

For long-running migrations, track progress so you can resume if interrupted:

```ts
import * as fs from "fs";

const PROGRESS_FILE = "./migration-progress.json";

function loadProgress(): Set<string> {
  try {
    const data = fs.readFileSync(PROGRESS_FILE, "utf-8");
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

function saveProgress(processed: Set<string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...processed]));
}

async function resumableMigration() {
  const processed = loadProgress();
  console.log(`Resuming from ${processed.size} already-processed records`);

  let done = 0;

  for await (const record of client.items.listPagedIterator(
    { filter: { type: "blog_post" } },
    { perPage: 100 },
  )) {
    if (processed.has(record.id)) continue;

    // Perform the migration operation
    await client.items.update(record.id, {
      migrated: true,
    });

    processed.add(record.id);
    done++;

    // Save progress every 50 records
    if (done % 50 === 0) {
      saveProgress(processed);
      console.log(`Progress saved: ${done} new records processed`);
    }
  }

  saveProgress(processed);
  console.log(`Done. Processed ${done} new records this run.`);

  // Clean up progress file
  fs.unlinkSync(PROGRESS_FILE);
}
```

---

## Common Migration Checklist

1. **Test in a sandbox** — Fork the primary environment first (see `references/environments.md`)
2. **Dry run** — Log what would change before making changes
3. **Progress tracking** — Report progress and support resumption
4. **Error handling** — Catch and log errors per record, don't let one failure stop the batch
5. **Verification** — After migration, verify a sample of records
6. **Promote** — Only promote after verification passes
