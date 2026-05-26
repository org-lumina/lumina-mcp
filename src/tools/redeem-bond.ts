import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildRedeemTx } from "../lib/tx.js";
import { jsonResult, errorResult } from "../lib/format.js";

export function registerRedeemBond(server: McpServer) {
  server.registerTool(
    "redeem_bond",
    {
      title: "Redeem a matured bond (unsigned tx)",
      description:
        "Build the UNSIGNED BondVault.redeemBond transaction. The server does not sign — your " +
        "wallet must. Bond must be matured (check get_bond_balance). Redemption is paid in LUMINA " +
        "and may be throttled/queued per-epoch.",
      inputSchema: {
        epochId: z.number().int().describe("ClaimBond maturity epoch (YYYYMM), e.g. 202605."),
        usdAmount: z
          .number()
          .int()
          .positive()
          .describe("USD face value to redeem, in whole dollars (integer)."),
        walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      },
    },
    async ({ epochId, usdAmount, walletAddress }) => {
      try {
        const tx = await buildRedeemTx({ epochId, usdAmount: BigInt(usdAmount) });
        return jsonResult({
          action: "redeem_bond",
          holder: walletAddress,
          epochId,
          usdAmount,
          unsignedTransaction: tx,
          signingInstructions:
            "Sign and send from the holder wallet. If over the per-epoch redemption cap the bond is " +
            "burned and queued (FIFO), paid when processQueue runs — not reverted.",
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
