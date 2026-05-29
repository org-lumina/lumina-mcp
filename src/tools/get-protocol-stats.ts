import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ethers } from "ethers";
import { api } from "../api.js";
import { CONFIG } from "../config.js";
import { jsonResult, errorResult } from "../lib/format.js";

/** Best-effort on-chain LUMINA price ($, 18-dec) via BondVault.priceOracle().getLuminaPrice(). */
async function tryLuminaPrice(bondVault: string): Promise<string | null> {
  try {
    const rpc = process.env.LUMINA_RPC_URL ?? "https://mainnet.base.org";
    const provider = new ethers.JsonRpcProvider(rpc);
    const bv = new ethers.Contract(bondVault, ["function priceOracle() view returns (address)"], provider);
    const oracleAddr: string = await bv.priceOracle();
    const oracle = new ethers.Contract(
      oracleAddr,
      ["function getLuminaPrice() view returns (uint256)"],
      provider,
    );
    const p: bigint = await oracle.getLuminaPrice();
    return `$${(Number(p) / 1e18).toFixed(4)}`;
  } catch {
    return null;
  }
}

export function registerGetProtocolStats(server: McpServer) {
  server.registerTool(
    "get_protocol_stats",
    {
      title: "Get live protocol stats",
      description:
        "Snapshot of Lumina: chain/block, relayer gas balance, canonical contract addresses, " +
        "active product count, marketplace stats, and (best-effort) the on-chain LUMINA price. Read-only.",
      inputSchema: {},
    },
    async () => {
      try {
        const [health, products] = await Promise.all([
          api.get<{
            chain: { chainId: number; block: number };
            relayer: { address: string; balanceWei: string };
            contracts: Record<string, string>;
            version: string;
          }>("/health"),
          api.get<{ count: number; products: { active: boolean }[] }>("/products"),
        ]);
        let marketplace: unknown = null;
        try {
          marketplace = await api.get("/api/v1/marketplace/stats");
        } catch {
          /* optional */
        }
        const luminaPrice = await tryLuminaPrice(health.contracts.bondVault);
        const activeProducts = (products.products ?? []).filter((p) => p.active).length;
        return jsonResult({
          apiVersion: health.version,
          chain: health.chain,
          relayer: {
            address: health.relayer.address,
            gasBalanceEth: (Number(health.relayer.balanceWei) / 1e18).toFixed(4),
          },
          products: { total: products.count, active: activeProducts },
          luminaPriceUsd: luminaPrice ?? "unavailable (on-chain read failed)",
          marketplace,
          contracts: health.contracts,
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
