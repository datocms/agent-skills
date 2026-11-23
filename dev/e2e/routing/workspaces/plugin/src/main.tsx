import { connect } from "datocms-plugin-sdk";
import ConfigScreen from "./entrypoints/ConfigScreen";
import SidebarPanel from "./entrypoints/SidebarPanel";
import { render } from "./utils/render";

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },
  itemFormSidebarPanels() {
    return [{ id: "readingTools", label: "Reading tools", startOpen: true }];
  },
  renderItemFormSidebarPanel(_sidebarPanelId, ctx) {
    render(<SidebarPanel ctx={ctx} />);
  },
});
