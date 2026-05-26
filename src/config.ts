/**
 * Runtime configuration for the Lumina MCP server.
 *
 * Everything is overridable via environment variables so the same binary works
 * against the public testnet API (default), a local dev API, or a future
 * mainnet deployment. The server NEVER reads or stores a private key — write
 * actions return an unsigned transaction for the MCP client to sign.
 */
export const CONFIG = {
  /** Lumina REST API base URL. */
  apiBase: process.env.LUMINA_API_BASE?.replace(/\/$/, "") ??
    "https://lumina-api-production-ac85.up.railway.app",
  /** EVM chain id of the active deployment (Base Sepolia by default). */
  chainId: Number(process.env.LUMINA_CHAIN_ID ?? 84532),
  /**
   * Optional API key (lk_…) for authenticated read endpoints (policies/bonds by
   * wallet). Read tools degrade gracefully when it is absent; the server itself
   * never needs a key for the sandbox/quote/products/stats path.
   */
  apiKey: process.env.LUMINA_API_KEY,
  /** Block explorer base for surfacing tx links. */
  explorer: process.env.LUMINA_EXPLORER ?? "https://sepolia.basescan.org",
} as const;

export const SERVER_INFO = {
  name: "lumina-mcp",
  version: "0.1.0",
} as const;
