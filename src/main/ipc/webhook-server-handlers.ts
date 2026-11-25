// MyBot: the settings of the app's own webhook server (`local-webhook-server.ts`), on this computer only.

import { parseWebhookServerSettings } from "@openbot/contracts/ipc";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { LocalWebhookServer } from "../local-webhook-server";
import { handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

export interface WebhookServerIpcDependencies {
  webhookServer: Pick<LocalWebhookServer, "status" | "save">;
}

export function webhookServerIpcHandlers({
  webhookServer,
}: WebhookServerIpcDependencies): Pick<IpcGroupHandlers, "webhookServer"> {
  return {
    webhookServer: {
      status: handler(() => webhookServer.status()),
      save: payloadHandler(parseWebhookServerSettings, (settings) => runCauseEffect(webhookServer.save(settings))),
    },
  };
}
