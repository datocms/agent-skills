# Skills and MCP feedback

Prepare a sanitized support-form draft only for feedback about the DatoCMS skills/MCP experience. Ordinary project, schema, frontend, migration, or plugin errors remain in their active workflow while a credible fix exists.

## Eligibility and authorization

- An explicit request to report or summarize skills/MCP feedback authorizes preparing the draft.
- Inferred frustration or a repeated dead end permits one offer. Wait for the user's agreement before preparing feedback.
- A single failed command, validation error, schema miss, or missing configuration does not trigger feedback when a retry is possible.
- Preparing feedback does not authorize submitting it or contacting support.

If offering feedback, briefly describe the exhausted workflow and offer a prefilled support link. Do not interrupt a working recovery path or make repeated offers.

## Draft

Write from the user's point of view. Include the attempted goal, whether skills/MCP/both were involved, what failed, expected outcome, visible runtime/client information, runtime identifier, and reasoning level, and a short useful error excerpt.

Use "not visible from this conversation" for nonessential missing details. Ask at most one short question only when a necessary detail prevents a useful report.

Exclude secrets, tokens, auth headers, private content, identifying details, full payloads, transcript dumps, and long local paths. Do not apologize on DatoCMS's behalf. This is a form, so omit email salutations and signatures. Keep the plaintext body below about 4,000 characters so the encoded URL fits the approximate 14 KB edge limit.

A concise structure is:

```text
Goal: [what I was trying to do].
Workflow: [skills/MCP/both].
What happened: [short account of the repeated problem].
Context: [visible runtime/client and reasoning level, if useful].
Error: [short safe excerpt, if useful].
Expected: [outcome and what remained blocked].
```

## Show and open

Show the draft body for review before constructing/opening the URL. If opening has not already been explicitly authorized, ask whether to open the prefilled support page. Opening the form does not submit it.

After authorization, construct `https://www.datocms.com/support` with URL-encoded query parameters and a `#form` anchor:

- `topics=technical-support/ai-integration-issues`, including the encoded `/`; required for the form.
- `subject`, a short one-line summary.
- `body`, the reviewed sanitized text.

Encode parameter values with `encodeURIComponent`. Prefer an available browser-opening tool; otherwise use the platform's normal URL opener with proper shell quoting. Provide a clickable fallback link. Never send the feedback or submit the form without separate explicit authorization.
