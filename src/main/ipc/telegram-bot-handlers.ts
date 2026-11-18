// MyBot: the own Telegram bot of each agent of this computer. The token comes in once, in `connect`,
// and goes to the encrypted credential store; no answer carries it. A joined server has no such
// endpoint: a bot is set up on the computer that runs the agent.

import {
  parseAnswerTelegramBotRequestInput,
  parseConnectTelegramBotInput,
  parseOpenTelegramBotInput,
  parseRemoveTelegramBotSenderInput,
  parseTelegramBotAgentInput,
} from "@openbot/contracts/ipc";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { MessagingService } from "../../backend/messaging/messaging-service";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

export interface TelegramBotIpcDependencies {
  messaging: Pick<
    MessagingService,
    | "telegramBotStatus"
    | "connectTelegramBot"
    | "disconnectTelegramBot"
    | "reconnectTelegramBot"
    | "openTelegramBot"
    | "removeTelegramBotSender"
    | "answerTelegramBotRequest"
  >;
}

export function telegramBotIpcHandlers({
  messaging,
}: TelegramBotIpcDependencies): Pick<IpcGroupHandlers, "telegramBot"> {
  return {
    telegramBot: {
      status: payloadHandler(parseTelegramBotAgentInput, ({ agentId }) => messaging.telegramBotStatus(agentId)),
      connect: payloadHandler(parseConnectTelegramBotInput, ({ agentId, token }) =>
        runCauseEffect(messaging.connectTelegramBot(agentId, token)),
      ),
      disconnect: payloadHandler(parseTelegramBotAgentInput, ({ agentId }) =>
        runCauseEffect(messaging.disconnectTelegramBot(agentId)),
      ),
      reconnect: payloadHandler(parseTelegramBotAgentInput, ({ agentId }) =>
        runCauseEffect(messaging.reconnectTelegramBot(agentId)),
      ),
      open: payloadHandler(parseOpenTelegramBotInput, ({ agentId, place }) =>
        runCauseEffect(messaging.openTelegramBot(agentId, place)),
      ),
      removeSender: payloadHandler(parseRemoveTelegramBotSenderInput, ({ agentId, senderId }) =>
        runCauseEffect(messaging.removeTelegramBotSender(agentId, senderId)),
      ),
      answerRequest: payloadHandler(parseAnswerTelegramBotRequestInput, ({ agentId, code, approve }) =>
        runCauseEffect(messaging.answerTelegramBotRequest(agentId, code, approve)),
      ),
    },
  };
}
