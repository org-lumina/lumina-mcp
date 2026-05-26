import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildListTxs } from "../lib/tx.js";
import { jsonResult, errorResult } from "../lib/format.js";

export function registerMarketplaceList(server: McpServer) {
  server.registerTool(
    "marketplace_list",
    {
      title: "List a bond on the marketplace (unsigned tx)",
      description:
        "Build the UNSIGNED transactions to list a ClaimBond for sale (ERC-1155 setApprovalForAll " +
        "+ Marketplace.list). Listings are priced in USDC base units. Fill fee is 3% (1.5% seller + " +
        "1.5% buyer). The server does not sign — your wallet must.",
      inputSchema: {
        epochId: z.number().int().describe("Bond epoch (YYYYMM) to sell."),
        amount: z.number().int().positive().describe("Number of bond units (USD face) to list."),
        priceUSDC: z
          .number()
          .positive()
          .describe("Total ask price in whole USDC (converted to 6-dec base units)."),
        walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      },
    },
    async ({ epochId, amount, priceUSDC, walletAddress }) => {
      try {
        const txs = await buildListTxs({
          epochId,
          amount: BigInt(amount),
          priceUSDC: BigInt(Math.round(priceUSDC * 1e6)),
        });
        return jsonResult({
          action: "marketplace_list",
          seller: walletAddress,
          epochId,
          amount,
          priceUSDC,
          unsignedTransactions: txs,
          signingInstructions:
            "Send #1 (setApprovalForAll, one-time) then #2 (list) from the seller wallet.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
