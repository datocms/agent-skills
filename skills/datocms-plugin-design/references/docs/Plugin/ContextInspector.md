# Context inspector

`ContextInspector` shows the `ctx` of the nearest [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md), for the
development of a plugin. Put it in a page or in a panel of the plugin while
you write the plugin, to see what the hook gives:

```tsx
import Canvas from 'datocms-react-ui/Canvas';
import ContextInspector from 'datocms-react-ui/ContextInspector';

<Canvas ctx={ctx}>
  <ContextInspector />
</Canvas>
```

It has two parts: "Hook-specific" (the properties and methods of this hook
only) and "Available on every hook". Each group of the SDK (the plugin,
the project, the toast methods...) is a panel that opens and closes. For
each property and method, it shows:

- the name and the type, with a link to its source in the SDK repository;
- the description;
- for a property, its current value;
- for a method with an example, the example and a "Run example" button.

Each box has a copy button. "Run example" runs the example with the `ctx`
of the plugin. When an example fails, the error goes to the console and
`ctx.alert` shows it.

## SDK manifest

The groups come from the `manifest` of `datocms-plugin-sdk`: the inspector
imports it at run time, from the version of the SDK that the plugin
installs. A hook that this version does not know shows nothing.

Only this entry imports the manifest (about 15 KB gzipped), so a plugin
that does not import `ContextInspector` does not bundle it.

## Headings and texts

`titleLevel` is the level of its two headings, after the headings around
it. The title of each group is one level below. The texts of the inspector
have keys (`contextInspector.runExample`, `contextInspector.everyHook`...):
the `texts` prop of [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md) changes them.

