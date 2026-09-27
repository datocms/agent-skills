# Migration Patterns

Operation bodies: typed record writes per `references/editing-records.md` (`<Schema.X>` on every typed call, `parse()` for new DAST); field payloads per `references/schema.md`; iteration per `references/filtering-and-pagination.md` (`concurrency: 1` when writing); bulk ops per `references/records.md` (200-item cap; select drafts with `filter.fields._status: { eq: "draft" }`); URL imports per `references/uploads.md` (`skipCreationIfAlreadyExists` for reruns).

Field type change: create the new field, backfill, verify, then drop the old field and rename the new one in a separate step.

## Common Migration Checklist

1. **Test in a sandbox** — Fork the primary environment first (see `references/environments.md`)
2. **Dry run** — Log what would change before making changes
3. **Progress tracking** — `console.log` at start (target environment, item count if known), each phase, every N records inside loops (counts + error tally), and the end (totals, elapsed time, operator next steps) so the operator can follow the run live; `console.error` for per-item failures. Support resumption for long runs (persist processed IDs, skip them on rerun).
4. **Error handling** — Fail immediately, or collect per-record failures while finishing the batch and then throw before the migration returns. The CLI records a normally returning migration as completed and skips it on future runs, even if it logged errors. Await the batch and stop before any later destructive phase when failures remain.
5. **Verification** — Confirm every intended operation succeeded; sampling content can supplement that check but cannot excuse known failures.
6. **Promote** — Only promote after the whole migration and verification succeed, with primary frozen since the release fork (see `references/environments.md`).

## Collect errors without recording a partial migration as complete

Use an awaited helper like this when independent records should continue after one fails. Pass the selected record IDs and the migration's per-record operation; make that operation idempotent or skip already completed records when retrying. A thrown result leaves the migration untracked and prevents subsequent migration phases from running.

```ts
async function updateBatch(
  recordIds: readonly string[],
  updateRecord: (id: string) => Promise<void>,
): Promise<void> {
  const failedIds: string[] = [];

  for (const id of recordIds) {
    try {
      await updateRecord(id);
    } catch (error) {
      failedIds.push(id);
      console.error(`Record ${id} failed`, error);
    }
  }

  if (failedIds.length > 0) {
    throw new Error(`Migration incomplete: ${failedIds.length} failed records (${failedIds.join(", ")})`);
  }
}
```

Call it with `await updateBatch(recordIds, updateRecord)` inside the migration. Do not catch its final error merely to log it and return successfully.
