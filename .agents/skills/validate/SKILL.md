---
name: validate
description: Run repo validation to check skill metadata sync, eval fixture coverage, and repo invariants.
---

Run the repo validator with the freshness gate enabled:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root . --require-fresh-results-sync
```

If validation fails, read the error output carefully and fix each reported issue:

- **Metadata sync errors**: Update the `agents/openai.yaml` file to match the SKILL.md frontmatter for the affected skill.
- **Missing eval fixtures**: Create `evals/<skill-name>-skill-eval.json` for any skill that lacks one.
- **Stale results**: Re-run the relevant eval and update checked-in results.

After fixing, re-run validation to confirm all checks pass.
