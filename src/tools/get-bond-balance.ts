import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api, LuminaApiError } from "../api.js";
import { jsonResult, errorResult } from "../lib/format.js";

export function registerGetBondBalance(server: McpServer) {
  server.registerTool(
    "get_bond_balance",
    {
      title: "Get bond balance for a wallet",
      description:
        "List the ClaimBonds held by a wallet: epoch, face value (USD), maturity and whether " +
        "they are redeemable yet. Requires an API key (set LUMINA_API_KEY) — bond reads are " +
        "wallet-scoped and authenticated.",
      inputSchema: {
        walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "20-byte address required"),
      },
    },
    async ({ walletAddress }) => {
      try {
        const r = await api.get(`/api/v1/bonds/${walletAddress}`, /* auth */ true);
        return jsonResult(r);
      } catch (e) {
        if (e instanceof LuminaApiError && e.status === 401) {
          return errorResult(
            new Error(
              "Authentication required. Set LUMINA_API_KEY (lk_…) in the MCP server env. " +
                "Generate one at https://www.lumina-org.com/app/agent/api-keys",
            ),
          );
        }
        return errorResult(e);
      }
    },
  );
}
