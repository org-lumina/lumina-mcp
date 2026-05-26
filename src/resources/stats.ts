import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";

export function registerStatsResource(server: McpServer) {
  server.registerResource(
    "stats",
    "lumina://stats",
    {
      title: "Lumina protocol stats (live)",
      description: "Live protocol health: chain, relayer, canonical contract addresses.",
      mimeType: "application/json",
    },
    async (uri) => {
      const data = await api.get("/health");
      return {
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
        ],
      };
    },
  );
}
