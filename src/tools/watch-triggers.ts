import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { jsonResult, errorResult } from "../lib/format.js";

interface Product {
  productId: string;
  name: string | null;
  coveredAsset: string;
  coverageDescription: string;
  triggerProbBps: number;
  durationSeconds: number;
  active: boolean;
}

export function registerWatchTriggers(server: McpServer) {
  server.registerTool(
    "watch_triggers",
    {
      title: "Watch product trigger conditions",
      description:
        "Return the trigger condition and coverage window for each product (optionally filtered " +
        "to a list of product names). Use this to monitor what would cause a payout. Note: live " +
        "barrier-breach state is evaluated on-chain by each shield's multi-block confirmation gate; " +
        "this returns the trigger SPEC + modeled trigger probability, not a live oracle reading.",
      inputSchema: {
        products: z
          .array(z.string())
          .optional()
          .describe("Optional list of product names to filter (default: all active)."),
      },
    },
    async ({ products }) => {
      try {
        const data = await api.get<{ products: Product[] }>("/products");
        const want = products?.map((s) => s.toUpperCase());
        const rows = (data.products ?? [])
          .filter((p) => p.active && (!want || (p.name && want.includes(p.name.toUpperCase()))))
          .map((p) => ({
            product: p.name,
            coveredAsset: p.coveredAsset,
            triggerCondition: p.coverageDescription,
            windowHours: Math.round(p.durationSeconds / 3600),
            modeledTriggerProbability: `${(p.triggerProbBps / 100).toFixed(2)}%`,
            liveBreachStatus:
              "evaluate on-chain via the shield's confirmation gate (3 spaced sub-barrier observations)",
          }));
        return jsonResult({ count: rows.length, triggers: rows });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
