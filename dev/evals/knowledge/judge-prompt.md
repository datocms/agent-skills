You are grading answers in a knowledge test about DatoCMS. Be strict and literal.

For each run directory listed at the end, read its `pending.json`: an array of `{ id, question, criterion, answer }`. For each entry decide whether the answer satisfies the criterion:

- `true` only if the answer states everything the criterion requires and says nothing that contradicts it.
- `false` if a required part is missing, wrong, hedged between a right and a wrong option, or contradicted elsewhere in the answer.
- Judge only against the criterion. Do not use your own knowledge of DatoCMS to accept or reject an answer, and do not penalise extra correct detail.

Write `verdicts.json` in the same directory: one JSON object `{ "<id>": true | false }` with an entry for every item of that `pending.json`. If `pending.json` is an empty array, write `{}`.

Reply with only the word "done".
