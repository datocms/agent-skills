# Hooks

The components use these React hooks, and a plugin can use them too. Each
hook has its own entry, with one named export:

```tsx
import { useDebouncedValue } from 'datocms-react-ui/hooks/useDebouncedValue';
```

The hooks need no [`Canvas`](https://react-ui.datocms.com/Plugin/Canvas.md): they work in any React component.

## useAsyncSelectOptions

Loads the options of a [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md) from a server, as the user types: for
example, a search of the records of a model. Spread the result on the
select, next to `value` and `onChange`.

The hook does these things:

- It calls `load` with an empty query at mount, then with the text of the
  user after `debounce` milliseconds of quiet typing (200 by default).
- It ignores the response of an older query.
- It keeps every option that it got, so a pill keeps its label.
- It calls `resolve` one time for the values that no `load` returned.
- It does not throw the error of a request. `error` holds it, until the next
  search succeeds.

The "Remote search" section of [`SelectInput`](https://react-ui.datocms.com/Forms/SelectInput.md) explains more.

```tsx
function useAsyncSelectOptions<O extends BaseSelectOption>(config: {
  load: (query: string, signal: AbortSignal) => Promise<O[]>;
  resolve?: (values: string[]) => Promise<O[]>;
  value: string | string[] | null;
  debounce?: number;
}): {
  options: O[];
  loading: boolean;
  error: unknown;
  search: { onQueryChange: (query: string) => void };
  acceptValueNotIncludedInOptions: (value: string) => O | undefined;
};
```

Type a name: the options load after a short wait.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useAsyncSelectOptions } from 'datocms-react-ui/hooks/useAsyncSelectOptions';
import SelectInput from 'datocms-react-ui/SelectInput';
import React, { useState } from 'react';

type Author = { value: string; label: string };

const AUTHORS: Author[] = [
  { value: '1', label: 'Ada Lovelace' },
  { value: '2', label: 'Alan Turing' },
  { value: '3', label: 'Barbara Liskov' },
  { value: '4', label: 'Donald Knuth' },
  { value: '5', label: 'Edsger Dijkstra' },
  { value: '6', label: 'Grace Hopper' },
  { value: '7', label: 'Margaret Hamilton' },
  { value: '8', label: 'Tim Berners-Lee' },
];

// A fake server: it filters the authors after 400 ms. A plugin calls its
// own API here, and gives the signal to `fetch`.
function searchAuthors(query: string, signal: AbortSignal) {
  return new Promise<Author[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const text = query.trim().toLowerCase();
      resolve(AUTHORS.filter((a) => a.label.toLowerCase().includes(text)));
    }, 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

// The options of the saved values, which the first search can miss
async function findAuthors(ids: string[]) {
  return AUTHORS.filter((a) => ids.includes(a.value));
}

export default function RemoteSearch() {
  const [value, setValue] = useState<string[] | null>(['8']);
  const [lastChoice, setLastChoice] = useState<string | null>(null);
  const { error, ...asyncOptions } = useAsyncSelectOptions({
    load: searchAuthors,
    resolve: findAuthors,
    value,
  });

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      <FieldWrapper
        label="Authors"
        error={error ? 'The search of the authors failed.' : undefined}
      >
        <SelectInput
          multiple
          value={value}
          onChange={(newValue, options) => {
            setValue(newValue);
            setLastChoice(options.map((o) => o.label).join(', ') || null);
          }}
          {...asyncOptions}
        />
      </FieldWrapper>
      <p>
        The authors: <strong>{lastChoice ?? 'no change yet'}</strong>
      </p>
    </div>
  );
}
```

## useClickOutside

Calls a function when the user clicks or touches the page outside an
element: for example, to close a panel of your own. Give the ref to the
element. For a menu or a popover, use [`Dropdown`](https://react-ui.datocms.com/Actions/Dropdown.md) or [`Popover`](https://react-ui.datocms.com/Overlays/Overlay.md): they close
by themselves.

```tsx
function useClickOutside<T extends HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
): RefObject<T>;
```

```tsx
import Button from 'datocms-react-ui/Button';
import { useClickOutside } from 'datocms-react-ui/hooks/useClickOutside';
import React, { useState } from 'react';

export default function ClickOutside() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div
      ref={ref}
      style={{
        display: 'grid',
        gap: 'var(--spacing-s)',
        justifyItems: 'start',
      }}
    >
      <Button
        label={open ? 'Hide the preview' : 'Show the preview'}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div
          style={{
            padding: 'var(--spacing-m)',
            border: '1px solid var(--color--border)',
            borderRadius: 'var(--radius-m)',
          }}
        >
          Click out of this box to hide it.
        </div>
      )}
    </div>
  );
}
```

## useCopyToClipboard

Copies a value, and shows for 1.5 seconds that the copy is done. A control
of your own shows `copied` (a new icon or a new label). For a standard copy
button, use [`CopyButton`](https://react-ui.datocms.com/Content/CopyableValues.md).

```tsx
function useCopyToClipboard(value: string | null | undefined): {
  copied: boolean;
  copy: () => void;
};
```

```tsx
import Button from 'datocms-react-ui/Button';
import { useCopyToClipboard } from 'datocms-react-ui/hooks/useCopyToClipboard';
import React from 'react';

export default function CopyToClipboard() {
  const { copied, copy } = useCopyToClipboard(
    'https://www.example.com/preview/spring-launch',
  );

  return (
    <Button
      label={copied ? 'Copied' : 'Copy the preview link'}
      onClick={copy}
    />
  );
}
```

## useDebouncedValue

Gives a value that changes only when the value stays the same for `delay`
milliseconds: for example, a search that runs when the user stops typing.

```tsx
function useDebouncedValue<T>(value: T, delay: number): T;
```

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useDebouncedValue } from 'datocms-react-ui/hooks/useDebouncedValue';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function DebouncedValue() {
  const [query, setQuery] = useState<string | null>('');
  const debouncedQuery = useDebouncedValue(query, 500);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      <FieldWrapper label="Search the records">
        <StringInput value={query} onChange={setQuery} />
      </FieldWrapper>
      <p>
        The search runs for: <strong>{debouncedQuery || 'nothing yet'}</strong>
      </p>
    </div>
  );
}
```

## useDebouncedCallback

Gives a stable function that calls the latest `callback` one time, `wait`
milliseconds after the last call: for example, a save of the plugin
parameters while the user types. The call that waits stops when the
component unmounts.

```tsx
function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  wait: number,
): (...args: Args) => void;
```

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useDebouncedCallback } from 'datocms-react-ui/hooks/useDebouncedCallback';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function DebouncedCallback() {
  const [title, setTitle] = useState<string | null>('Spring launch');
  const [saved, setSaved] = useState('Spring launch');

  // In a plugin, this can call ctx.updatePluginParameters
  const save = useDebouncedCallback((value: string) => setSaved(value), 800);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      <FieldWrapper label="Title">
        <StringInput
          value={title}
          onChange={(value) => {
            setTitle(value);
            save(value ?? '');
          }}
        />
      </FieldWrapper>
      <p>
        The saved title: <strong>{saved}</strong>
      </p>
    </div>
  );
}
```

## useDebounceOnBoolean

Gives a boolean that becomes `true` after `delayOnTrue` milliseconds and
`false` after `delayOnFalse` milliseconds. A delay of 0 changes it at once.
Use it to show a spinner only when a load is slow.

```tsx
function useDebounceOnBoolean(
  value: boolean,
  delayOnTrue: number,
  delayOnFalse: number,
): boolean;
```

```tsx
import Button from 'datocms-react-ui/Button';
import { useDebounceOnBoolean } from 'datocms-react-ui/hooks/useDebounceOnBoolean';
import Spinner from 'datocms-react-ui/Spinner';
import React, { useState } from 'react';

export default function DebounceOnBoolean() {
  const [loading, setLoading] = useState(false);
  // The spinner shows only when the load takes more than 300 ms
  const showSpinner = useDebounceOnBoolean(loading, 300, 0);

  const load = (duration: number) => {
    setLoading(true);
    setTimeout(() => setLoading(false), duration);
  };

  return (
    <div
      style={{ display: 'flex', gap: 'var(--spacing-s)', alignItems: 'center' }}
    >
      <Button label="A fast load" onClick={() => load(100)} />
      <Button label="A slow load" onClick={() => load(2000)} />
      {showSpinner && <Spinner inline />}
    </div>
  );
}
```

## useDeepCompareEffect

A `useEffect` that runs again only when the contents of its dependencies
change. A new object or a new array with the same contents does not run it:
for example, an object of the values of `ctx`, which the host gives again at
each change.

```tsx
function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList,
): void;
```

```tsx
import Button from 'datocms-react-ui/Button';
import { useDeepCompareEffect } from 'datocms-react-ui/hooks/useDeepCompareEffect';
import React, { useState } from 'react';

export default function DeepCompareEffect() {
  const [locale, setLocale] = useState('en');
  const [, setRenders] = useState(0);
  const [loads, setLoads] = useState(0);

  // A new object at each render, as the values of a ctx
  const filter = { locale, status: 'published' };

  useDeepCompareEffect(() => {
    setLoads((value) => value + 1);
  }, [filter]);

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-s)',
        justifyItems: 'start',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
        <Button
          label="Render again"
          onClick={() => setRenders((value) => value + 1)}
        />
        <Button
          label="Change the locale"
          onClick={() => setLocale((value) => (value === 'en' ? 'it' : 'en'))}
        />
      </div>
      <p>
        The records of the locale <strong>{locale}</strong> loaded {loads}{' '}
        {loads === 1 ? 'time' : 'times'}.
      </p>
    </div>
  );
}
```

## useDidUpdateEffect

A `useEffect` that does not run after the first render: only when a
dependency changes. It does not run on mount under `StrictMode` either.

```tsx
function useDidUpdateEffect(fn: () => void, deps: DependencyList): void;
```

Change the slug: the message changes. The first render shows no message
about a change.

```tsx
import FieldWrapper from 'datocms-react-ui/FieldWrapper';
import { useDidUpdateEffect } from 'datocms-react-ui/hooks/useDidUpdateEffect';
import StringInput from 'datocms-react-ui/StringInput';
import React, { useState } from 'react';

export default function DidUpdateEffect() {
  const [slug, setSlug] = useState<string | null>('spring-launch');
  const [message, setMessage] = useState('The slug has no changes.');

  useDidUpdateEffect(() => {
    setMessage('The slug changed: the old links of the page break.');
  }, [slug]);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-m)', maxWidth: 400 }}>
      <FieldWrapper label="Slug">
        <StringInput value={slug} onChange={setSlug} />
      </FieldWrapper>
      <p>{message}</p>
    </div>
  );
}
```

## useElementLayout

Gives the size of an element, and renders again when the size changes: for
example, a chart that changes its layout with the width of the frame. Give
it the ref of the element. Before the first measure, the size is 0.

```tsx
function useElementLayout(ref: RefObject<Element | null>): DOMRect;
```

Make the window narrower: the width changes.

```tsx
import { useElementLayout } from 'datocms-react-ui/hooks/useElementLayout';
import React, { useRef } from 'react';

export default function ElementLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const { width } = useElementLayout(ref);

  return (
    <div
      ref={ref}
      style={{
        padding: 'var(--spacing-m)',
        border: '1px solid var(--color--border)',
        borderRadius: 'var(--radius-m)',
      }}
    >
      {width < 400
        ? 'A narrow box: the chart shows one column.'
        : 'A wide box: the chart shows two columns.'}{' '}
      The box is {Math.round(width)} px wide.
    </div>
  );
}
```

## useMediaQuery

Says whether a CSS media query matches, and renders again when the answer
changes. A plugin is in a frame: a query about the width reads the width of
the frame, not the width of the window of DatoCMS.

```tsx
function useMediaQuery(
  media: string,
  fallback?: { matches: boolean; media: string } | null,
): MediaQueryList | { matches: boolean; media: string };

function useIsPhone(): boolean;
function useIsSmallViewport(): boolean;
```

`useIsPhone` (narrower than 480px) and `useIsSmallViewport` (1024px or
narrower) are the two breakpoints of the components. The `fallback` is the
answer when there is no window.

```tsx
import { useMediaQuery } from 'datocms-react-ui/hooks/useMediaQuery';
import React from 'react';

export default function MediaQuery() {
  const reducedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  return (
    <p>
      {reducedMotion
        ? 'The user asks for less motion: the chart shows with no animation.'
        : 'The chart shows with an animation.'}
    </p>
  );
}
```

## useRovingKeyDown

Gives the `onKeyDown` handler of a group with a roving `tabIndex`: a
radio group or a tab list of your own. Put it on the group. The arrow keys,
Home and End move the focus to an item that matches `itemSelector` and click
it.

Only the left and right arrows move the focus, unless `vertical` is true.
Then the up and down arrows move it too. The selected item has
`tabIndex={0}`, the others `tabIndex={-1}`, so Tab goes to the selected
item and then out of the group. For a standard control, use
[`SegmentedControl`](https://react-ui.datocms.com/Navigation/SegmentedControl.md), [`RadioGroupInput`](https://react-ui.datocms.com/Forms/ChoiceInputs.md) or [`Tabs`](https://react-ui.datocms.com/Navigation/Tabs.md).

```tsx
function useRovingKeyDown(
  itemSelector: string,
  vertical?: boolean,
): (event: KeyboardEvent<HTMLElement>) => void;
```

Click a layout, then use the arrow keys.

```tsx
import { useRovingKeyDown } from 'datocms-react-ui/hooks/useRovingKeyDown';
import React, { useState } from 'react';

const LAYOUTS = [
  { id: 'list', label: 'List' },
  { id: 'grid', label: 'Grid' },
  { id: 'board', label: 'Board' },
];

export default function RovingKeyDown() {
  const [layout, setLayout] = useState('list');
  const onKeyDown = useRovingKeyDown('[role="radio"]');

  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      onKeyDown={onKeyDown}
      style={{ display: 'flex', gap: 'var(--spacing-s)' }}
    >
      {LAYOUTS.map((item) => {
        const checked = item.id === layout;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => setLayout(item.id)}
            style={{
              padding: 'var(--spacing-s) var(--spacing-m)',
              border: '1px solid var(--color--border-control)',
              borderRadius: 'var(--radius-s)',
              background: 'var(--color--surface)',
              color: 'var(--color--ink)',
              fontWeight: checked
                ? 'var(--font-weight-strong)'
                : 'var(--font-weight-regular)',
            }}
          >
            {checked ? `● ${item.label}` : `○ ${item.label}`}
          </button>
        );
      })}
    </div>
  );
}
```

## useShallowEqual

`useShallowEqualObject` and `useShallowEqualArray` give the previous value
when the new value has the same items (one level deep). So the value is
the same object between the renders: an effect with it as a dependency does
not run again, and a `React.memo` component does not render again.

```tsx
function useShallowEqualObject<T>(value: T): T;
function useShallowEqualArray<T>(value: T[]): T[];
```

```tsx
import Button from 'datocms-react-ui/Button';
import { useShallowEqualObject } from 'datocms-react-ui/hooks/useShallowEqual';
import React, { useEffect, useState } from 'react';

export default function ShallowEqual() {
  const [sort, setSort] = useState('title');
  const [, setRenders] = useState(0);
  const [loads, setLoads] = useState(0);

  // The same object while its values stay the same
  const options = useShallowEqualObject({ sort, pageSize: 25 });

  useEffect(() => {
    setLoads((value) => value + 1);
  }, [options]);

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-s)',
        justifyItems: 'start',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-s)' }}>
        <Button
          label="Render again"
          onClick={() => setRenders((value) => value + 1)}
        />
        <Button
          label="Sort by date"
          onClick={() =>
            setSort((value) => (value === 'title' ? 'date' : 'title'))
          }
        />
      </div>
      <p>
        The page sorted by <strong>{options.sort}</strong> loaded {loads}{' '}
        {loads === 1 ? 'time' : 'times'}.
      </p>
    </div>
  );
}
```

## useSmartRowClick

Gives the `onClick` handler of a row that opens on a click. It ignores a
click on a button, a link or a field in the row, a click that ends a text
selection, and a click on a node outside the row (a menu of the row in a
portal). With `enabled` false, it gives `undefined`. The click on the row is
a shortcut for the mouse, so put a link or a button in the row that does the
same for the keyboard.

```tsx
function useSmartRowClick<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  enabled?: boolean,
): MouseEventHandler<T> | undefined;
```

Click the row outside the buttons: the record opens. Select the text: the
record does not open.

```tsx
import Button from 'datocms-react-ui/Button';
import { useSmartRowClick } from 'datocms-react-ui/hooks/useSmartRowClick';
import React, { useState } from 'react';

export default function SmartRowClick() {
  const [message, setMessage] = useState('Click the row, or select its text.');
  const open = () => setMessage('The record "Spring launch" opens.');
  const onClick = useSmartRowClick<HTMLDivElement>(open);

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-s)' }}>
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-s)',
          padding: 'var(--spacing-s) var(--spacing-m)',
          border: '1px solid var(--color--border)',
          borderRadius: 'var(--radius-m)',
          cursor: 'pointer',
        }}
      >
        <span style={{ flex: 1 }}>Spring launch · ID 8462571</span>
        <Button tone="ghost" label="Open" onClick={open} />
        <Button
          tone="ghost"
          label="Duplicate"
          onClick={() =>
            setMessage('The record "Spring launch" is duplicated.')
          }
        />
      </div>
      <p>{message}</p>
    </div>
  );
}
```
