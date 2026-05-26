import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { jsonResult, errorResult } from "../lib/format.js";

export function registerGetPolicyStatus(server: McpServer) {
  server.registerTool(
    "get_policy_status",
    {
      title: "Get policy status",
      description:
        "Look up a policy by (productId, policyId): coverage, strike, expiry, triggered/expired " +
        "state, and the minted bond epoch if it triggered. Read-only. " +
        "productId is required because policy ids are scoped per product.",
      inputSchema: {
        productId: z.string().regex(/^0x[0-9a-fA-F]{64}$/, "bytes32 productId required"),
        policyId: z.number().int().nonnegative(),
      },
    },
    async ({ productId, policyId }) => {
      try {
        const p = await api.get(`/api/v1/policies/${productId}/${policyId}`);
        return jsonResult(p);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
