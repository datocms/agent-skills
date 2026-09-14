# Current DatoCMS MCP

Load only after selecting MCP. It is optional; do not install or configure it as a prerequisite for CLI work.

1. Use the DatoCMS tools actually exposed in this conversation. Their current descriptions define authentication, project/environment selection, method discovery, script syntax, available helpers/types, and execution requirements. Do not guess tool prefixes or require a tool that this client does not expose.
2. Reuse the established project and environment. Resolve missing targets through the available tools; ask only when the intended target remains ambiguous. Respect the connection's granted permissions and the user's requested scope.
3. Request only the relevant schema and methods. Follow the tool's documentation/verification requirements before constructing a script. Use its supplied client, types, and helpers; do not initialize local CLI configuration, construct another authenticated client, or request a token for this route.
4. Apply the task's existing CMA reference: preserve unrelated fields, locales, blocks, links, and publication state. If a tool response already supplies that guidance, use it without loading another copy. Read additional references only for missing task-specific knowledge; CLI documentation hints in them apply only to CLI execution.
5. Verify the resulting content and report what actually changed. An execution timeout or missing response does not prove that a write failed: inspect its outcome before retrying, and never repeat an uncertain write through a different route. Authentication and permission errors are not reasons to bypass the selected connection.

For a confirmed legacy MCP, direct the user to the [current DatoCMS MCP setup](https://www.datocms.com/docs/mcp-server) and stop using the legacy integration. Do not execute, repair, reinstall, or change its configuration. A connection error alone does not identify a legacy MCP.
