import type { RenderItemFormSidebarPanelCtx } from "datocms-plugin-sdk";

export default function SidebarPanel({ ctx }: { ctx: RenderItemFormSidebarPanelCtx }) {
  const title = String(ctx.formValues.title);
  return (
    <div style={{ border: "1px solid #ddd", padding: 12 }}>
      <h3>Reading tools</h3>
      <p>Title length: {title.length}</p>
    </div>
  );
}
