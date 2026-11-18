// MyBot: the Bot API of an agent's own Telegram bot, called by this computer with the bot's token.
// The upstream Telegram connector calls the one OpenBot bot through Signal, which holds its token;
// `directTelegramGateway` gives the upstream adapter the same `TelegramGateway` over this client, so
// the adapter, its rendering and its retries work unchanged.
//
// The token is in every URL, so no URL, request or `fetch` error leaves this file: a failure is a
// `TelegramCallError` with Telegram's own description, or `TelegramUnreachable`.

import { randomUUID } from "node:crypto";
import { open, readFile, rm } from "node:fs/promises";
import { basename } from "node:path";
import { type DynamicRecord, isDynamicRecord, isNumber, isString } from "@openbot/contracts/runtime-values";
import type {
  TelegramCallMethod,
  TelegramCallParams,
  TelegramCallResult,
} from "@openbot/contracts/signal-protocol/telegram-route";
import { createOpenBotLogger } from "@openbot/logging";
import { Effect } from "effect";
import { MessagingAdapterError, TelegramCallError, type TelegramGateway } from "../messaging-types";

const logger = createOpenBotLogger("telegram-bot");

export const TELEGRAM_BOT_API_ORIGIN = "https://api.telegram.org";
/** How long a `sendDocument` ticket waits for its upload. */
const UPLOAD_TICKET_MS = 2 * 60_000;
/** A Bot API description is short; a longer one is cut, as Signal does. */
const DESCRIPTION_LIMIT = 256;

/** Telegram could not be reached: no network, DNS, TLS, or a block. Says nothing about the request. */
export class TelegramUnreachable extends Error {
  constructor() {
    super("Telegram is unreachable.");
    this.name = "TelegramUnreachable";
  }
}

/** The part of `fetch` this client uses, so a test can give a plain function. */
export type TelegramFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface TelegramBotApiOptions {
  token: string;
  /** Only tests change these. */
  fetch?: TelegramFetch;
  origin?: string;
}

export class TelegramBotApi {
  readonly botId: string;
  readonly #token: string;
  readonly #fetch: TelegramFetch;
  readonly #origin: string;

  constructor(options: TelegramBotApiOptions) {
    this.#token = options.token;
    this.botId = options.token.split(":")[0] ?? "";
    this.#fetch = options.fetch ?? ((input, init) => fetch(input, init));
    this.#origin = options.origin ?? TELEGRAM_BOT_API_ORIGIN;
  }

  /** One Bot API method with a JSON body. Returns its `result` object, or null for `true`. */
  async call(method: string, params: DynamicRecord, signal?: AbortSignal): Promise<DynamicRecord | null> {
    const body = await this.#json(method, params, signal);
    return isDynamicRecord(body.result) ? body.result : null;
  }

  /** `getUpdates`: the updates, oldest first. */
  async updates(params: DynamicRecord, signal?: AbortSignal): Promise<DynamicRecord[]> {
    const body = await this.#json("getUpdates", params, signal);
    return Array.isArray(body.result) ? body.result.filter(isDynamicRecord) : [];
  }

  /** `sendDocument` with the bytes of one file. Returns the message it sent. */
  async sendDocument(params: Record<string, string>, path: string, fileName: string): Promise<DynamicRecord | null> {
    const form = new FormData();
    for (const [key, value] of Object.entries(params)) form.set(key, value);
    form.set("document", new Blob([await readFile(path)]), fileName || basename(path));
    const body = await answer(await this.#send(`/bot${this.#token}/sendDocument`, { method: "POST", body: form }));
    return isDynamicRecord(body.result) ? body.result : null;
  }

  /** Writes the file at `filePath` (from `getFile`) to `destination`. Refuses more than `maxBytes`. */
  async download(filePath: string, destination: string, maxBytes: number): Promise<void> {
    const response = await this.#send(`/file/bot${this.#token}/${filePath}`, { method: "GET" });
    if (!response.ok || !response.body) throw new TelegramCallError(response.status, "file download failed", null);
    const file = await open(destination, "w", 0o600);
    let size = 0;
    try {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new TelegramCallError(400, "file too large", null);
        }
        await file.write(value);
      }
    } catch (error) {
      await file.close();
      await rm(destination, { force: true });
      throw error instanceof TelegramCallError ? error : new TelegramUnreachable();
    }
    await file.close();
  }

  async #json(method: string, params: DynamicRecord, signal: AbortSignal | undefined): Promise<DynamicRecord> {
    const response = await this.#send(`/bot${this.#token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
      ...(signal ? { signal } : {}),
    });
    return answer(response);
  }

  async #send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await this.#fetch(`${this.#origin}${path}`, init);
    } catch (error) {
      // An abort is the caller's own; anything else could quote the URL, and so the token. Only the
      // error's code is logged.
      if (error instanceof Error && error.name === "AbortError") throw error;
      logger.warn("Telegram could not be reached.", { error: networkErrorCode(error) });
      throw new TelegramUnreachable();
    }
  }
}

/** A code such as `UND_ERR_CONNECT_TIMEOUT` or `net::ERR_CONNECTION_TIMED_OUT`, never a message. */
function networkErrorCode(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (isDynamicRecord(cause) && isString(cause.code)) return cause.code.slice(0, 64);
  if (error instanceof Error) {
    const code = /net::ERR_[A-Z_]+/u.exec(error.message)?.[0];
    return code ?? error.name;
  }
  return "unknown";
}

function jsonRecord(text: string): DynamicRecord | null {
  try {
    const value = JSON.parse(text);
    return isDynamicRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** The whole answer of a method that succeeded. A failure throws Telegram's code and description. */
async function answer(response: Response): Promise<DynamicRecord> {
  const body = jsonRecord(await response.text().catch(() => ""));
  if (body?.ok === true) return body;
  const errorCode = body && isNumber(body.error_code) ? body.error_code : response.status;
  const description =
    body && isString(body.description) ? body.description.slice(0, DESCRIPTION_LIMIT) : `HTTP ${response.status}`;
  const parameters = body && isDynamicRecord(body.parameters) ? body.parameters : null;
  const retryAfter = parameters && isNumber(parameters.retry_after) ? parameters.retry_after : null;
  throw new TelegramCallError(errorCode, description, retryAfter);
}

function isSendDocument(params: TelegramCallParams[TelegramCallMethod]): params is TelegramCallParams["sendDocument"] {
  return "file_name" in params && "chat_id" in params;
}

/**
 * The `TelegramGateway` of one bot over its own token. It answers each call as Signal does: only the
 * fields the adapter reads. `getFile` gives the file path as the file token; `sendDocument` gives a
 * ticket that keeps its parameters in memory until `upload` sends the bytes.
 */
export function directTelegramGateway(api: TelegramBotApi): TelegramGateway {
  const uploads = new Map<string, TelegramCallParams["sendDocument"]>();

  async function callMethod(
    method: TelegramCallMethod,
    params: TelegramCallParams[TelegramCallMethod],
  ): Promise<TelegramCallResult> {
    if (method === "getMe") {
      const me = await api.call("getMe", {});
      return me ? { botId: String(me.id), ...(isString(me.username) ? { username: me.username } : {}) } : {};
    }
    // `file_id` is only in `getFile`.
    if ("file_id" in params) {
      const file = await api.call("getFile", { file_id: params.file_id });
      if (!file || !isString(file.file_path)) return {};
      return { fileToken: file.file_path, ...(isNumber(file.file_size) ? { fileSize: file.file_size } : {}) };
    }
    if (method === "sendDocument" && isSendDocument(params)) {
      const ticket = randomUUID();
      uploads.set(ticket, params);
      setTimeout(() => uploads.delete(ticket), UPLOAD_TICKET_MS).unref?.();
      return { uploadToken: ticket };
    }
    const sent = await api.call(method, { ...params });
    return (method === "sendMessage" || method === "editMessageText") && sent && isNumber(sent.message_id)
      ? { messageId: sent.message_id }
      : {};
  }

  const failed = (cause: unknown) => new MessagingAdapterError({ cause });
  return {
    available: () => true,
    call: (_botId, method, params) => Effect.tryPromise({ try: () => callMethod(method, params), catch: failed }),
    download: (fileToken, destination, maxBytes) =>
      Effect.tryPromise({ try: () => api.download(fileToken, destination, maxBytes), catch: failed }),
    upload: (uploadToken, path) =>
      Effect.tryPromise({
        try: async () => {
          const params = uploads.get(uploadToken);
          uploads.delete(uploadToken);
          if (!params) throw new Error("upload_ticket_expired");
          const sent = await api.sendDocument(
            {
              chat_id: String(params.chat_id),
              ...(params.message_thread_id ? { message_thread_id: String(params.message_thread_id) } : {}),
              ...(params.reply_parameters ? { reply_parameters: JSON.stringify(params.reply_parameters) } : {}),
            },
            path,
            params.file_name,
          );
          if (!sent || !isNumber(sent.message_id)) throw new Error("no_message_id");
          return sent.message_id;
        },
        catch: failed,
      }),
  };
}
