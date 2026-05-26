/**
 * Unsigned-transaction builder.
 *
 * SECURITY: this server NEVER holds a private key. Every write action returns a
 * fully-formed but UNSIGNED EVM transaction `{ chainId, to, data, value }` plus
 * a human-readable description. The MCP client (the agent's wallet) signs and
 * broadcasts it. Addresses are resolved at call time from `/health` so a
 * contract redeploy never strands callers on a stale address.
 */
import { ethers } from "ethers";
import { CONFIG } from "../config.js";
import { getContracts } from "../api.js";

// Minimal ABIs for the functions we encode (verified against the deployed contracts).
const IFACE = {
  coverRouter: new ethers.Interface([
    "function purchasePolicy(bytes32 productId, uint256 coverageAmount, bytes32 asset) returns (uint256)",
  ]),
  bondVault: new ethers.Interface([
    "function redeemBond(uint256 epochId, uint256 usdAmount)",
  ]),
  marketplace: new ethers.Interface([
    "function list(uint256 epochId, uint256 amount, uint256 priceUSDC)",
    "function executeBuy(uint256 listingId)",
    "function cancel(uint256 listingId)",
  ]),
  erc20: new ethers.Interface([
    "function approve(address spender, uint256 amount) returns (bool)",
  ]),
  erc1155: new ethers.Interface([
    "function setApprovalForAll(address operator, bool approved)",
  ]),
};

export interface UnsignedTx {
  chainId: number;
  to: string;
  data: string;
  value: string;
  description: string;
}

/** Encode `bytes32` asset literal the shields validate (e.g. "BTC" -> 0x4254..). */
export function assetBytes32(symbol: string): string {
  return ethers.encodeBytes32String(symbol);
}

/**
 * Build the ordered unsigned txs for a REAL (self-signed) policy purchase:
 *   1. USDC.approve(coverRouter, premium-or-coverage)  (one-time / per-amount)
 *   2. CoverRouter.purchasePolicy(productId, coverage, asset)
 * Premium is pulled inside purchasePolicy, so the approval target is the premium;
 * we approve `coverageAmount` defensively (>= premium) and note it.
 */
export async function buildPurchaseTxs(args: {
  productId: string;
  coverageAmount: bigint;
  assetSymbol: string;
}): Promise<UnsignedTx[]> {
  const c = await getContracts();
  const approve: UnsignedTx = {
    chainId: CONFIG.chainId,
    to: c.usdc,
    data: IFACE.erc20.encodeFunctionData("approve", [c.coverRouter, args.coverageAmount]),
    value: "0x0",
    description:
      `Approve CoverRouter (${c.coverRouter}) to pull up to ${args.coverageAmount} USDC base units for the premium.`,
  };
  const buy: UnsignedTx = {
    chainId: CONFIG.chainId,
    to: c.coverRouter,
    data: IFACE.coverRouter.encodeFunctionData("purchasePolicy", [
      args.productId,
      args.coverageAmount,
      assetBytes32(args.assetSymbol),
    ]),
    value: "0x0",
    description:
      `CoverRouter.purchasePolicy(productId=${args.productId}, coverage=${args.coverageAmount}, asset=${args.assetSymbol}). Premium is pulled from your wallet in USDC.`,
  };
  return [approve, buy];
}

export async function buildRedeemTx(args: {
  epochId: number;
  usdAmount: bigint;
}): Promise<UnsignedTx> {
  const c = await getContracts();
  return {
    chainId: CONFIG.chainId,
    to: c.bondVault,
    data: IFACE.bondVault.encodeFunctionData("redeemBond", [args.epochId, args.usdAmount]),
    value: "0x0",
    description:
      `BondVault.redeemBond(epochId=${args.epochId}, usdAmount=${args.usdAmount}). Bond must be matured; call get_bond_balance first. Redemption may be throttled/queued.`,
  };
}

export async function buildListTxs(args: {
  epochId: number;
  amount: bigint;
  priceUSDC: bigint;
}): Promise<UnsignedTx[]> {
  const c = await getContracts();
  const approveBonds: UnsignedTx = {
    chainId: CONFIG.chainId,
    to: c.claimBond,
    data: IFACE.erc1155.encodeFunctionData("setApprovalForAll", [c.marketplace, true]),
    value: "0x0",
    description:
      `One-time: ClaimBond.setApprovalForAll(marketplace=${c.marketplace}, true) so the marketplace can escrow your bonds.`,
  };
  const list: UnsignedTx = {
    chainId: CONFIG.chainId,
    to: c.marketplace,
    data: IFACE.marketplace.encodeFunctionData("list", [
      args.epochId,
      args.amount,
      args.priceUSDC,
    ]),
    value: "0x0",
    description:
      `Marketplace.list(epochId=${args.epochId}, amount=${args.amount}, priceUSDC=${args.priceUSDC}). Note: listings are priced in USDC base units, not LUMINA. Fee on fill = 3% (1.5% seller + 1.5% buyer).`,
  };
  return [approveBonds, list];
}

export async function buildBuyListingTx(args: { listingId: number }): Promise<UnsignedTx> {
  const c = await getContracts();
  return {
    chainId: CONFIG.chainId,
    to: c.marketplace,
    data: IFACE.marketplace.encodeFunctionData("executeBuy", [args.listingId]),
    value: "0x0",
    description:
      `Marketplace.executeBuy(listingId=${args.listingId}). You must first USDC.approve the marketplace for (price + 1.5% buyer fee).`,
  };
}
