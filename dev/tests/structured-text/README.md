# Structured Text converter tests

Run from the repository root with Node 20.19.0 or newer:

```bash
node --test dev/tests/structured-text/convert.test.mjs
```

The suite copies the shipped converter runtime to a temporary directory, installs its lockfile with `npm ci --ignore-scripts --no-audit --no-fund`, and executes the real CLI against synthetic local documents. It removes that temporary directory afterward. No DatoCMS credentials or live project are required. The initial dependency installation requires registry access; conversion itself performs no network requests.

Fixtures cover semantic Markdown, HTML, and a synthetic Google Docs Markdown export. Assertions check expected DAST structure and content, explicit normalization, source-located mapping diagnostics, deterministic output, and preservation of existing output on conversion or path failures. Unsupported features include media, tables, task lists, footnotes, raw HTML in Markdown, destination-incompatible nesting, custom numbering, and unmapped HTML attributes or styles.

The converter's three writable/input paths must identify distinct files. Tests also cover aliases through symlinks, hard links, and symlinked directories. Unsafe path combinations emit diagnostics on stderr without creating a report that might overwrite the source or output.
