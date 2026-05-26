import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { jsonResult, errorResult } from "../lib/format.js";
import { CONFIG } from "../config.js";

export function registerBuyPolicySandbox(server: McpServer) {
  server.registerTool(
    "buy_policy_sandbox",
    {
      title: "Buy a policy (sandbox — no wallet, no gas)",
      description:
        "Execute a REAL on-chain policy purchase against Lumina's shared sandbox wallet. " +
        "ZERO requirements: no wallet, no API key, no gas — the relayer pays. " +
        "This is the DEFAULT, zero-friction way to try Lumina. Rate-limited to 10/hour per IP.",
      inputSchema: {
        productName: z
          .string()
          .default("FLASHBTC1H-001")
          .describe("Canonical product name. Defaults to FLASHBTC1H-001 (shortest/cheapest)."),
      },
    },
    async ({ productName }) => {
      try {
        const r = await api.post<{
          policyId: number;
          txHash: string;
          productId: string;
          coverageAmount: string;
          premiumPaid: string;
          blockExplorer?: string;
        }>("/sandbox/try", { productName });
        return jsonResult({
          ok: true,
          sandbox: true,
          policyId: r.policyId,
          productId: r.productId,
          coverageAmount: r.coverageAmount,
          premiumPaid: r.premiumPaid,
          txHash: r.txHash,
          explorer: r.blockExplorer ?? `${CONFIG.explorer}/tx/${r.txHash}`,
          next: "Use get_policy_status with this productId + policyId to inspect the policy.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
