import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCompareProductsPrompt(server: McpServer) {
  server.registerPrompt(
    "compare_products",
    {
      title: "Compare Lumina products",
      description: "Compare all products by premium, trigger, window and payout for a scenario.",
      argsSchema: {
        scenario: z
          .string()
          .describe("The risk scenario to optimize for, e.g. 'short-term BTC flash-crash hedge'."),
      },
    },
    ({ scenario }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Compare all Lumina products for this scenario: "${scenario}".`,
              "Use browse_products to fetch them, then for a representative $100 coverage call",
              "quote_policy on each and build a table comparing: premium %, trigger condition,",
              "window duration, and payout ratio. Then recommend the single best product for the",
              "scenario and justify the choice in 2-3 sentences.",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
