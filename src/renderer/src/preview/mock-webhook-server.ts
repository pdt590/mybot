// MyBot: the preview's own webhook server, in memory.

import type { WebhookServerDesktopApi, WebhookServerStatus } from "@openbot/contracts/ipc";

export function createMockWebhookServer(): WebhookServerDesktopApi {
  let status: WebhookServerStatus = {
    bindAddress: "127.0.0.1",
    port: 47811,
    publicUrl: null,
    enabled: true,
    listening: true,
    problem: null,
    baseUrl: "http://127.0.0.1:47811",
  };
  return {
    status: async () => status,
    save: async (settings) => {
      status = {
        ...status,
        ...settings,
        baseUrl: settings.publicUrl?.replace(/\/+$/u, "") ?? `http://127.0.0.1:${settings.port}`,
      };
      return status;
    },
  };
}
