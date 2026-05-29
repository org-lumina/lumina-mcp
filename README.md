# Lumina MCP Server

[![npm](https://img.shields.io/badge/npm-%40lumina--org%2Fmcp--server-CB3837?logo=npm)](https://www.npmjs.com/package/@lumina-org/mcp-server)
[![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-1.x-blue)](https://modelcontextprotocol.io)

Official **Model Context Protocol** server for **[Lumina Protocol](https://lumina-org.com)** —
parametric crypto insurance for AI agents and humans on **Base**.

Connect any MCP client (Claude Desktop, Cursor, Windsurf, Continue, …) and your
agent can browse insurance products, quote premiums, and **buy a policy in one
sentence** — starting with a zero-friction sandbox that needs **no wallet, no
gas, and no API key**.

> **Mainnet:** LIVE on Base mainnet (chainId 8453) since 2026-05-28 with
> Circle USDC. **Real funds are at risk** on the production path. A separate
> Base Sepolia sandbox (`buy_policy_sandbox` tool) runs on chain 84532 with
> mock USDC for zero-risk exploration — opt in by setting
> `LUMINA_CHAIN_ID=84532` + `LUMINA_RPC_URL=https://sepolia.base.org`.

---

## Quickstart (60 seconds)

Add Lumina to **Claude Desktop** — edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lumina": {
      "command": "npx",
      "args": ["-y", "@lumina-org/mcp-server"]
    }
  }
}
```

Restart Claude Desktop and ask:

> *"Use Lumina to buy a FLASHBTC1H policy."*

Claude will call `browse_products` → `quote_policy` → `buy_policy_sandbox` and
hand you back a real on-chain policy id + BaseScan link. Done.

### Other clients

**Cursor** (`~/.cursor/mcp.json`) / **Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{ "mcpServers": { "lumina": { "command": "npx", "args": ["-y", "@lumina-org/mcp-server"] } } }
```

**Continue** (`~/.continue/config.json` → `experimental.modelContextProtocolServers`):
```json
{ "transport": { "type": "stdio", "command": "npx", "args": ["-y", "@lumina-org/mcp-server"] } }
```

---

## Install

```bash
npm install -g @lumina-org/mcp-server   # or use npx (no install)
lumina-mcp                              # runs on stdio
```

## Configuration (env vars — all optional)

### Mainnet (production — default)

| Var | Default | Purpose |
|-----|---------|---------|
| `LUMINA_API_BASE` | `https://lumina-api-production-ac85.up.railway.app` | Lumina REST API base URL |
| `LUMINA_CHAIN_ID` | `8453` | EVM chain id (Base mainnet) |
| `LUMINA_API_KEY` | — | `lk_…` key for wallet-scoped reads (policies/bonds). [Get one](https://www.lumina-org.com/app/agent/api-keys) |
| `LUMINA_RPC_URL` | `https://mainnet.base.org` | RPC for the on-chain LUMINA price read |
| `LUMINA_EXPLORER` | `https://basescan.org` | Block explorer base for surfacing tx links |

The sandbox / quote / products / stats paths need **no key**.

### Sandbox (testnet — for development/exploration only)

Opt into the Base Sepolia sandbox by overriding the chain + RPC defaults.
**Sandbox uses mock USDC (`mUSDC` at `0xD944d8e5D8329994D83950872Ec210891d3Ab6AE`)
with no real value.** It exists to let AI agents exercise the full purchase →
trigger → bond → redeem flow without funds at risk.

```bash
export LUMINA_CHAIN_ID=84532
export LUMINA_RPC_URL=https://sepolia.base.org
export LUMINA_EXPLORER=https://sepolia.basescan.org
```

The `buy_policy_sandbox` tool always routes through the testnet sandbox
regardless of `LUMINA_CHAIN_ID` (it hits the API's `/sandbox/try` endpoint).

---

## Tools (11)

| Tool | What it does | Signs? |
|------|--------------|:------:|
| `browse_products` | List live insurance products (asset, trigger, window, payout) | no |
| `quote_policy` | Premium + payout for a coverage amount (no tx) | no |
| `buy_policy_sandbox` | **Buy a real policy with no wallet/gas/key** (relayer-funded) | no |
| `buy_policy_real` | Build **unsigned** approve + purchasePolicy txs | client |
| `get_policy_status` | Policy state by (productId, policyId) | no |
| `get_bond_balance` | Bonds held by a wallet (needs API key) | no |
| `redeem_bond` | Build **unsigned** BondVault.redeemBond tx | client |
| `marketplace_list` | Build **unsigned** list-bond txs | client |
| `marketplace_buy` | Build **unsigned** buy-listing tx | client |
| `watch_triggers` | Trigger condition + window per product | no |
| `get_protocol_stats` | Chain, relayer gas, contracts, product count, LUMINA price | no |

## Resources (4)

- `lumina://products` — live product catalog
- `lumina://stats` — live protocol health/contracts
- `lumina://policies/{walletAddress}` — policies for a wallet (needs API key)
- `lumina://bonds/{walletAddress}` — bonds for a wallet (needs API key)

## Prompts (3)

- `first_policy` — guided 4-step first purchase (sandbox)
- `compare_products` — compare all products for a scenario
- `monitor_portfolio` — dashboard of policies/bonds/approaching triggers

---

## Security model

- **The server never holds or asks for a private key.** Every write action
  (`buy_policy_real`, `redeem_bond`, `marketplace_*`) returns an **unsigned**
  transaction `{ chainId, to, data, value }` for your wallet/agent to sign and
  broadcast.
- **Sandbox is the default** zero-friction path — a real on-chain purchase via
  Lumina's relayer, no funds at risk.
- Contract addresses are resolved **live from `/health`** so a redeploy never
  strands you on a stale address.
- Every tool validates input with **zod**.

## Example session

```
You:    What Lumina products can I insure BTC with?
Claude: (browse_products) → Flash BTC 1h / 24h / 48h, 80% payout, $100 min.
You:    Quote $100 of the 1h one.
Claude: (quote_policy) → premium $0.29, payout $80 if BTC drops ≥2.5% in 1h.
You:    Buy it.
Claude: (buy_policy_sandbox) → policyId 7, tx 0x… (BaseScan link). You're covered.
```

## Development

```bash
npm install
npm run build        # tsc -> dist/
npm test             # vitest: 11 tests (in-memory MCP client + mocked API)
npm run dev          # tsx src/index.ts (stdio)
```

## Links

- Protocol: https://lumina-org.com · Docs: https://docs.lumina-org.com/mcp
- Skills: https://lumina-org.com/skills · SDK: [`@lumina-org/sdk`](https://www.npmjs.com/package/@lumina-org/sdk)
- MCP spec: https://modelcontextprotocol.io

## License

MIT
