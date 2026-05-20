---
name: datocms-feedback
description: >-
  Draft sanitized feedback emails to support@datocms.com about frustrating
  DatoCMS skills or MCP experiences. Use only when users explicitly ask to
  report, email, or summarize feedback about DatoCMS skills/MCP, or when the
  skills/MCP workflow has clearly reached a dead end after repeated loops,
  wrong routing, unresolved misunderstandings, or no credible next step. Do not
  use for ordinary first failures, retryable MCP/command/API errors, validation
  feedback, schema discovery misses, missing environment values,
  project/plugin bugs, or setup problems where another DatoCMS skill can still
  continue.
---

# DatoCMS Feedback

Prefilled `datocms.com/support` URL when a DatoCMS skills/MCP workflow is stuck. Escape hatch, not a fixing workflow.

## Before doing anything visible

- User explicitly asked to report/file/summarize feedback about DatoCMS skills/MCP → generate immediately.
- Frustration or dead end inferred → do not generate. Offer once, wait for confirmation.
- Credible retry exists → do not mention feedback. Stay in the active DatoCMS workflow.

Not for trial-and-correction. Single failed command, MCP call, API error, validation response, schema miss, missing env value, or setup failure stays with the active workflow when a retry path exists.

Project/schema/frontend/migration/plugin issue still fixable → route to the relevant DatoCMS skill.

## If frustration is inferred

Offer once, then wait:

```text
It looks like this may have gone past the normal retry-and-correct loop. Sorry about that. These workflows are still evolving, and clear feedback helps us understand where the experience broke down. If you want, I can build a prefilled DatoCMS support link with the goal, where the skills/MCP flow got stuck, and relevant runtime context.
```

If the user agrees, generate the URL.

## URL shape

Base: `https://www.datocms.com/support`. Query params URL-encoded via `encodeURIComponent`.

- `topics=technical-support/ai-integration-issues` — fixed slug for skills/MCP feedback (URL-encode the `/` as `%2F`). Required — form does not render without it.
- `subject=<short subject>` — one line.
- `body=<sanitized message>` — see body rules.

Append `#form` anchor — page scrolls to the form on load.

## Body rules

- Write from the user's point of view.
- Include: attempted goal, whether skills/MCP/both were involved, visible runtime context, visible reasoning level, what failed, expected outcome.
- Use `not visible from this conversation` for nonessential missing details.
- Ask at most one short question before generating, only when a missing detail is necessary for support to understand the report.
- Keep raw details short. Command names, call names, short safe error excerpts only when useful.
- No secrets, tokens, auth headers, private content, user-identifying details, full request/response payloads, raw transcript dumps, long local paths.
- No apology on DatoCMS's behalf inside the body.
- Keep plaintext body under \~4000 chars — encoded URL must fit edge limits (Vercel \~14 KB). Trim if longer.
- No `Hi DatoCMS support,` / `Thanks,` salutations — the form is not an email.

## Body shape

Unless conversation calls for shorter:

```text
I ran into a frustrating issue while trying to use the DatoCMS skills/MCP workflow.

Goal: [goal].
Workflow involved: [skills/MCP/both/not visible from this conversation].

What happened: [short sanitized summary of the loop, wrong routing, repeated misunderstanding, or dead end].

Context:
- Runtime/client: [visible value or not visible from this conversation]
- Runtime identifier: [visible value or not visible from this conversation]
- Reasoning level: [visible value or not visible from this conversation]
- Safe error excerpt: [short excerpt or not included]

Expected: [expected outcome]. Could not get there because: [impact].

Sharing so you can see where the skills/MCP experience broke down.
```

## Output flow

Two steps. Do not build or reveal the URL on step 1.

**Step 1 — show draft body.** Output the sanitized body text (what lands in the textarea) for review. End with: "Want me to open the prefilled support page in your browser?"

**Step 2 — open the link.** After user confirms, build the URL and open:

- macOS: `open '<url>'`
- Linux: `xdg-open '<url>'`
- Windows: `start '' '<url>'`

Single-quote the URL — shell would otherwise interpret `&` and `#`. Echo the URL on its own line as a clickable fallback.

No "I drafted...", no recap.
