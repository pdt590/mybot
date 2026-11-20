// MyBot: the messaging driver of an agent's own Telegram bot (`platform: "telegram_bot"`).
//
// One connection is one bot, and every chat that the owner allows is a place of it. Each chat is
// served by the upstream Telegram adapter and transport of that chat, made by the upstream
// `telegramDriver` over an ingress whose `telegram` gateway calls the Bot API with this bot's token
// (`directTelegramGateway`). So the posts, edits, reactions, buttons, files, reply chains and the
// memory of each chat are the upstream ones, and the upstream files stay unchanged. This file routes
// each call to the adapter of its chat; `TelegramBotTransport` polls the updates and routes them.

import { TELEGRAM_BOT_PLATFORM } from "@openbot/contracts/ipc";
import { TELEGRAM_FILE_BYTES_LIMIT } from "@openbot/contracts/signal-protocol/telegram-route";
import { Effect } from "effect";
import type { MessagingAnswerFile } from "../messaging-threads";
import {
  type ConnectionIdentity,
  type ContextEntry,
  type InboundFile,
  type MessageBody,
  type MessageTarget,
  type MessagingAdapter,
  MessagingAdapterError,
  MessagingConnectionError,
  type MessagingDriver,
  type MessagingDriverOptions,
  type MessagingIngress,
  type MessagingPlaces,
  type MessagingTransport,
  type RecentMessages,
  type StatusReaction,
  TelegramCallError,
  type TelegramGateway,
} from "../messaging-types";
import { telegramDriver } from "../telegram/telegram-driver";
import { telegramPlacement } from "../telegram/telegram-updates";
import type { TelegramBotAccess } from "./telegram-bot-access";
import { directTelegramGateway, TelegramBotApi, type TelegramFetch, TelegramUnreachable } from "./telegram-bot-api";
import { TelegramBotTransport } from "./telegram-bot-transport";

/** The stored values of one bot connection. The token is the only secret. */
export interface TelegramBotCredentials {
  botToken: string;
  botId: string;
  botUsername: string;
}

export function telegramBotCredentials(values: Record<string, string>): TelegramBotCredentials {
  const botToken = values.botToken ?? "";
  return { botToken, botId: values.botId || (botToken.split(":")[0] ?? ""), botUsername: values.botUsername ?? "" };
}

/** An ingress that is always online and whose Telegram calls go to the Bot API directly. */
function directIngress(gateway: TelegramGateway): MessagingIngress {
  const none = () => undefined;
  return {
    acquire: () => none,
    state: () => "online",
    onState: () => none,
    handle: none,
    telegram: gateway,
    reconnect: none,
    discord: () => Effect.fail(new MessagingAdapterError({ cause: new Error("discord_unsupported") })),
    onDiscordRoutes: () => none,
    onLinkedRoutes: (_platform, listener) => {
      // No route ticket: every allowed chat is this host's.
      listener(null);
      return none;
    },
  };
}

/**
 * The chats of one bot token: the upstream adapter of each chat, and the upstream driver that makes
 * them and their transports, so the adapter and the transport of a chat share its memory.
 */
export class TelegramBotChats {
  readonly api: TelegramBotApi;
  readonly botId: string;
  botUsername: string;
  options: MessagingDriverOptions = { connectionId: "", rateLimited: () => undefined };
  readonly #upstream: MessagingDriver;
  readonly #adapters = new Map<string, MessagingAdapter>();

  constructor(credentials: TelegramBotCredentials, fetchImpl?: TelegramFetch) {
    this.api = new TelegramBotApi({ token: credentials.botToken, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
    this.botId = credentials.botId;
    this.botUsername = credentials.botUsername;
    this.#upstream = telegramDriver({ ingress: directIngress(directTelegramGateway(this.api)) });
  }

  #values(chatId: string, title: string): Record<string, string> {
    return {
      botId: this.botId,
      chatId,
      ...(title ? { chatTitle: title } : {}),
      ...(this.botUsername ? { botUsername: this.botUsername } : {}),
    };
  }

  adapter(chatId: string, title = ""): MessagingAdapter {
    const known = this.#adapters.get(chatId);
    if (known) return known;
    // The upstream adapter reads `options` when it is rate limited, so a later `options` still counts.
    const adapter = this.#upstream.createAdapter(this.#values(chatId, title), {
      connectionId: this.options.connectionId,
      rateLimited: (retryAt) => this.options.rateLimited(retryAt),
    });
    this.#adapters.set(chatId, adapter);
    return adapter;
  }

  /** The upstream transport of one chat. It takes each update of the chat through `deliver`. */
  transport(chatId: string, title: string): MessagingTransport {
    this.adapter(chatId, title);
    return this.#upstream.createTransport(this.#values(chatId, title), {
      workspaceId: chatId,
      workspaceName: title || chatId,
      botUserId: this.botId,
      appId: this.botId,
      missingScopes: [],
    });
  }

  /** The chats this computer has seen since it started. */
  knownChats(): string[] {
    return [...this.#adapters.keys()];
  }
}

/** The adapter of one bot connection: each call goes to the adapter of its chat. */
class TelegramBotAdapter implements MessagingAdapter {
  readonly platform = TELEGRAM_BOT_PLATFORM;
  readonly #chats: TelegramBotChats;
  readonly #access: TelegramBotAccess;

  constructor(chats: TelegramBotChats, access: TelegramBotAccess) {
    this.#chats = chats;
    this.#access = access;
  }

  #chat(target: MessageTarget | string): MessagingAdapter {
    const chatId = typeof target === "string" ? target : target.platformChannelId;
    const name = this.#access.senders(this.#chats.botId).find((sender) => sender.id === chatId)?.name ?? "";
    return this.#chats.adapter(chatId, name);
  }

  identify(): Effect.Effect<ConnectionIdentity, MessagingAdapterError> {
    const chats = this.#chats;
    return Effect.tryPromise({
      try: () => chats.api.call("getMe", {}),
      catch: (error) =>
        new MessagingAdapterError({
          cause:
            error instanceof TelegramCallError && (error.errorCode === 401 || error.errorCode === 404)
              ? new MessagingConnectionError("invalid_token")
              : error instanceof TelegramCallError || error instanceof TelegramUnreachable
                ? error
                : new TelegramUnreachable(),
        }),
    }).pipe(
      Effect.map((me) => {
        const username = me && typeof me.username === "string" ? me.username : chats.botUsername;
        chats.botUsername = username;
        return {
          workspaceId: chats.botId,
          workspaceName: username ? `@${username}` : chats.botId,
          botUserId: chats.botId,
          appId: chats.botId,
          missingScopes: [],
        };
      }),
    );
  }

  post(target: MessageTarget, body: MessageBody): Effect.Effect<string, MessagingAdapterError> {
    return this.#chat(target).post(target, body);
  }

  edit(target: MessageTarget, messageId: string, body: MessageBody): Effect.Effect<void, MessagingAdapterError> {
    return this.#chat(target).edit(target, messageId, body);
  }

  postPrivate(
    target: MessageTarget,
    userId: string,
    text: string,
    replyHandle?: string,
  ): Effect.Effect<void, MessagingAdapterError> {
    return this.#chat(target).postPrivate(target, userId, text, replyHandle);
  }

  react(
    target: MessageTarget,
    messageId: string,
    reaction: StatusReaction,
    on: boolean,
  ): Effect.Effect<void, MessagingAdapterError> {
    return this.#chat(target).react(target, messageId, reaction, on);
  }

  /** Telegram shows "typing…" for about 5 seconds, in the topic of a forum when the target names one. */
  typing(target: MessageTarget): Effect.Effect<void, MessagingAdapterError> {
    const api = this.#chats.api;
    const { message_thread_id } = telegramPlacement(target);
    return Effect.tryPromise({
      try: () =>
        api.call("sendChatAction", {
          chat_id: Number(target.platformChannelId),
          action: "typing",
          ...(message_thread_id ? { message_thread_id } : {}),
        }),
      catch: (cause) => new MessagingAdapterError({ cause }),
    }).pipe(Effect.asVoid);
  }

  addEmoji(target: MessageTarget, messageId: string, emoji: string): Effect.Effect<void, MessagingAdapterError> {
    return this.#chat(target).addEmoji?.(target, messageId, emoji) ?? Effect.void;
  }

  postAnswer(
    target: MessageTarget,
    markdown: string,
    replaceMessageId: string | null,
  ): Effect.Effect<string, MessagingAdapterError> {
    return this.#chat(target).postAnswer(target, markdown, replaceMessageId);
  }

  upload(
    target: MessageTarget,
    files: MessagingAnswerFile[],
  ): Effect.Effect<{ skipped: string[]; firstId: string | null }, MessagingAdapterError> {
    return this.#chat(target).upload(target, files);
  }

  history(
    platformChannelId: string,
    threadKey: string,
    afterId: string | null,
    beforeId: string,
  ): Effect.Effect<ContextEntry[], MessagingAdapterError> {
    return this.#chat(platformChannelId).history(platformChannelId, threadKey, afterId, beforeId);
  }

  recent(
    platformChannelId: string,
    threadKey: string | null,
    limit: number,
  ): Effect.Effect<RecentMessages, MessagingAdapterError> {
    return this.#chat(platformChannelId).recent(platformChannelId, threadKey, limit);
  }

  download(file: InboundFile, destination: string, maxBytes: number): Effect.Effect<void, MessagingAdapterError> {
    const api = this.#chats.api;
    return Effect.tryPromise({
      try: async () => {
        const info = await api.call("getFile", { file_id: file.url });
        const path = info && typeof info.file_path === "string" ? info.file_path : null;
        if (!path) throw new Error("no_file_path");
        await api.download(path, destination, Math.min(maxBytes, TELEGRAM_FILE_BYTES_LIMIT));
      },
      catch: (cause) => new MessagingAdapterError({ cause }),
    });
  }

  /** A name that one of the chats learned, or the ID. */
  authorName(userId: string): Effect.Effect<string, MessagingAdapterError> {
    const known = this.#access.senders(this.#chats.botId).find((sender) => sender.id === userId)?.name;
    if (known) return Effect.succeed(known);
    const chats = this.#chats.knownChats();
    return Effect.gen({ self: this }, function* () {
      for (const chatId of chats) {
        const name = yield* this.#chats.adapter(chatId).authorName(userId);
        if (name && name !== userId) return name;
      }
      return userId;
    });
  }

  placeName(platformChannelId: string): Effect.Effect<string, MessagingAdapterError> {
    const known = this.#access.senders(this.#chats.botId).find((sender) => sender.id === platformChannelId)?.name;
    return known ? Effect.succeed(known) : this.#chat(platformChannelId).placeName(platformChannelId);
  }

  /** The allowed groups and the direct chats of the allowed people. */
  places(): Effect.Effect<MessagingPlaces, MessagingAdapterError> {
    return Effect.sync(() => ({
      places: this.#access.senders(this.#chats.botId).map((sender) => ({
        id: sender.id,
        name: sender.name || sender.id,
        kind: sender.kind === "group" ? ("channel" as const) : ("chat" as const),
      })),
    }));
  }

  mention(userId: string): string {
    return /^[0-9]+$/u.test(userId) ? `@${userId}` : userId;
  }
}

export interface TelegramBotDriverOptions {
  access: TelegramBotAccess;
  /** Only tests change this. */
  fetch?: TelegramFetch;
}

/** Each agent's own bot. Its updates come by long polling; no public address and no Signal. */
export function telegramBotDriver(options: TelegramBotDriverOptions): MessagingDriver {
  // By token: a new token of the same bot, after the old one was revoked, gets a new client.
  const bots = new Map<string, TelegramBotChats>();
  const chatsOf = (values: Record<string, string>) => {
    const credentials = telegramBotCredentials(values);
    let chats = bots.get(credentials.botToken);
    if (!chats) {
      chats = new TelegramBotChats(credentials, options.fetch);
      bots.set(credentials.botToken, chats);
    }
    if (credentials.botUsername && !chats.botUsername) chats.botUsername = credentials.botUsername;
    return chats;
  };
  return {
    platform: TELEGRAM_BOT_PLATFORM,
    requiredCredential: "botToken",
    createAdapter(credentials, driverOptions) {
      const chats = chatsOf(credentials);
      chats.options = driverOptions;
      return new TelegramBotAdapter(chats, options.access);
    },
    createTransport(credentials, identity) {
      return new TelegramBotTransport({ chats: chatsOf(credentials), access: options.access, identity });
    },
  };
}
