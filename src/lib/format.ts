/** Shared helpers for MCP tool results. */

/** Wrap a JSON-serializable value as an MCP text content block (pretty JSON). */
export function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** Wrap plain text. */
export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** Wrap an error as an MCP tool error result (isError) with a clean message. */
export function errorResult(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true as const,
  };
}

/** USDC base units (6-dec) -> human "$X.XX" string. */
export function usdc(baseUnits: string | number | bigint): string {
  const n = Number(baseUnits) / 1e6;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
