import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);

export function render(node: ReactNode): void {
  root.render(node);
}
