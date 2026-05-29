import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/index.js";

// ── Deterministic fake of the Lumina REST API (also intercepts ethers RPC) ──
const PRODUCT_ID = "0x" + "ab".repeat(32);
function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );

  if (url.endsWith("/products")) {
    return json({
      count: 1,
      products: [
        {
          productId: PRODUCT_ID,
          name: "FLASHBTC1H-001",
          displayName: "Flash BTC 1h",
          coveredAsset: "BTC",
          paymentAsset: "USDC",
          coverageDescription: "Insures BTC against rapid price crashes within 1 hour",
          payoutRatioBps: 8000,
          triggerProbBps: 18,
          marginBps: 20000,
          durationSeconds: 3600,
          active: true,
        },
      ],
    });
  }
  if (url.includes("/quote")) return json({ premium: "288000", payout: "80000000" });
  if (url.endsWith("/sandbox/try"))
    return json({ policyId: 7, txHash: "0xabc", productId: PRODUCT_ID, coverageAmount: "100000000", premiumPaid: "288000" }, 201);
  if (url.endsWith("/health"))
    return json({
      version: "0.1.0",
      chain: { chainId: 8453, block: 46608500 },
      relayer: { address: "0x" + "11".repeat(20), balanceWei: "200000000000000000" },
      contracts: {
        coverRouter: "0x" + "c0".repeat(20),
        policyManager: "0x" + "c1".repeat(20),
        bondVault: "0x" + "c2".repeat(20),
        claimBond: "0x" + "c3".repeat(20),
        marketplace: "0x" + "c4".repeat(20),
        usdc: "0x" + "c5".repeat(20),
        luminaToken: "0x" + "c6".repeat(20),
      },
    });
  if (url.includes("/marketplace/stats")) return json({ floor: null, totalListings: 0 });
  // ethers JSON-RPC (price read) — return an error body so the tool degrades gracefully
  return json({ error: "no rpc in test" }, 500);
}

let client: Client;
beforeEach(async () => {
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  const server = createServer();
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterEach(() => vi.unstubAllGlobals());

describe("MCP surface", () => {
  it("exposes 11 tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBe(11);
    expect(tools.map((t) => t.name)).toContain("buy_policy_sandbox");
  });
  it("exposes resources + templates", async () => {
    const res = await client.listResources();
    const tmpl = await client.listResourceTemplates();
    const all = [...res.resources.map((r) => r.uri), ...tmpl.resourceTemplates.map((t) => t.uriTemplate)];
    expect(all).toContain("lumina://products");
    expect(all).toContain("lumina://stats");
    expect(all.some((u) => u.includes("policies/{walletAddress}"))).toBe(true);
    expect(all.some((u) => u.includes("bonds/{walletAddress}"))).toBe(true);
  });
  it("exposes 3 prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(
      ["compare_products", "first_policy", "monitor_portfolio"],
    );
  });
});

describe("tools", () => {
  const text = (r: any) => r.content[0].text as string;

  it("browse_products returns the active product", async () => {
    const r = await client.callTool({ name: "browse_products", arguments: {} });
    const out = JSON.parse(text(r));
    expect(out.count).toBe(1);
    expect(out.products[0].name).toBe("FLASHBTC1H-001");
    expect(out.products[0].payoutRatio).toBe("80%");
  });

  it("quote_policy resolves a friendly name and returns premium/payout", async () => {
    const r = await client.callTool({
      name: "quote_policy",
      arguments: { product: PRODUCT_ID, coverageUSD: 100 },
    });
    const out = JSON.parse(text(r));
    expect(out.premiumBaseUnits).toBe("288000");
    expect(out.payoutBaseUnits).toBe("80000000");
  });

  it("quote_policy rejects coverage below $100 (zod)", async () => {
    const r: any = await client.callTool({
      name: "quote_policy",
      arguments: { product: PRODUCT_ID, coverageUSD: 50 },
    });
    expect(r.isError).toBe(true);
  });

  it("buy_policy_sandbox returns a policyId + txHash", async () => {
    const r = await client.callTool({ name: "buy_policy_sandbox", arguments: {} });
    const out = JSON.parse(text(r));
    expect(out.policyId).toBe(7);
    expect(out.txHash).toBe("0xabc");
    expect(out.sandbox).toBe(true);
  });

  it("buy_policy_real returns 2 unsigned txs with valid calldata", async () => {
    const r = await client.callTool({
      name: "buy_policy_real",
      arguments: { product: PRODUCT_ID, coverageUSD: 100, walletAddress: "0x" + "ab".repeat(20) },
    });
    const out = JSON.parse(text(r));
    expect(out.unsignedTransactions).toHaveLength(2);
    expect(out.unsignedTransactions[0].data).toMatch(/^0x[0-9a-f]+$/);
    expect(out.unsignedTransactions[0].chainId).toBe(8453);
  });

  it("redeem_bond returns one unsigned tx", async () => {
    const r = await client.callTool({
      name: "redeem_bond",
      arguments: { epochId: 202605, usdAmount: 80, walletAddress: "0x" + "ab".repeat(20) },
    });
    const out = JSON.parse(text(r));
    expect(out.unsignedTransaction.to).toBeDefined();
    expect(out.unsignedTransaction.data).toMatch(/^0x/);
  });

  it("get_protocol_stats degrades gracefully when price RPC fails", async () => {
    const r = await client.callTool({ name: "get_protocol_stats", arguments: {} });
    const out = JSON.parse(text(r));
    expect(out.chain.chainId).toBe(8453);
    expect(out.products.active).toBe(1);
    expect(typeof out.luminaPriceUsd).toBe("string");
  });

  it("watch_triggers lists trigger specs", async () => {
    const r = await client.callTool({ name: "watch_triggers", arguments: {} });
    const out = JSON.parse(text(r));
    expect(out.count).toBe(1);
    expect(out.triggers[0].coveredAsset).toBe("BTC");
  });
});
