import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildBuyListingTx } from "../lib/tx.js";
import { jsonResult, errorResult } from "../lib/format.js";

export function registerMarketplaceBuy(server: McpServer) {
  server.registerTool(
    "marketplace_buy",
    {
      title: "Buy a listed bond from the marketplace (unsigned tx)",
      description:
        "Build the UNSIGNED Marketplace.executeBuy transaction for a listing. You must first " +
        "USDC.approve the marketplace for (price + 1.5% buyer fee). Browse listings via the " +
        "lumina://stats resource or the marketplace listings endpoint. The server does not sign.",
      inputSchema: {
        listingId: z.number().int().nonnegative().describe("The marketplace listing id to fill."),
        walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      },
    },
    async ({ listingId, walletAddress }) => {
      try {
        const tx = await buildBuyListingTx({ listingId });
        return jsonResult({
          action: "marketplace_buy",
          buyer: walletAddress,
          listingId,
          unsignedTransaction: tx,
          signingInstructions:
            "Ensure USDC allowance to the marketplace covers price + 1.5% buyer fee, then sign and send.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
