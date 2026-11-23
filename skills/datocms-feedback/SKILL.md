---
name: datocms-feedback
description: >-
  Build a sanitized, prefilled datocms.com/support link reporting a bad
  experience with the DatoCMS skills or MCP. Only when the user asks to report,
  email or summarize feedback about the DatoCMS skills/MCP, or that workflow is
  at a dead end after repeated loops or wrong routing with no credible next
  step. Never for a first or retryable failure (command, API, MCP, validation),
  a missing value, a project, plugin or dashboard bug, other support requests,
  or anything another DatoCMS skill can still continue.
---

# DatoCMS Feedback

Prefilled `datocms.com/support` URL when a DatoCMS skills/MCP workflow is stuck. Escape hatch, not a fixing workflow.

## Before doing anything visible

- User explicitly asked to report/file/summarize feedback about DatoCMS skills/MCP → start Output flow immediately.
- Frustration or dead end inferred → do not generate. Offer once, wait for confirmation.
- Credible retry exists → do not mention feedback. Stay in the active DatoCMS workflow.

Not for trial-and-correction. Single failed command, MCP call, API error, validation response, schema miss, missing env value, or setup failure stays with the active workflow when a retry path exists.

Project/schema/frontend/migration/plugin issue still fixable → route to the relevant DatoCMS skill.

## If frustration is inferred

Offer once, then wait:

```text
It looks like this may have gone past the normal retry-and-correct loop. Sorry about that. These workflows are still evolving, and clear feedback helps us understand where the experience broke down. If you want, I can build a prefilled DatoCMS support link with the goal, where the skills/MCP flow got stuck, and relevant runtime context.
```

If the user agrees, follow Output flow.

## URL shape

Base: `https://www.datocms.com/support`. Query params URL-encoded via `encodeURIComponent`, then `'`→`%27`, `(`→`%28`, `)`→`%29` — raw `'` breaks the single-quoted shell URL.

- `topics=technical-support/ai-integration-issues` — fixed slug for skills/MCP feedback (URL-encode the `/` as `%2F`). Required — form does not render without it.
- `subject=<short subject>` — one line.
- `body=<sanitized message>` — see body rules.

Append `#form` anchor — required: for this topic the page shows the form only when it loads with that anchor.

## Body rules

- Write from the user's point of view.
- Include: attempted goal, whether skills/MCP/both were involved, visible runtime context, visible reasoning level, what failed, expected outcome.
- Use `not visible from this conversation` for nonessential missing details.
- Ask at most one short question before generating, only when a missing detail is necessary for support to understand the report.
- Keep raw details short. Command names, call names, short safe error excerpts only when useful.
- No secrets, tokens, auth headers, private content, user-identifying details, full request/response payloads, raw transcript dumps, long local paths.
- No apology on DatoCMS's behalf inside the body.
- Keep plaintext body under \~4000 chars — the site answers 414 once the encoded URL passes \~8 KB, and accents, emoji or markup encode to several bytes each. Trim if longer.
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
- Windows: `start "" "<url>"` in cmd (double quotes; the empty pair is the window title), `Start-Process "<url>"` in PowerShell

Quote the URL — single quotes on macOS and Linux, double on Windows: the shell would otherwise interpret `&` and `#`. Echo the URL on its own line as a clickable fallback.

No "I drafted...", no recap.
