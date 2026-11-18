// MyBot: the preview's own Telegram bots, one per agent, in memory.

import type { TelegramBotDesktopApi, TelegramBotStatus } from "@openbot/contracts/ipc";

export function createMockTelegramBot(): TelegramBotDesktopApi {
  const bots = new Map<string, TelegramBotStatus>();
  const status = (agentId: string): TelegramBotStatus =>
    bots.get(agentId) ?? {
      agentId,
      connection: null,
      botUsername: null,
      problem: null,
      allowedSenders: [],
      pendingRequests: [],
    };
  const update = (agentId: string, change: (bot: TelegramBotStatus) => TelegramBotStatus) => {
    const bot = bots.get(agentId);
    if (bot) bots.set(agentId, change(bot));
  };
  return {
    status: async ({ agentId }) => status(agentId),
    connect: async ({ agentId, token }) => {
      const botId = token.split(":")[0] ?? "1";
      const bot: TelegramBotStatus = {
        agentId,
        connection: {
          workspaceId: botId,
          platform: "telegram_bot",
          enabled: true,
          state: "connected",
          workspaceName: "@preview_agent_bot",
          botUserId: botId,
          missingScopes: [],
          retryAt: null,
          credentials: "saved",
          orchestratorAgentId: agentId,
        },
        botUsername: "preview_agent_bot",
        problem: null,
        allowedSenders: [{ id: "100200300", kind: "contact", name: "Preview owner" }],
        pendingRequests: [
          {
            code: "K7QW2M",
            senderId: "400500600",
            name: "Alex",
            expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          },
        ],
      };
      bots.set(agentId, bot);
      return bot;
    },
    disconnect: async ({ agentId }) => {
      bots.delete(agentId);
    },
    reconnect: async () => undefined,
    open: async () => undefined,
    removeSender: async ({ agentId, senderId }) =>
      update(agentId, (bot) => ({
        ...bot,
        allowedSenders: bot.allowedSenders.filter((sender) => sender.id !== senderId),
      })),
    answerRequest: async ({ agentId, code, approve }) =>
      update(agentId, (bot) => {
        const request = bot.pendingRequests.find((candidate) => candidate.code === code);
        return {
          ...bot,
          pendingRequests: bot.pendingRequests.filter((candidate) => candidate.code !== code),
          allowedSenders:
            approve && request
              ? [...bot.allowedSenders, { id: request.senderId, kind: "contact", name: request.name }]
              : bot.allowedSenders,
        };
      }),
  };
}
