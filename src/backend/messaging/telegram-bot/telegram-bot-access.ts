// MyBot: who can reach the agent through its own Telegram bot.
//
// The allowed people and groups are the connection's allowed senders in `openbot.db`
// (`projection_messaging_allowed_senders`, as for WhatsApp): a `contact` is a Telegram user ID, which
// is also the ID of their direct chat with the bot, and a `group` is a group chat ID. The one-use link
// codes, the pairing requests and the polling problem of each bot are in memory only.

import { randomBytes, randomInt } from "node:crypto";
import {
  MESSAGING_LIMITS,
  TELEGRAM_BOT_PLATFORM,
  type TelegramBotPairingRequest,
  type TelegramBotProblem,
  type TelegramBotSender,
} from "@openbot/contracts/ipc";
import type { MessagingStore } from "../messaging-store";

/** How long the link that the owner opens in Telegram stays valid. */
const LINK_CODE_MS = 15 * 60_000;
/** How long a pairing request waits for the owner. */
const PAIRING_MS = 60 * 60_000;
/** Letters and digits that are not easy to confuse. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type AccessStore = Pick<
  MessagingStore,
  "connectionForWorkspace" | "allowedSenders" | "addAllowedSender" | "removeAllowedSender"
>;

interface LinkCode {
  botId: string;
  expiresAt: number;
}

export class TelegramBotAccess {
  readonly #store: AccessStore;
  readonly #now: () => number;
  readonly #links = new Map<string, LinkCode>();
  readonly #requests = new Map<string, TelegramBotPairingRequest[]>();
  readonly #problems = new Map<string, TelegramBotProblem>();

  constructor(store: AccessStore, now: () => number = Date.now) {
    this.#store = store;
    this.#now = now;
  }

  senders(botId: string): TelegramBotSender[] {
    const connectionId = this.#connectionId(botId);
    return connectionId ? this.#store.allowedSenders(connectionId) : [];
  }

  allowedUser(botId: string, userId: string): boolean {
    return this.senders(botId).some((sender) => sender.kind === "contact" && sender.id === userId);
  }

  allowedGroup(botId: string, chatId: string): boolean {
    return this.senders(botId).some((sender) => sender.kind === "group" && sender.id === chatId);
  }

  /** Adds a person or a group, or gives one that is there its new name. False past the limit. */
  allow(botId: string, sender: TelegramBotSender): boolean {
    const connectionId = this.#connectionId(botId);
    if (!connectionId) return false;
    const senders = this.#store.allowedSenders(connectionId);
    if (!senders.some((known) => known.id === sender.id) && senders.length >= MESSAGING_LIMITS.allowedSenders)
      return false;
    this.#store.addAllowedSender(connectionId, {
      id: sender.id,
      kind: sender.kind,
      name: sender.name.slice(0, MESSAGING_LIMITS.name),
    });
    return true;
  }

  remove(botId: string, senderId: string): void {
    const connectionId = this.#connectionId(botId);
    if (connectionId) this.#store.removeAllowedSender(connectionId, senderId);
  }

  /** A basic group that became a supergroup has a new ID: it stays allowed under that ID. */
  migrateGroup(botId: string, fromChatId: string, toChatId: string): void {
    const group = this.senders(botId).find((sender) => sender.kind === "group" && sender.id === fromChatId);
    if (!group) return;
    this.remove(botId, fromChatId);
    this.allow(botId, { ...group, id: toChatId });
  }

  /** A one-use code for `t.me/<bot>?start=<code>`, which allows the person who opens it. */
  createLink(botId: string): string {
    this.#prune();
    const code = randomBytes(24).toString("base64url");
    this.#links.set(code, { botId, expiresAt: this.#now() + LINK_CODE_MS });
    return code;
  }

  /** True once for a valid code of this bot. */
  consumeLink(botId: string, code: string): boolean {
    this.#prune();
    const link = this.#links.get(code);
    if (!link || link.botId !== botId) return false;
    this.#links.delete(code);
    return true;
  }

  /**
   * The pairing request of a person who is not allowed. `created` is false when they already wait, so
   * they get the code once. Null when the list is full: a flood of strangers cannot fill it.
   */
  pair(botId: string, senderId: string, name: string): { code: string; created: boolean } | null {
    const requests = this.requests(botId);
    const existing = requests.find((request) => request.senderId === senderId);
    if (existing) return { code: existing.code, created: false };
    if (requests.length >= MESSAGING_LIMITS.pendingRequests) return null;
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const request = {
      code,
      senderId,
      name: (name || senderId).slice(0, MESSAGING_LIMITS.name),
      expiresAt: new Date(this.#now() + PAIRING_MS).toISOString(),
    };
    this.#requests.set(botId, [...requests, request]);
    return { code, created: true };
  }

  requests(botId: string): TelegramBotPairingRequest[] {
    const now = this.#now();
    const live = (this.#requests.get(botId) ?? []).filter((request) => Date.parse(request.expiresAt) > now);
    this.#requests.set(botId, live);
    return live;
  }

  /** Ends a request. An approved one allows the person. Returns the request, or null when it is gone. */
  answer(botId: string, code: string, approve: boolean): TelegramBotPairingRequest | null {
    const requests = this.requests(botId);
    const request = requests.find((candidate) => candidate.code === code) ?? null;
    if (!request) return null;
    this.#requests.set(
      botId,
      requests.filter((candidate) => candidate !== request),
    );
    if (approve) this.allow(botId, { id: request.senderId, kind: "contact", name: request.name });
    return request;
  }

  problem(botId: string): TelegramBotProblem | null {
    return this.#problems.get(botId) ?? null;
  }

  setProblem(botId: string, problem: TelegramBotProblem | null): void {
    if (problem) this.#problems.set(botId, problem);
    else this.#problems.delete(botId);
  }

  /** Forgets the codes and requests of a bot that was disconnected. Its allowed senders stay. */
  forget(botId: string): void {
    this.#requests.delete(botId);
    this.#problems.delete(botId);
    for (const [code, link] of this.#links) if (link.botId === botId) this.#links.delete(code);
  }

  #connectionId(botId: string): string | null {
    return this.#store.connectionForWorkspace(TELEGRAM_BOT_PLATFORM, botId)?.connectionId ?? null;
  }

  #prune(): void {
    const now = this.#now();
    for (const [code, link] of this.#links) if (link.expiresAt <= now) this.#links.delete(code);
  }
}
