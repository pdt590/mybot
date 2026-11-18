// MyBot: the settings side of each agent's own Telegram bot: connect a token to one agent, show its
// state and its allowed people, open it in Telegram, and disconnect it.
//
// One bot is one connection (`telegram_bot`, workspace = bot ID) whose `orchestratorAgentId` is its
// agent, never shared. A disconnect stops the bot and deletes its token, but keeps the agent, the
// conversations, the memories and the allowed people, so the same bot connected again gets them back.
// Unlike the upstream orchestrators, no disconnect deletes an agent.

import {
  type MessagingConnection,
  TELEGRAM_BOT_PLATFORM,
  TELEGRAM_BOT_TOKEN_PATTERN,
  type TelegramBotStatus,
} from "@openbot/contracts/ipc";
import { isString } from "@openbot/contracts/runtime-values";
import { sourceText } from "@openbot/i18n/source";
import { Effect, Schema } from "effect";
import { causeHelpers } from "../../effect-boundary";
import type { MessagingCredentials, MessagingOperationFailed } from "../messaging-service";
import type { MessagingConnectionRecord, MessagingStore } from "../messaging-store";
import { TelegramCallError } from "../messaging-types";
import type { TelegramBotAccess } from "./telegram-bot-access";
import { TelegramBotApi, type TelegramFetch } from "./telegram-bot-api";

/** Its own error, not the service's: the service imports this file, so its class is not defined yet here. */
export class TelegramBotConnectFailed extends Schema.TaggedError<TelegramBotConnectFailed>()(
  "TelegramBotConnectFailed",
  { cause: Schema.Defect() },
) {}

const { io, sync: step } = causeHelpers(TelegramBotConnectFailed);

/** What the messaging service does for a bot. */
export interface TelegramBotConnectHooks {
  /** Starts the connection, or starts it again with its stored values. */
  start(connectionId: string): Effect.Effect<void, MessagingOperationFailed>;
  stop(connectionId: string): Effect.Effect<void, MessagingOperationFailed>;
  summary(record: MessagingConnectionRecord): MessagingConnection;
  agentIds(): ReadonlySet<string>;
  openExternal(url: string): Promise<void>;
}

export interface TelegramBotConnectOptions {
  store: MessagingStore;
  credentials: MessagingCredentials;
  access: TelegramBotAccess;
  hooks: TelegramBotConnectHooks;
  /** Only tests change this. */
  fetch?: TelegramFetch;
}

export class TelegramBotConnect {
  readonly #store: MessagingStore;
  readonly #credentials: MessagingCredentials;
  readonly #access: TelegramBotAccess;
  readonly #hooks: TelegramBotConnectHooks;
  readonly #fetch: TelegramFetch | undefined;

  constructor(options: TelegramBotConnectOptions) {
    this.#store = options.store;
    this.#credentials = options.credentials;
    this.#access = options.access;
    this.#hooks = options.hooks;
    this.#fetch = options.fetch;
  }

  /** The bot of an agent: the connection whose agent it is and that still has its token. */
  #record(agentId: string): MessagingConnectionRecord | null {
    return (
      this.#store
        .connections()
        .find(
          (record) =>
            record.platform === TELEGRAM_BOT_PLATFORM &&
            record.orchestratorAgentId === agentId &&
            this.#credentials.status(record.connectionId) !== "missing",
        ) ?? null
    );
  }

  #require(agentId: string): MessagingConnectionRecord {
    const record = this.#record(agentId);
    if (!record) throw new Error(sourceText("error.messaging.telegramBotNotConnected"));
    return record;
  }

  status(agentId: string): TelegramBotStatus {
    const record = this.#record(agentId);
    if (!record)
      return { agentId, connection: null, botUsername: null, problem: null, allowedSenders: [], pendingRequests: [] };
    const values = this.#credentials.get(record.connectionId);
    const username = values?.botUsername || record.workspaceName.replace(/^@/u, "");
    return {
      agentId,
      connection: this.#hooks.summary(record),
      botUsername: username || null,
      problem: record.enabled ? this.#access.problem(record.workspaceId) : null,
      allowedSenders: this.#access.senders(record.workspaceId),
      pendingRequests: this.#access.requests(record.workspaceId),
    };
  }

  /**
   * Gives the bot of `token` to the agent. A bot of another agent is refused. The agent's earlier bot,
   * when it had another one, is disconnected; the same bot with a new token keeps its connection.
   */
  readonly connect = Effect.fn("TelegramBotConnect.connect")(function* (
    this: TelegramBotConnect,
    agentId: string,
    token: string,
  ) {
    if (!this.#hooks.agentIds().has(agentId))
      return yield* step(() => {
        throw new Error(sourceText("error.agent.gone"));
      });
    if (!TELEGRAM_BOT_TOKEN_PATTERN.test(token))
      return yield* step(() => {
        throw new Error(sourceText("error.messaging.telegramBotTokenInvalid"));
      });
    const api = new TelegramBotApi({ token, ...(this.#fetch ? { fetch: this.#fetch } : {}) });
    const me = yield* io((signal) => api.call("getMe", {}, signal)).pipe(
      Effect.mapError(
        (failure) =>
          new TelegramBotConnectFailed({
            cause: new Error(
              sourceText(
                failure.cause instanceof TelegramCallError
                  ? "error.messaging.telegramBotTokenInvalid"
                  : "error.messaging.telegramBotUnreachable",
              ),
            ),
          }),
      ),
    );
    const botId = me && me.id !== undefined ? String(me.id) : api.botId;
    const username = me && isString(me.username) ? me.username : "";
    const existing = this.#store.connectionForWorkspace(TELEGRAM_BOT_PLATFORM, botId);
    const owner = existing?.orchestratorAgentId ?? null;
    if (
      existing &&
      owner &&
      owner !== agentId &&
      this.#hooks.agentIds().has(owner) &&
      this.#credentials.status(existing.connectionId) !== "missing"
    )
      return yield* step(() => {
        throw new Error(sourceText("error.messaging.telegramBotInUse"));
      });
    const previous = this.#record(agentId);
    if (previous && previous.workspaceId !== botId) yield* this.disconnect(agentId);
    const record = yield* step(() =>
      this.#store.ensureConnection(TELEGRAM_BOT_PLATFORM, botId, username ? `@${username}` : botId),
    );
    yield* this.#hooks.stop(record.connectionId);
    yield* this.#credentials.set(record.connectionId, { botToken: token, botId, botUsername: username });
    yield* step(() =>
      this.#store.updateConnection(record.connectionId, {
        enabled: true,
        workspaceName: username ? `@${username}` : botId,
        botUserId: botId,
        appId: botId,
        lastErrorCode: null,
        orchestratorAgentId: agentId,
      }),
    );
    this.#access.setProblem(botId, null);
    yield* this.#hooks.start(record.connectionId);
    return this.status(agentId);
  }, Effect.uninterruptible);

  /** Stops the bot and deletes its token. The agent and what the bot learned stay. */
  readonly disconnect = Effect.fn("TelegramBotConnect.disconnect")(function* (
    this: TelegramBotConnect,
    agentId: string,
  ) {
    const record = yield* step(() => this.#require(agentId));
    yield* this.#disconnectRecord(record);
  }, Effect.uninterruptible);

  readonly #disconnectRecord = Effect.fn("TelegramBotConnect.disconnectRecord")(function* (
    this: TelegramBotConnect,
    record: MessagingConnectionRecord,
  ) {
    yield* this.#hooks.stop(record.connectionId);
    yield* this.#credentials.clear(record.connectionId);
    yield* step(() => this.#store.updateConnection(record.connectionId, { enabled: false, lastErrorCode: null }));
    this.#access.forget(record.workspaceId);
  });

  readonly reconnect = Effect.fn("TelegramBotConnect.reconnect")(function* (this: TelegramBotConnect, agentId: string) {
    const record = yield* step(() => this.#require(agentId));
    yield* this.#hooks.stop(record.connectionId);
    yield* step(() => this.#store.updateConnection(record.connectionId, { enabled: true, lastErrorCode: null }));
    yield* this.#hooks.start(record.connectionId);
  }, Effect.uninterruptible);

  /**
   * Opens the bot in Telegram: a direct chat with a one-use code that allows whoever opens it (the
   * owner, on their phone or here), or the page that adds the bot to a group.
   */
  readonly open = Effect.fn("TelegramBotConnect.open")(function* (
    this: TelegramBotConnect,
    agentId: string,
    place: "direct" | "group",
  ) {
    const record = yield* step(() => this.#require(agentId));
    const username = this.#credentials.get(record.connectionId)?.botUsername || record.workspaceName.replace(/^@/u, "");
    if (!username)
      return yield* step(() => {
        throw new Error(sourceText("error.messaging.telegramBotNotConnected"));
      });
    const url = new URL(`https://t.me/${encodeURIComponent(username)}`);
    if (place === "direct") url.searchParams.set("start", this.#access.createLink(record.workspaceId));
    else url.searchParams.set("startgroup", "add");
    yield* io(() => this.#hooks.openExternal(url.toString()));
  });

  readonly removeSender = Effect.fn("TelegramBotConnect.removeSender")(function* (
    this: TelegramBotConnect,
    agentId: string,
    senderId: string,
  ) {
    const record = yield* step(() => this.#require(agentId));
    this.#access.remove(record.workspaceId, senderId);
  });

  readonly answerRequest = Effect.fn("TelegramBotConnect.answerRequest")(function* (
    this: TelegramBotConnect,
    agentId: string,
    code: string,
    approve: boolean,
  ) {
    const record = yield* step(() => this.#require(agentId));
    if (!this.#access.answer(record.workspaceId, code, approve))
      return yield* step(() => {
        throw new Error(sourceText("error.messaging.telegramBotRequestGone"));
      });
  });

  /** Disconnects each bot whose agent was deleted, so nothing polls for a gone agent. */
  readonly sweep = Effect.fn("TelegramBotConnect.sweep")(function* (this: TelegramBotConnect) {
    const agents = this.#hooks.agentIds();
    const orphans = this.#store
      .connections()
      .filter(
        (record) =>
          record.platform === TELEGRAM_BOT_PLATFORM &&
          this.#credentials.status(record.connectionId) !== "missing" &&
          (!record.orchestratorAgentId || !agents.has(record.orchestratorAgentId)),
      );
    for (const record of orphans) yield* this.#disconnectRecord(record);
  });
}
