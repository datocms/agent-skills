# Forms and Controls

## Contents

- Field rhythm
- Labels and helper text
- Validation
- Button hierarchy
- Grouped settings
- Inline vs block controls
- Config screen action placement
- Control defaults to prefer
- Disabled states
- Destructive areas

## Field rhythm

The CMS default field stack is simple:

- label above control
- input or control
- error or hint below
- about `var(--spacing-l)` between fields

Keep labels aligned and predictable. Do not switch between left labels, top labels, and inline labels unless the control truly requires it.

## Labels and helper text

Labels should be short and concrete. Use helper text only when the field needs clarification.

### Good helper text

- expected format
- side effect of a toggle
- when a field is optional but recommended

### Bad helper text

- restating the label
- sales copy
- vague reassurance

Secondary text should usually use `var(--color--ink-subtle)` and `var(--font-size-s)`.

## Validation

CMS validation is close to the field:

- invalid label uses the danger/invalid text treatment
- control border changes to the danger/invalid border token
- error text sits directly below the field

Plugins should do the same. Do not surface every validation issue as a toast.

## Button hierarchy

Official docs:

- Button: <https://www.datocms.com/docs/plugin-sdk/button>
- Button group: <https://www.datocms.com/docs/plugin-sdk/button-group>

### Hierarchy

- **Primary**: one main action in a region or screen
- **Muted / secondary**: safe supporting actions
- **Negative**: destructive actions only

### Rules

- Avoid multiple primary buttons in the same section
- Keep destructive buttons separated from save actions
- Full-width buttons are appropriate in narrow config screens and focused modals
- In toolbar contexts, buttons should stay compact

## Grouped settings

Use grouped sections for settings that belong together. Public component path:

- `Form`
- `FieldGroup`
- `Section`

If you use `react-final-form`, alias its `Form` import to avoid colliding with the `datocms-react-ui` `Form` component.

## Inline vs block controls

Default to block controls.

Inline controls are good for:

- short toggles next to one another
- compact numeric settings
- paired URL prefix/suffix inputs

Use input groups for prefixed and suffixed values rather than inventing a separate visual treatment.

## Config screen action placement

A normal config screen usually ends with:

- grouped settings above
- one save action at the bottom or in the last section
- optional cancel or reset action nearby if the flow needs it

The CMS does not usually bury the main save action inside a decorative footer.

## Control defaults to prefer

Public component path:

- text -> `TextField`
- multiline -> `TextareaField`
- choice list -> `SelectField`
- boolean -> `SwitchField`
- grouped buttons -> `ButtonGroup`
- spinner / pending state -> `Spinner`

Raw fallback path:

- standard `<label>`, `<input>`, `<textarea>`, `<select>`
- CSS Modules using Canvas variables
- browser-native semantics first, extra chrome second

## Disabled states

### Visual treatment

- Inputs: opacity `0.5`–`0.6`, `cursor: not-allowed`, `var(--color--disabled--surface)` background
- Buttons: `var(--color--disabled--surface)` background, `var(--color--disabled--ink)` text, `cursor: not-allowed`

```css
.input:disabled,
.textarea:disabled,
.select:disabled {
  background: var(--color--disabled--surface);
  cursor: not-allowed;
  opacity: 0.6;
}

.buttonDisabled {
  background: var(--color--disabled--surface);
  color: var(--color--disabled--ink);
  cursor: not-allowed;
}
```

### Accessibility

Use the native `disabled` attribute on form elements. For non-form elements that appear disabled, use `aria-disabled="true"` and prevent interaction in the click handler.

## Destructive areas

Destructive actions should usually live in a separated section with one clear explanation. If the CMS source uses a highlighted or destructive treatment, copy the restraint, not just the color.
