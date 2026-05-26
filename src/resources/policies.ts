import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";

export function registerPoliciesResource(server: McpServer) {
  server.registerResource(
    "policies",
    new ResourceTemplate("lumina://policies/{walletAddress}", { list: undefined }),
    {
      title: "Policies by wallet",
      description: "Policies owned by a wallet (requires LUMINA_API_KEY; wallet-scoped).",
      mimeType: "application/json",
    },
    async (uri, { walletAddress }) => {
      const data = await api.get(
        `/api/v1/policies?owner=${encodeURIComponent(String(walletAddress))}`,
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
