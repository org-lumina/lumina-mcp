import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";

export function registerBondsResource(server: McpServer) {
  server.registerResource(
    "bonds",
    new ResourceTemplate("lumina://bonds/{walletAddress}", { list: undefined }),
    {
      title: "Bonds by wallet",
      description: "ClaimBonds held by a wallet (requires LUMINA_API_KEY; wallet-scoped).",
      mimeType: "application/json",
    },
    async (uri, { walletAddress }) => {
      const data = await api.get(
        `/api/v1/bonds/${encodeURIComponent(String(walletAddress))}`,
        /* auth */ true,
      );
      return {
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
        ],
      };
    },
  );
}
