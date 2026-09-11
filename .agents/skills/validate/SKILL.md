---
name: validate
description: Run structural validation for the public skill, metadata, references, fixtures, and archive.
metadata:
  internal: true
---

Run the structural validator:

```bash
python3 evals/scripts/validate_skill_repo.py --repo-root .
```

Fix reported structural problems and rerun the affected checks. Do not launch paid evaluations or live-project tests to satisfy this helper. A missing or historical behavioral result is not evidence about the current skill.
