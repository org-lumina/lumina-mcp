#!/usr/bin/env node
/**
 * Lumina Protocol — official MCP server.
 *
 * Exposes Lumina's parametric-insurance protocol (Base) to any MCP client
 * (Claude Desktop, Cursor, Windsurf, Continue, …) as tools + resources + prompts.
 *
 * Safety model:
 *  - NEVER handles private keys. Write actions return UNSIGNED transactions for
 *    the client's wallet to sign.
 *  - The sandbox purchase (no wallet / no gas) is the default zero-friction path.
 *  - Contract addresses are resolved live from /health (redeploy-proof).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_INFO } from "./config.js";

import { registerBrowseProducts } from "./tools/browse-products.js";
import { registerQuotePolicy } from "./tools/quote-policy.js";
import { registerBuyPolicySandbox } from "./tools/buy-policy-sandbox.js";
import { registerBuyPolicyReal } from "./tools/buy-policy-real.js";
import { registerGetPolicyStatus } from "./tools/get-policy-status.js";
import { registerGetBondBalance } from "./tools/get-bond-balance.js";
import { registerRedeemBond } from "./tools/redeem-bond.js";
import { registerMarketplaceList } from "./tools/marketplace-list.js";
import { registerMarketplaceBuy } from "./tools/marketplace-buy.js";
import { registerWatchTriggers } from "./tools/watch-triggers.js";
import { registerGetProtocolStats } from "./tools/get-protocol-stats.js";

import { registerProductsResource } from "./resources/products.js";
import { registerPoliciesResource } from "./resources/policies.js";
import { registerBondsResource } from "./resources/bonds.js";
import { registerStatsResource } from "./resources/stats.js";

import { registerFirstPolicyPrompt } from "./prompts/first-policy.js";
import { registerCompareProductsPrompt } from "./prompts/compare-products.js";
import { registerMonitorPortfolioPrompt } from "./prompts/monitor-portfolio.js";

/** Build a fully-wired server instance (exported for tests). */
export function createServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  // Tools (11)
  registerBrowseProducts(server);
  registerQuotePolicy(server);
  registerBuyPolicySandbox(server);
  registerBuyPolicyReal(server);
  registerGetPolicyStatus(server);
  registerGetBondBalance(server);
  registerRedeemBond(server);
  registerMarketplaceList(server);
  registerMarketplaceBuy(server);
  registerWatchTriggers(server);
  registerGetProtocolStats(server);

  // Resources (4)
  registerProductsResource(server);
  registerPoliciesResource(server);
  registerBondsResource(server);
  registerStatsResource(server);

  // Prompts (3)
  registerFirstPolicyPrompt(server);
  registerCompareProductsPrompt(server);
  registerMonitorPortfolioPrompt(server);

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP transport.
  process.stderr.write("lumina-mcp server running on stdio\n");
}

// Run only when invoked directly (not when imported by tests).
import { fileURLToPath } from "node:url";
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`Fatal: ${(e as Error).message}\n`);
    process.exit(1);
  });
}
