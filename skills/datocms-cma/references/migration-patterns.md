# Migration Patterns

Operation bodies: typed record writes per `references/editing-records.md` (`<Schema.X>` on every typed call, `parse()` for new DAST); field payloads per `references/schema.md`; iteration per `references/filtering-and-pagination.md` (`concurrency: 1` when writing); bulk ops per `references/records.md` (200-item cap; select drafts with `filter.fields._status: { eq: "draft" }`); URL imports per `references/uploads.md` (`skipCreationIfAlreadyExists` for reruns).

Field type change: create the new field, backfill, verify, then drop the old field and rename the new one in a separate step.

## Common Migration Checklist

1. **Test in a sandbox** — Fork the primary environment first (see `references/environments.md`)
2. **Dry run** — Log what would change before making changes
3. **Progress tracking** — `console.log` at start (target environment, item count if known), each phase, every N records inside loops (counts + error tally), and the end (totals, elapsed time, operator next steps) so the operator can follow the run live; `console.error` for per-item failures. Support resumption for long runs (persist processed IDs, skip them on rerun).
4. **Error handling** — Catch and log errors per record, don't let one failure stop the batch
5. **Verification** — After migration, verify a sample of records
6. **Promote** — Only promote after verification passes
