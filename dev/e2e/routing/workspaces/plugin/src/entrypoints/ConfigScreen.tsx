import type { RenderConfigScreenCtx } from "datocms-plugin-sdk";
import { useState } from "react";

type Parameters = { apiToken?: string; debug?: boolean };

export default function ConfigScreen({ ctx }: { ctx: RenderConfigScreenCtx }) {
  const saved = ctx.plugin.attributes.parameters as Parameters;
  const [apiToken, setApiToken] = useState(saved.apiToken ?? "");
  const [debug, setDebug] = useState(saved.debug ?? false);

  return (
    <div style={{ padding: 20, background: "#f5f5f5", fontFamily: "Arial" }}>
      <h2 style={{ color: "#ff5e49" }}>Reading tools settings</h2>
      <label>
        API token
        <input value={apiToken} onChange={(event) => setApiToken(event.target.value)} style={{ display: "block", border: "1px solid #ccc" }} />
      </label>
      <label>
        <input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Debug mode
      </label>
      <button style={{ background: "#ff5e49", color: "white" }} onClick={() => ctx.updatePluginParameters({ apiToken, debug })}>
        Save
      </button>
    </div>
  );
}
