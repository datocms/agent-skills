---
name: datocms-structured-text
description: >-
  Work with DatoCMS Structured Text (DAST) documents: understand nodes and marks,
  construct content, edit or traverse trees while preserving embedded references,
  diagnose and validate documents, import Markdown/HTML or Google Docs exports,
  and serialize or extract document content. Use for DAST payload work within
  record creates, updates, and migrations too. Ordinary record CRUD, GraphQL
  queries, schema design, framework component wiring, and plugin Slate editing
  stay with their respective skills; pair with this skill when they need
  document-level Structured Text operations. Do not activate merely because
  Structured Text appears in a query or renderer task: component props and
  renderBlock callbacks alone belong to frontend integrations.
---

# DatoCMS Structured Text

Understand, create, edit, convert, and validate DAST documents. Local document work needs no project, token, login, or CLI bootstrap.

## Choose the operation

| Request | Read |
| - | - |
| Explain structure, distinguish representations, diagnose invalid DAST or target constraints | [Document model](references/document-model.md) |
| Author content, change prose/marks/links, traverse nodes, preserve embedded references, use Dastdown | [Editing](references/editing.md) |
| Import Markdown/HTML or a Google Docs export, map unsupported content, extract text, produce HTML | [Conversion](references/conversion.md) |

Read only the selected reference. Add another when the task actually crosses its boundary. Source documents and generated DAST stay in files; inspect focused excerpts and diagnostics instead of filling context with entire trees.

## Working rules

- Preserve requested scope: conversion returns a document; importing into a project also needs destination mapping and an authorized write. Do not add authentication or schema setup to local work.
- Identify input representation before editing: DAST document, CMA field value, CDA response envelope, or plugin Slate value. Do not interchange wrappers.
- Dastdown is a controlled editing/authoring notation, not a CommonMark importer. Ordinary Markdown and HTML use the conversion workflow.
- Preserve unaffected nodes, custom marks, link metadata, and embedded reference identity. Reference placeholders do not contain block internals.
- Report unsupported source semantics and unresolved mappings. Structural validation alone does not prove fidelity or destination acceptance.
- Use current installed library signatures. Only install the packages needed for the selected operation; keep helper dependencies in task-local scratch.

## Work with companion skills

For a mixed task, stay responsible for the document; load the relevant companion's specific reference for its integration mechanics. Do not bounce between entrypoints or treat multiple skill activation as a routing failure.

| Needed capability | Owner |
| - | - |
| Read/write records, typed block requests, ownership, localization, version checks | `datocms-cma`: [editing records](../datocms-cma/references/editing-records.md) and [record operations](../datocms-cma/references/records.md) |
| Authentication, project/environment targeting, script runtime or migrations | `datocms-cli`: [scripting](../datocms-cli/references/cma-script.md) or migration references |
| GraphQL selection sets, CDA envelope and resolving queried references | `datocms-cda`: [querying Structured Text](../datocms-cda/references/structured-text.md) |
| React/Vue/Svelte/Astro rendering, component props, framework integration | `datocms-frontend-integrations`: framework Structured Text reference |
| Field/model design or schema changes | `datocms-content-modeling`, then `datocms-cli` for implementation |
| SDK form values, Slate conversion, editor hooks | `datocms-plugin`: [editor values](../datocms-plugin/references/structured-text.md) |
| Google Docs acquisition | Available document connector or user-provided export |

Companion skill absent? Local operations still work. For operations requiring that companion, identify it and explain how to install it through the user's existing skill installer; do not attempt a missing sibling file. No new Google authentication/export subsystem here.

## Completion

Return the requested artifact or verified change, concise validation results, and unresolved mappings. For local conversion, report output/report paths. For an authorized import, also verify the destination readback through its integration owner. Distinguish library validation, content preservation, and project checks actually performed.
