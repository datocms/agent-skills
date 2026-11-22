# Dropdown actions

`itemFormDropdownActions`, `itemsDropdownActions`, `fieldDropdownActions`, `uploadsDropdownActions`, `schemaItemTypeDropdownActions` and their `execute*` hooks render no frame: the host draws the menu item, and `execute*` runs with a plain ctx. Feedback: `ctx.notice`/`ctx.alert`. Any UI (a form, a choice): `ctx.openModal`, then build it in `renderModal` ([Modal](modal.md)). Hook wiring: `../../../datocms-plugin/SKILL.md`.
