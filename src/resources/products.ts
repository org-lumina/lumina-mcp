import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";

export function registerProductsResource(server: McpServer) {
  server.registerResource(
    "products",
    "lumina://products",
    {
      title: "Lumina products (live)",
      description: "Live list of Lumina insurance products from the protocol API.",
      mimeType: "application/json",
    },
    async (uri) => {
      const data = await api.get("/products");
      return {
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
        ],
      };
    },
  );
}
