import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { jsonResult, errorResult, usdc } from "../lib/format.js";

interface Product {
  productId: string;
  name: string | null;
  displayName: string;
  coveredAsset: string;
  paymentAsset: string;
  coverageDescription: string;
  payoutRatioBps: number;
  triggerProbBps: number;
  marginBps: number;
  durationSeconds: number;
  active: boolean;
}

export function registerBrowseProducts(server: McpServer) {
  server.registerTool(
    "browse_products",
    {
      title: "Browse Lumina insurance products",
      description:
        "List the live Lumina parametric-insurance products (flash crash shields on BTC/ETH). " +
        "Returns each product's id, covered asset, trigger description, coverage window and payout ratio. " +
        "Read-only, no wallet required.",
      inputSchema: {
        activeOnly: z
          .boolean()
          .default(true)
          .describe("If true (default), only return products currently open for purchase."),
      },
    },
    async ({ activeOnly }) => {
      try {
        const data = await api.get<{ count: number; products: Product[] }>("/products");
        const products = (data.products ?? []).filter((p) => (activeOnly ? p.active : true));
        const view = products.map((p) => ({
          productId: p.productId,
          name: p.name,
          displayName: p.displayName,
          coveredAsset: p.coveredAsset,
          paymentAsset: p.paymentAsset,
          coverage: p.coverageDescription,
          windowHours: Math.round(p.durationSeconds / 3600),
          payoutRatio: `${p.payoutRatioBps / 100}%`,
          deductible: `${(10000 - p.payoutRatioBps) / 100}%`,
          active: p.active,
          minCoverage: usdc(100_000_000), // $100 on-chain minimum (CoverRouterV2)
        }));
        return jsonResult({ count: view.length, products: view });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
