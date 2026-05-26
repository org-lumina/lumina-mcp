import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerFirstPolicyPrompt(server: McpServer) {
  server.registerPrompt(
    "first_policy",
    {
      title: "Buy your first Lumina policy",
      description: "Guided 4-step flow to buy a first policy with zero friction (sandbox).",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              "Help me buy my first Lumina insurance policy in 4 steps. Use the Lumina MCP tools:",
              "1. Call browse_products to show the available products.",
              "2. Call quote_policy for FLASHBTC1H-001 with $100 coverage and explain the premium vs payout.",
              "3. Call buy_policy_sandbox (no wallet, no gas) to actually purchase it.",
              "4. Call get_policy_status with the returned productId + policyId and summarize what I now hold.",
              "Keep it concise and confirm each step before moving on.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
