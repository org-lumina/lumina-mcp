import { z } from "zod";
import { ethers } from "ethers";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { jsonResult, errorResult, usdc } from "../lib/format.js";

const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

/** Resolve a friendly name (e.g. "FLASHBTC1H-001") or bytes32 to a bytes32 productId. */
async function resolveProductId(idOrName: string): Promise<string> {
  if (BYTES32.test(idOrName)) return idOrName;
  // Canonical productId = keccak256(utf8(name)). Verify it exists in /products.
  const computed = ethers.keccak256(ethers.toUtf8Bytes(idOrName));
  const data = await api.get<{ products: { productId: string }[] }>("/products");
  const hit = data.products?.find((p) => p.productId.toLowerCase() === computed.toLowerCase());
  if (!hit) throw new Error(`Unknown product "${idOrName}". Call browse_products to list valid products.`);
  return hit.productId;
}

export function registerQuotePolicy(server: McpServer) {
  server.registerTool(
    "quote_policy",
    {
      title: "Quote a policy premium",
      description:
        "Get the premium and payout for a coverage amount, with NO on-chain transaction. " +
        "Accepts a bytes32 productId or a canonical product name (e.g. FLASHBTC1H-001). " +
        "Coverage minimum is $100 (100000000 base units).",
      inputSchema: {
        product: z.string().describe("bytes32 productId or canonical name, e.g. FLASHBTC1H-001"),
        coverageUSD: z
          .number()
          .min(100)
          .describe("Coverage in whole USD (>= 100). Converted to 6-dec USDC base units."),
      },
    },
    async ({ product, coverageUSD }) => {
      try {
        const productId = await resolveProductId(product);
        const coverageAmount = BigInt(Math.round(coverageUSD * 1e6)).toString();
        const q = await api.get<{ premium: string; payout: string }>(
          `/products/${productId}/quote?coverageAmount=${coverageAmount}`,
        );
        return jsonResult({
          productId,
          coverageUSD,
          coverageBaseUnits: coverageAmount,
          premium: usdc(q.premium),
          premiumBaseUnits: q.premium,
          payoutIfTriggered: usdc(q.payout),
          payoutBaseUnits: q.payout,
          note: "No transaction was sent. This is a read-only quote.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
