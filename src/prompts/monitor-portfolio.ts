import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMonitorPortfolioPrompt(server: McpServer) {
  server.registerPrompt(
    "monitor_portfolio",
    {
      title: "Monitor my Lumina portfolio",
      description: "Summarize active policies, bonds and approaching triggers for a wallet.",
      argsSchema: {
        walletAddress: z.string().describe("The wallet to monitor (0x…)."),
      },
    },
    ({ walletAddress }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Monitor the Lumina portfolio for wallet ${walletAddress}:`,
              `- Read lumina://policies/${walletAddress} and list active policies with time-to-expiry.`,
              `- Read lumina://bonds/${walletAddress} and list bonds with time-to-maturity and redeemable status.`,
              "- Call watch_triggers for the relevant products and flag any trigger condition that looks close.",
              "Summarize as a short dashboard and call out anything that needs action (expiring soon, redeemable now).",
            ].join("\n"),
          },
        },
      ],
    }),
  );
}
