import { z } from "zod";
import { ethers } from "ethers";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api } from "../api.js";
import { buildPurchaseTxs } from "../lib/tx.js";
import { jsonResult, errorResult } from "../lib/format.js";

const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

export function registerBuyPolicyReal(server: McpServer) {
  server.registerTool(
    "buy_policy_real",
    {
      title: "Buy a policy with your own wallet (unsigned tx)",
      description:
        "Build the UNSIGNED transactions for a self-funded policy purchase (USDC approve + " +
        "purchasePolicy). This server NEVER signs or holds keys — the returned txs must be " +
        "signed and broadcast by your wallet. For a zero-friction trial use buy_policy_sandbox instead.",
      inputSchema: {
        product: z.string().describe("bytes32 productId or canonical name (e.g. FLASHBTC1H-001)"),
        coverageUSD: z.number().min(100).describe("Coverage in whole USD (>= 100)."),
        walletAddress: z
          .string()
          .regex(/^0x[0-9a-fA-F]{40}$/)
          .describe("The buyer wallet that will sign and pay the premium."),
      },
    },
    async ({ product, coverageUSD, walletAddress }) => {
      try {
        // Resolve product + asset symbol from /products.
        const data = await api.get<{
          products: { productId: string; coveredAsset: string }[];
        }>("/products");
        const productId = BYTES32.test(product)
          ? product
          : ethers.keccak256(ethers.toUtf8Bytes(product));
        const meta = data.products?.find(
          (p) => p.productId.toLowerCase() === productId.toLowerCase(),
        );
        if (!meta) throw new Error(`Unknown product "${product}". Call browse_products.`);

        const coverageAmount = BigInt(Math.round(coverageUSD * 1e6));
        const txs = await buildPurchaseTxs({
          productId: meta.productId,
          coverageAmount,
          assetSymbol: meta.coveredAsset,
        });
        return jsonResult({
          action: "buy_policy_real",
          buyer: walletAddress,
          productId: meta.productId,
          coveredAsset: meta.coveredAsset,
          coverageUSD,
          unsignedTransactions: txs,
          signingInstructions:
            "Sign and send these txs IN ORDER from your wallet (#1 approve, then #2 purchasePolicy). " +
            "This MCP server does not sign — your wallet/agent must. Quote the premium first with quote_policy.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
