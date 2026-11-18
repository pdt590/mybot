/**
 * MyBot: an agent's own Telegram bot. The user makes a bot with @BotFather and gives its token to one
 * agent. This computer calls the Bot API itself (long polling), so no Signal and no account take part.
 * One bot is one messaging connection (`platform: "telegram_bot"`, `workspaceId` = the bot ID) whose
 * every conversation goes to that agent. Only the people that the owner allows reach the agent: the
 * owner links their own chat with a one-use link, another person gets a code that the owner approves,
 * and a group is allowed when an allowed person adds the bot. The token travels only towards main; no
 * result carries it.
 */

import { isBoundedString, isIdentifier } from "./ipc-bounded-values";
import { isMessagingConnection, MESSAGING_LIMITS, type MessagingConnection } from "./ipc-messaging";
import { type DynamicRecord, isBoolean, isDynamicRecord, isOneOf } from "./runtime-values";

export const TELEGRAM_BOT_PLATFORM = "telegram_bot" as const;

/** A token from @BotFather: the bot ID, a colon, and the secret. */
export const TELEGRAM_BOT_TOKEN_PATTERN = /^[0-9]{1,20}:[A-Za-z0-9_-]{30,64}$/u;
/** A Telegram user ID (a person, and their direct chat with the bot) or a group chat ID. */
const TELEGRAM_BOT_SENDER_ID = /^-?[0-9]{1,20}$/u;
/** The code that a person who is not allowed gets in Telegram. */
const TELEGRAM_BOT_REQUEST_CODE = /^[A-Z0-9]{6}$/u;

/** Why a connected bot does not get its messages, beside the connection's state. */
export const TELEGRAM_BOT_PROBLEMS = ["conflict", "unreachable"] as const;
export type TelegramBotProblem = (typeof TELEGRAM_BOT_PROBLEMS)[number];

/** A person (`contact`, their user ID) or a group (`group`, its chat ID) that can give the agent work. */
export interface TelegramBotSender {
  id: string;
  kind: "contact" | "group";
  name: string;
}

/** A person who wrote to the bot and waits for the owner. */
export interface TelegramBotPairingRequest {
  /** The 6-character code that the person got in Telegram. */
  code: string;
  /** Their Telegram user ID. */
  senderId: string;
  name: string;
  /** ISO time. */
  expiresAt: string;
}

/** The bot of one agent. `connection` is null when the agent has no bot. */
export interface TelegramBotStatus {
  agentId: string;
  connection: MessagingConnection | null;
  /** The bot's username, without `@`. */
  botUsername: string | null;
  /**
   * `conflict`: another program gets this bot's updates (another MyBot, OpenBot or a script with the
   * same token). `unreachable`: this computer cannot reach Telegram.
   */
  problem: TelegramBotProblem | null;
  allowedSenders: TelegramBotSender[];
  pendingRequests: TelegramBotPairingRequest[];
}

export interface TelegramBotAgentInput {
  agentId: string;
}

export interface ConnectTelegramBotInput {
  agentId: string;
  token: string;
}

/** Opens the bot in Telegram: `direct` with a one-use code that allows the owner, `group` to add it to a group. */
export interface OpenTelegramBotInput {
  agentId: string;
  place: "direct" | "group";
}

export interface RemoveTelegramBotSenderInput {
  agentId: string;
  senderId: string;
}

export interface AnswerTelegramBotRequestInput {
  agentId: string;
  code: string;
  approve: boolean;
}

function isTelegramBotSender(value: unknown): value is TelegramBotSender {
  return (
    isDynamicRecord(value) &&
    typeof value.id === "string" &&
    TELEGRAM_BOT_SENDER_ID.test(value.id) &&
    (value.kind === "contact" || value.kind === "group") &&
    isBoundedString(value.name, MESSAGING_LIMITS.name)
  );
}

function isTelegramBotPairingRequest(value: unknown): value is TelegramBotPairingRequest {
  return (
    isDynamicRecord(value) &&
    typeof value.code === "string" &&
    TELEGRAM_BOT_REQUEST_CODE.test(value.code) &&
    typeof value.senderId === "string" &&
    TELEGRAM_BOT_SENDER_ID.test(value.senderId) &&
    isBoundedString(value.name, MESSAGING_LIMITS.name) &&
    isBoundedString(value.expiresAt, 64)
  );
}

export function isTelegramBotStatus(value: unknown): value is TelegramBotStatus {
  return (
    isDynamicRecord(value) &&
    isIdentifier(value.agentId) &&
    (value.connection === null || isMessagingConnection(value.connection)) &&
    (value.botUsername === null || isBoundedString(value.botUsername, MESSAGING_LIMITS.name)) &&
    (value.problem === null || isOneOf(TELEGRAM_BOT_PROBLEMS, value.problem)) &&
    Array.isArray(value.allowedSenders) &&
    value.allowedSenders.length <= MESSAGING_LIMITS.allowedSenders &&
    value.allowedSenders.every(isTelegramBotSender) &&
    Array.isArray(value.pendingRequests) &&
    value.pendingRequests.length <= MESSAGING_LIMITS.pendingRequests &&
    value.pendingRequests.every(isTelegramBotPairingRequest)
  );
}

function record(value: unknown, name: string): DynamicRecord {
  if (!isDynamicRecord(value)) throw new Error(`Invalid ${name}.`);
  return value;
}

function agentId(value: DynamicRecord): string {
  if (!isIdentifier(value.agentId)) throw new Error("Invalid agent.");
  return value.agentId;
}

export function parseTelegramBotAgentInput(value: unknown): TelegramBotAgentInput {
  return { agentId: agentId(record(value, "Telegram bot input")) };
}

export function parseConnectTelegramBotInput(value: unknown): ConnectTelegramBotInput {
  const input = record(value, "Telegram bot input");
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!TELEGRAM_BOT_TOKEN_PATTERN.test(token)) throw new Error("Invalid Telegram bot token.");
  return { agentId: agentId(input), token };
}

export function parseOpenTelegramBotInput(value: unknown): OpenTelegramBotInput {
  const input = record(value, "Telegram bot input");
  if (input.place !== "direct" && input.place !== "group") throw new Error("Invalid Telegram place.");
  return { agentId: agentId(input), place: input.place };
}

export function parseRemoveTelegramBotSenderInput(value: unknown): RemoveTelegramBotSenderInput {
  const input = record(value, "Telegram bot input");
  if (typeof input.senderId !== "string" || !TELEGRAM_BOT_SENDER_ID.test(input.senderId))
    throw new Error("Invalid Telegram sender.");
  return { agentId: agentId(input), senderId: input.senderId };
}

export function parseAnswerTelegramBotRequestInput(value: unknown): AnswerTelegramBotRequestInput {
  const input = record(value, "Telegram bot input");
  if (typeof input.code !== "string" || !TELEGRAM_BOT_REQUEST_CODE.test(input.code) || !isBoolean(input.approve))
    throw new Error("Invalid Telegram request.");
  return { agentId: agentId(input), code: input.code, approve: input.approve };
}

export function decodeTelegramBotStatus(value: unknown): TelegramBotStatus {
  if (!isTelegramBotStatus(value)) throw new Error("Invalid Telegram bot response.");
  return value;
}
