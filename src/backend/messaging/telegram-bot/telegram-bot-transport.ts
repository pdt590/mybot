// MyBot: the inbound half of an agent's own Telegram bot. It asks Telegram for the bot's updates
// with long polling (`getUpdates`), so this computer needs no public address. Telegram keeps an
// update until a later `getUpdates` confirms it with its offset, up to 24 hours: an update that came
// while this computer was off arrives when it starts, and one that was handed on before a crash comes
// again (the mailbox's idempotency key takes it once).
//
// Each update passes the owner's rules first (`TelegramBotAccess`):
// - A direct chat counts when its person is allowed. `/start <code>` with the code of the link that
//   the owner opened allows that person. Another person gets one pairing code, which the owner
//   approves in MyBot.
// - A group counts when it is allowed. A group is allowed when an allowed person adds the bot; the
//   bot leaves a group that someone else added it to, and a group that removes it is no longer allowed.
// An update that counts goes to the upstream transport of its chat, which turns it into a message or
// a button press as for the OpenBot bot.

import type { DynamicRecord } from "@openbot/contracts/runtime-values";
import { isDynamicRecord, isNumber, isString } from "@openbot/contracts/runtime-values";
import { sourceText } from "@openbot/i18n/source";
import { createOpenBotLogger } from "@openbot/logging";
import { Effect } from "effect";
import type { ConnectionIdentity, MessageTarget, MessagingTransport, TransportSink } from "../messaging-types";
import { TelegramCallError } from "../messaging-types";
import type { TelegramBotAccess } from "./telegram-bot-access";
import { TelegramUnreachable } from "./telegram-bot-api";
import type { TelegramBotChats } from "./telegram-bot-driver";

const logger = createOpenBotLogger("telegram-bot");

/** Seconds that one `getUpdates` waits for an update. */
const POLL_TIMEOUT_S = 50;
const ALLOWED_UPDATES = ["message", "callback_query", "my_chat_member"];
const RETRY_FIRST_MS = 1_000;
const RETRY_LAST_MS = 60_000;
const START_COMMAND = /^\/start(?:@[A-Za-z0-9_]{1,64})?(?:\s+(\S+))?\s*$/u;

export interface TelegramBotTransportOptions {
  chats: TelegramBotChats;
  access: TelegramBotAccess;
  identity: ConnectionIdentity;
}

export class TelegramBotTransport implements MessagingTransport {
  readonly #chats: TelegramBotChats;
  readonly #access: TelegramBotAccess;
  readonly #botId: string;
  readonly #transports = new Map<string, MessagingTransport>();
  #sink: TransportSink | null = null;
  #abort: AbortController | null = null;
  /** Each run of the loop; a stopped run ends at its next step. */
  #run = 0;
  #offset = 0;

  constructor(options: TelegramBotTransportOptions) {
    this.#chats = options.chats;
    this.#access = options.access;
    this.#botId = options.identity.botUserId;
  }

  start(sink: TransportSink): void {
    this.#sink = sink;
    void this.#loop(++this.#run);
  }

  /** Asks again now, such as after the computer wakes. */
  reconnect(): void {
    if (!this.#sink) return;
    this.#abort?.abort();
    void this.#loop(++this.#run);
  }

  readonly stop = Effect.fn("TelegramBotTransport.stop")(function* (this: TelegramBotTransport) {
    this.#run++;
    this.#sink = null;
    this.#abort?.abort();
    this.#abort = null;
    const transports = [...this.#transports.values()];
    this.#transports.clear();
    yield* Effect.forEach(transports, (transport) => transport.stop(), { discard: true });
  });

  async #loop(run: number): Promise<void> {
    const api = this.#chats.api;
    let retry = RETRY_FIRST_MS;
    let connected = false;
    this.#sink?.state("connecting");
    while (this.#run === run && this.#sink) {
      const abort = new AbortController();
      this.#abort = abort;
      try {
        // A bot with a webhook gets no updates by polling. Telegram keeps the pending ones.
        if (!connected) await api.call("deleteWebhook", { drop_pending_updates: false }, abort.signal);
        const updates = await api.updates(
          { offset: this.#offset, timeout: POLL_TIMEOUT_S, allowed_updates: ALLOWED_UPDATES },
          abort.signal,
        );
        if (this.#run !== run) return;
        if (!connected) {
          connected = true;
          retry = RETRY_FIRST_MS;
          this.#access.setProblem(this.#botId, null);
          this.#sink?.state("connected");
        }
        for (const update of updates) {
          if (!isNumber(update.update_id)) continue;
          this.#offset = Math.max(this.#offset, update.update_id + 1);
          await this.#handle(update).catch((error: unknown) =>
            logger.warn("A Telegram bot update failed.", { error: error instanceof Error ? error.name : "unknown" }),
          );
          if (this.#run !== run) return;
        }
      } catch (error) {
        if (this.#run !== run) return;
        if (error instanceof TelegramCallError && (error.errorCode === 401 || error.errorCode === 404)) {
          // The token was revoked: the user gives a new one.
          this.#sink?.state("invalid_token");
          return;
        }
        // 409: another program polls this bot, or set a webhook again.
        const problem = error instanceof TelegramCallError && error.errorCode === 409 ? "conflict" : "unreachable";
        this.#access.setProblem(this.#botId, problem);
        if (error instanceof TelegramCallError && error.errorCode === 429 && error.retryAfter)
          retry = Math.max(retry, error.retryAfter * 1_000);
        if (!(error instanceof TelegramCallError) && !(error instanceof TelegramUnreachable))
          logger.warn("Telegram bot polling failed.", { error: error instanceof Error ? error.name : "unknown" });
        connected = false;
        this.#sink?.state(problem === "conflict" ? "error" : "reconnecting");
        await wait(retry, abort.signal);
        retry = Math.min(retry * 2, RETRY_LAST_MS);
      }
    }
  }

  async #handle(update: DynamicRecord): Promise<void> {
    const member = isDynamicRecord(update.my_chat_member) ? update.my_chat_member : null;
    if (member) return this.#membership(member);
    const query = isDynamicRecord(update.callback_query) ? update.callback_query : null;
    const message = isDynamicRecord(update.message)
      ? update.message
      : query && isDynamicRecord(query.message)
        ? query.message
        : null;
    const chat = message && isDynamicRecord(message.chat) ? message.chat : null;
    if (!message || !chat) return;
    const chatId = String(chat.id);
    const isDirect = chat.type === "private";
    if (!query) {
      // A basic group that became a supergroup gets a new ID; the bot that left needs nothing more.
      if (message.migrate_to_chat_id !== undefined) {
        this.#access.migrateGroup(this.#botId, chatId, String(message.migrate_to_chat_id));
        return;
      }
      if (isDynamicRecord(message.left_chat_member) && String(message.left_chat_member.id) === this.#botId) {
        this.#access.remove(this.#botId, chatId);
        return;
      }
      const from = isDynamicRecord(message.from) ? message.from : null;
      if (!from || from.is_bot === true) return;
      const code = isString(message.text) ? START_COMMAND.exec(message.text.trim())?.[1] : undefined;
      if (isDirect && code && this.#access.consumeLink(this.#botId, code)) {
        this.#access.allow(this.#botId, { id: chatId, kind: "contact", name: personName(from) || chatId });
        await this.#say(chatId, sourceText("status.messaging.telegramBotLinked"));
        return;
      }
      if (isDirect && !this.#access.allowedUser(this.#botId, chatId)) {
        const pairing = this.#access.pair(this.#botId, chatId, personName(from));
        if (pairing?.created)
          await this.#say(chatId, sourceText("status.messaging.telegramBotPairing", { code: pairing.code }));
        return;
      }
    }
    if (isDirect ? !this.#access.allowedUser(this.#botId, chatId) : !this.#access.allowedGroup(this.#botId, chatId))
      return;
    const title = isDirect ? personName(chat) : isString(chat.title) ? chat.title : "";
    const answer = await Effect.runPromise(
      this.#transport(chatId, title).deliver?.({
        platform: "telegram",
        botId: this.#botId,
        body: new TextEncoder().encode(JSON.stringify(update)),
        linked: false,
      }) ?? Effect.succeed({ status: 503 as const }),
    );
    if (answer.status !== 200) logger.warn("A Telegram bot update was not taken.", { status: answer.status });
  }

  /** The bot joined or left a group, or a person blocked or unblocked it. */
  async #membership(member: DynamicRecord): Promise<void> {
    const chat = isDynamicRecord(member.chat) ? member.chat : null;
    const next = isDynamicRecord(member.new_chat_member) ? member.new_chat_member : null;
    const previous = isDynamicRecord(member.old_chat_member) ? member.old_chat_member : null;
    if (!chat || !next || !isDynamicRecord(next.user) || String(next.user.id) !== this.#botId) return;
    if (chat.type === "private") return;
    const chatId = String(chat.id);
    const gone = (status: unknown) => status === "left" || status === "kicked";
    if (gone(next.status)) {
      this.#access.remove(this.#botId, chatId);
      return;
    }
    if (previous && !gone(previous.status)) return;
    const from = isDynamicRecord(member.from) ? member.from : null;
    const adder = from ? String(from.id) : "";
    const title = isString(chat.title) && chat.title.trim() ? chat.title.trim() : chatId;
    if (adder && this.#access.allowedUser(this.#botId, adder)) {
      if (this.#access.allow(this.#botId, { id: chatId, kind: "group", name: title }))
        await this.#say(chatId, sourceText("status.messaging.telegramBotGroupAllowed"));
      return;
    }
    // Only a person whom the owner allowed can bring the agent into a group.
    await this.#chats.api.call("leaveChat", { chat_id: Number(chatId) }).catch(() => undefined);
  }

  #transport(chatId: string, title: string): MessagingTransport {
    const known = this.#transports.get(chatId);
    if (known) return known;
    const transport = this.#chats.transport(chatId, title);
    transport.start({
      // The bot's own loop reports the state. A removal is handled above, before the upstream transport.
      state: () => undefined,
      message: (message) => this.#sink?.message(message),
      action: (action) => this.#sink?.action(action),
      renamed: (name) => {
        if (this.#access.allowedGroup(this.#botId, chatId))
          this.#access.allow(this.#botId, { id: chatId, kind: "group", name });
      },
    });
    this.#transports.set(chatId, transport);
    return transport;
  }

  /** A short text of the host, at the top level of a chat. A failure is only logged. */
  async #say(chatId: string, text: string): Promise<void> {
    const target: MessageTarget = { platformChannelId: chatId, replyThreadId: null };
    await Effect.runPromise(
      this.#chats
        .adapter(chatId)
        .post(target, { text })
        .pipe(
          Effect.asVoid,
          Effect.catch(() => Effect.sync(() => logger.warn("A Telegram bot notice was not sent."))),
        ),
    );
  }
}

function personName(value: DynamicRecord): string {
  const name = [value.first_name, value.last_name].filter(isString).join(" ").trim();
  if (name) return name;
  return isString(value.username) ? value.username : "";
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
