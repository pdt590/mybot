// @vitest-environment node

import { type DynamicRecord, isDynamicRecord } from "@openbot/contracts/runtime-values";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MessagingAllowedSender, MessagingConnectionRecord } from "../messaging-store";
import { type InboundMessage, NEW_CONVERSATION_TEXT, TelegramCallError, type TransportSink } from "../messaging-types";
import { telegramPlacement } from "../telegram/telegram-updates";
import { TelegramBotAccess } from "./telegram-bot-access";
import { directTelegramGateway, TelegramBotApi, type TelegramFetch } from "./telegram-bot-api";
import { telegramBotDriver } from "./telegram-bot-driver";

const BOT_ID = "7012345678";
const TOKEN = `${BOT_ID}:AAH-test-token-0123456789abcdefghij`;
const OWNER = "100200300";
const STRANGER = "400500600";
const GROUP = "-1001234567890";

/** The allowed senders of one bot connection, in memory. */
function memoryStore() {
  const senders: MessagingAllowedSender[] = [];
  const record: MessagingConnectionRecord = {
    connectionId: "connection-1",
    platform: "telegram_bot",
    workspaceId: BOT_ID,
    workspaceName: "@agent_bot",
    enabled: true,
    botUserId: BOT_ID,
    appId: BOT_ID,
    orchestratorAgentId: "agent-1",
    lastErrorCode: null,
  };
  return {
    senders,
    connectionForWorkspace: (_platform: string, workspaceId: string) => (workspaceId === BOT_ID ? record : null),
    allowedSenders: () => [...senders],
    addAllowedSender: (_connectionId: string, sender: MessagingAllowedSender) => {
      const known = senders.findIndex((candidate) => candidate.id === sender.id);
      if (known >= 0) senders[known] = sender;
      else senders.push(sender);
    },
    removeAllowedSender: (_connectionId: string, senderId: string) => {
      const known = senders.findIndex((candidate) => candidate.id === senderId);
      if (known >= 0) senders.splice(known, 1);
    },
  };
}

interface Call {
  method: string;
  params: DynamicRecord;
}

/** What a method answers: its `result`, or a whole failed response. */
type Answer = Response | DynamicRecord;

/**
 * A Bot API that answers each method from `answers`, and gives `getUpdates` each batch of `batches`
 * once, then waits until the request is aborted, as a long poll does.
 */
function fakeBotApi(batches: DynamicRecord[][], answers: Partial<Record<string, Answer>> = {}) {
  const calls: Call[] = [];
  let messageId = 1000;
  const fetchImpl: TelegramFetch = async (url, init) => {
    expect(url.startsWith(`https://api.telegram.org/bot${TOKEN}/`)).toBe(true);
    const method = url.slice(url.lastIndexOf("/") + 1);
    const parsed = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    const params = isDynamicRecord(parsed) ? parsed : {};
    calls.push({ method, params });
    const ok = (result: DynamicRecord | DynamicRecord[] | boolean) =>
      new Response(JSON.stringify({ ok: true, result }));
    if (method === "getUpdates") {
      const batch = batches.shift();
      if (batch) return ok(batch);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      });
    }
    const answer = answers[method];
    if (answer instanceof Response) return answer;
    if (answer) return ok(answer);
    if (method === "sendMessage") return ok({ message_id: ++messageId });
    return ok(true);
  };
  return { calls, fetchImpl };
}

function directMessage(updateId: number, from: string, text: string) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1_000),
      from: { id: Number(from), is_bot: false, first_name: from === OWNER ? "Owner" : "Stranger" },
      chat: { id: Number(from), type: "private", first_name: "Person" },
      text,
    },
  };
}

function botAdded(updateId: number, by: string) {
  return {
    update_id: updateId,
    my_chat_member: {
      chat: { id: Number(GROUP), type: "supergroup", title: "Team" },
      from: { id: Number(by), is_bot: false, first_name: "Someone" },
      date: Math.floor(Date.now() / 1_000),
      old_chat_member: { user: { id: Number(BOT_ID), is_bot: true }, status: "left" },
      new_chat_member: { user: { id: Number(BOT_ID), is_bot: true }, status: "member" },
    },
  };
}

function start(
  batches: DynamicRecord[][],
  store = memoryStore(),
  answers: Partial<Record<string, Answer>> = {},
  access = new TelegramBotAccess(store),
) {
  const bot = fakeBotApi(batches, answers);
  const driver = telegramBotDriver({ access, fetch: bot.fetchImpl });
  const credentials = { botToken: TOKEN, botId: BOT_ID, botUsername: "agent_bot" };
  driver.createAdapter(credentials, { connectionId: "connection-1", rateLimited: () => undefined });
  const transport = driver.createTransport(credentials, {
    workspaceId: BOT_ID,
    workspaceName: "@agent_bot",
    botUserId: BOT_ID,
    appId: BOT_ID,
    missingScopes: [],
  });
  const messages: InboundMessage[] = [];
  const states: string[] = [];
  const sink: TransportSink = {
    state: (state) => states.push(state),
    message: (message) => messages.push(message),
    action: () => undefined,
  };
  transport.start(sink);
  stops.push(() => Effect.runPromise(transport.stop()));
  return { access, store, bot, messages, states };
}

const stops: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const stop of stops.splice(0)) await stop();
});

describe("TelegramBotAccess", () => {
  it("gives a pairing code once and allows the person when the owner approves", () => {
    const access = new TelegramBotAccess(memoryStore());
    const first = access.pair(BOT_ID, STRANGER, "Stranger");
    expect(first?.created).toBe(true);
    expect(access.pair(BOT_ID, STRANGER, "Stranger")).toEqual({ code: first?.code, created: false });
    expect(access.answer(BOT_ID, first?.code ?? "", true)?.senderId).toBe(STRANGER);
    expect(access.allowedUser(BOT_ID, STRANGER)).toBe(true);
    expect(access.requests(BOT_ID)).toEqual([]);
  });

  it("takes a link code once, and only for its own bot", () => {
    const access = new TelegramBotAccess(memoryStore());
    const code = access.createLink(BOT_ID);
    expect(access.consumeLink("999", code)).toBe(false);
    expect(access.consumeLink(BOT_ID, code)).toBe(true);
    expect(access.consumeLink(BOT_ID, code)).toBe(false);
  });

  it("keeps at most three people waiting", () => {
    const access = new TelegramBotAccess(memoryStore());
    for (const id of ["1", "2", "3"]) expect(access.pair(BOT_ID, id, id)?.created).toBe(true);
    expect(access.pair(BOT_ID, "4", "4")).toBeNull();
  });
});

describe("directTelegramGateway", () => {
  it("answers the fields the upstream adapter reads", async () => {
    const bot = fakeBotApi([], { getMe: { id: Number(BOT_ID), is_bot: true, username: "agent_bot" } });
    const gateway = directTelegramGateway(new TelegramBotApi({ token: TOKEN, fetch: bot.fetchImpl }));
    expect(await Effect.runPromise(gateway.call(BOT_ID, "getMe", {}))).toEqual({
      botId: BOT_ID,
      username: "agent_bot",
    });
    const sent = await Effect.runPromise(gateway.call(BOT_ID, "sendMessage", { chat_id: 1, text: "hi" }));
    expect(sent.messageId).toBeGreaterThan(1000);
  });

  it("gives Telegram's error code and wait, and never the URL", async () => {
    const limited = new Response(
      JSON.stringify({ ok: false, error_code: 429, description: "Too Many Requests", parameters: { retry_after: 7 } }),
      { status: 429 },
    );
    const bot = fakeBotApi([], { sendMessage: limited });
    const gateway = directTelegramGateway(new TelegramBotApi({ token: TOKEN, fetch: bot.fetchImpl }));
    const result = await Effect.runPromise(
      Effect.flip(gateway.call(BOT_ID, "sendMessage", { chat_id: 1, text: "hi" })),
    );
    const error = result.cause;
    if (!(error instanceof TelegramCallError)) throw new Error("expected a Telegram error");
    expect(error.retryAfter).toBe(7);
    expect(error.message).not.toContain(TOKEN);
  });
});

describe("TelegramBotTransport", () => {
  it("gives a stranger one pairing code and nothing to the agent", async () => {
    const { bot, messages, access } = start([
      [directMessage(1, STRANGER, "hello"), directMessage(2, STRANGER, "again")],
    ]);
    await vi.waitFor(() => expect(access.requests(BOT_ID)).toHaveLength(1));
    await vi.waitFor(() => expect(bot.calls.filter((call) => call.method === "getUpdates").length).toBe(2));
    const notices = bot.calls.filter((call) => call.method === "sendMessage");
    expect(notices).toHaveLength(1);
    expect(String(notices[0]?.params.text)).toContain(access.requests(BOT_ID)[0]?.code ?? "missing");
    expect(messages).toEqual([]);
  });

  it("allows the owner who opens the link, and then hands on the owner's messages", async () => {
    const store = memoryStore();
    const access = new TelegramBotAccess(store);
    const code = access.createLink(BOT_ID);
    const { bot, messages } = start(
      [[directMessage(1, OWNER, `/start ${code}`)], [directMessage(2, OWNER, "What is new?")]],
      store,
      {},
      access,
    );
    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(store.senders).toEqual([{ id: OWNER, kind: "contact", name: "Owner" }]);
    expect(messages[0]).toMatchObject({
      platformChannelId: OWNER,
      threadKey: "dm",
      isDirect: true,
      text: "What is new?",
    });
    // The offset confirms each update that was handed on.
    const polls = bot.calls.filter((call) => call.method === "getUpdates");
    expect(polls.at(-1)?.params.offset).toBe(3);
  });

  it("allows a group that an allowed person adds, and leaves one that a stranger adds", async () => {
    const store = memoryStore();
    store.senders.push({ id: OWNER, kind: "contact", name: "Owner", readOnly: false });
    const allowed = start([[botAdded(1, OWNER)]], store);
    await vi.waitFor(() => expect(allowed.access.allowedGroup(BOT_ID, GROUP)).toBe(true));

    const other = start([[botAdded(1, STRANGER)]]);
    await vi.waitFor(() => expect(other.bot.calls.some((call) => call.method === "leaveChat")).toBe(true));
    expect(other.access.allowedGroup(BOT_ID, GROUP)).toBe(false);
  });

  it("stops with invalid_token when Telegram refuses the token", async () => {
    const refused = new Response(JSON.stringify({ ok: false, error_code: 401, description: "Unauthorized" }), {
      status: 401,
    });
    const { states } = start([], memoryStore(), { deleteWebhook: refused });
    await vi.waitFor(() => expect(states).toContain("invalid_token"));
  });
});

describe("/new", () => {
  it("takes only the bare command", () => {
    expect(NEW_CONVERSATION_TEXT.test("/new")).toBe(true);
    expect(NEW_CONVERSATION_TEXT.test("/NEW")).toBe(true);
    expect(NEW_CONVERSATION_TEXT.test("/new idea")).toBe(false);
    expect(NEW_CONVERSATION_TEXT.test("/newest")).toBe(false);
  });

  it("keeps a late answer of the retired conversation in its chat, topic or reply chain", () => {
    expect(telegramPlacement({ platformChannelId: OWNER, replyThreadId: "dm:new-1" })).toEqual(
      telegramPlacement({ platformChannelId: OWNER, replyThreadId: "dm" }),
    );
    expect(telegramPlacement({ platformChannelId: GROUP, replyThreadId: "t5:new-1" })).toEqual(
      telegramPlacement({ platformChannelId: GROUP, replyThreadId: "t5" }),
    );
    expect(telegramPlacement({ platformChannelId: GROUP, replyThreadId: "42:new-1" })).toEqual(
      telegramPlacement({ platformChannelId: GROUP, replyThreadId: "42" }),
    );
  });
});
