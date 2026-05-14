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

Draft a sanitized support email when a DatoCMS skills or MCP workflow is stuck or frustrating. This is an escape hatch, not a fixing workflow.

## Before doing anything visible

Decide whether this is actually a feedback case before offering or drafting anything.

- If the user explicitly asked to draft, report, email, or summarize feedback about DatoCMS skills or MCP, draft immediately.
- If this skill loaded because frustration or a dead end is inferred, do not draft immediately. Offer once and wait for confirmation.
- If there is still a credible next retry, do not mention feedback. Continue the active DatoCMS workflow instead.

Do not use this skill for normal trial-and-correction. A single failed command, MCP call, API error, validation response, schema discovery miss, missing environment value, or setup failure is expected and should stay with the active DatoCMS workflow when there is a clear retry.

If the problem is a project, schema, frontend, migration, or plugin issue that can still be fixed, route back to the relevant DatoCMS skill instead of drafting feedback.

## If frustration is inferred

Do not draft the email immediately. Offer once, then wait:

```text
It looks like this may have gone past the normal retry-and-correct loop. Sorry about that. These workflows are still evolving, and clear feedback helps us understand where the experience broke down. If you want, I can draft a short email to support@datocms.com with the goal, where the skills/MCP flow got stuck, and relevant runtime context.
```

If the user agrees, draft the email.

## Drafting rules

- Once drafting starts, output only the email draft.
- Address it to `support@datocms.com` and include a subject line.
- Write from the user's point of view.
- Include the attempted goal, whether skills/MCP/both were involved, visible runtime context, visible reasoning level, what failed, and what the user expected instead.
- Use `not visible from this conversation` for nonessential missing details.
- Ask at most one short question before drafting, and only when a missing detail is necessary for support to understand the report.
- Keep raw details short. Include command names, call names, or short safe error excerpts only when useful.
- Do not include secrets, tokens, auth headers, private content, user-identifying details, full request/response payloads, raw transcript dumps, or long local paths.
- Do not apologize on DatoCMS's behalf inside the email body.

## Email shape

Use this shape unless the conversation clearly calls for a shorter draft:

```text
To: support@datocms.com
Subject: Feedback on DatoCMS skills/MCP workflow

Hi DatoCMS support,

I ran into a frustrating issue while trying to use the DatoCMS skills/MCP workflow.

I was trying to [goal]. The workflow involved [skills/MCP/both/not visible from this conversation].

What seemed to happen was [short sanitized summary of the loop, wrong routing, repeated misunderstanding, or dead end].

Relevant context:
- Runtime/client: [visible value or not visible from this conversation]
- Runtime identifier: [visible value or not visible from this conversation]
- Reasoning level: [visible value or not visible from this conversation]
- Safe error excerpt: [short excerpt or not included]

I expected [expected outcome], but I could not get there because [impact].

I am sharing this so you can understand where the skills/MCP experience broke down and improve the workflow.

Thanks,
```
