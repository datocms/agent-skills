import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root")!);

export function render(component: React.ReactNode): void {
  root.render(<StrictMode>{component}</StrictMode>);
}
