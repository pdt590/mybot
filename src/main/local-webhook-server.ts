// MyBot: the app itself is the webhook server. Upstream sends webhooks through the Signal relay
// (`signal.openbot.run`) and registers each route with the upstream account service; MyBot has neither,
// so this listener takes deliveries directly and hands them to `HostEventsService.receive`.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  isWebhookServerBindAddress,
  isWebhookServerPort,
  isWebhookServerPublicUrl,
  WEBHOOK_SERVER_DEFAULT_PORT,
  WEBHOOK_SERVER_LOOPBACK_ADDRESS,
  type WebhookServerProblem,
  type WebhookServerSettings,
  type WebhookServerStatus,
} from "@openbot/contracts/ipc";
import {
  WEBHOOK_DELIVERY_BODY_BYTES_LIMIT,
  type WebhookDeliveryStatus,
} from "@openbot/contracts/signal-protocol/messages";
import {
  STANDARD_WEBHOOK_HEADER_SETS,
  STANDARD_WEBHOOK_SIGNATURE_PATTERN,
  STANDARD_WEBHOOKS_FORMAT,
  WEBHOOK_DELIVERY_ID_PATTERN,
  WEBHOOK_EVENTS_PATH,
  WEBHOOK_ROUTE_ID_PATTERN,
  WEBHOOK_SIGNATURE_PATTERN,
  WEBHOOK_TIMESTAMP_PATTERN,
  type WebhookSignatureFormat,
} from "@openbot/contracts/signal-protocol/webhook-route";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";
import { Effect, Result, Schema, Semaphore } from "effect";
import { z } from "zod";
import {
  MYBOT_WEBHOOK_DELIVERY_ID_HEADER,
  MYBOT_WEBHOOK_SIGNATURE_HEADER,
  MYBOT_WEBHOOK_TIMESTAMP_HEADER,
} from "../backend/mybot-webhook-headers";
import type { HostWebhookRelay } from "./host-events-service";
import { readBodyWithin } from "./http-body";
import { readPreferenceFile, writePreferenceFile } from "./preference-file";
import type { WebhookIngressDelivery, WebhookIngressHandler } from "./signal-ingress";

const logger = createOpenBotLogger("local-webhooks");

export const LOCAL_WEBHOOK_SERVER_FILE = "mybot-webhook-server.json";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;
const RATE_KEYS_LIMIT = 10_000;

const configSchema = z.object({
  version: z.literal(1),
  bindAddress: z.string().trim().refine(isWebhookServerBindAddress),
  port: z.number().refine(isWebhookServerPort),
  publicUrl: z.string().trim().refine(isWebhookServerPublicUrl).nullable(),
});

export type LocalWebhookServerConfig = z.infer<typeof configSchema>;

export const DEFAULT_LOCAL_WEBHOOK_CONFIG: LocalWebhookServerConfig = {
  version: 1,
  bindAddress: WEBHOOK_SERVER_LOOPBACK_ADDRESS,
  port: WEBHOOK_SERVER_DEFAULT_PORT,
  publicUrl: null,
};

export class LocalWebhookServerFailed extends Schema.TaggedError<LocalWebhookServerFailed>()(
  "LocalWebhookServerFailed",
  { cause: Schema.Defect() },
) {}

interface HeaderSet {
  deliveryId: string;
  timestamp: string;
  signature: string;
  pattern: RegExp;
  format?: WebhookSignatureFormat;
}

const HEADER_SETS: readonly HeaderSet[] = [
  {
    deliveryId: MYBOT_WEBHOOK_DELIVERY_ID_HEADER,
    timestamp: MYBOT_WEBHOOK_TIMESTAMP_HEADER,
    signature: MYBOT_WEBHOOK_SIGNATURE_HEADER,
    pattern: WEBHOOK_SIGNATURE_PATTERN,
  },
  ...STANDARD_WEBHOOK_HEADER_SETS.map(
    (names): HeaderSet => ({ ...names, pattern: STANDARD_WEBHOOK_SIGNATURE_PATTERN, format: STANDARD_WEBHOOKS_FORMAT }),
  ),
];

function header(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name];
  if (value === undefined) return null;
  return Array.isArray(value) ? (value.length === 1 ? (value[0] ?? null) : null) : value;
}

export function localWebhookSignedHeaders(
  request: IncomingMessage,
): Omit<WebhookIngressDelivery, "routeId" | "body"> | null {
  for (const names of HEADER_SETS) {
    const timestamp = header(request, names.timestamp);
    const deliveryId = header(request, names.deliveryId);
    const signature = header(request, names.signature);
    if (timestamp === null && deliveryId === null && signature === null) continue;
    if (
      timestamp === null ||
      deliveryId === null ||
      signature === null ||
      !WEBHOOK_TIMESTAMP_PATTERN.test(timestamp) ||
      !WEBHOOK_DELIVERY_ID_PATTERN.test(deliveryId) ||
      !names.pattern.test(signature)
    )
      return null;
    return { timestamp, deliveryId, signature, ...(names.format ? { format: names.format } : {}) };
  }
  return null;
}

export function localWebhookBaseUrl(config: WebhookServerSettings): string {
  return config.publicUrl
    ? config.publicUrl.replace(/\/+$/u, "")
    : `http://${displayHost(config.bindAddress)}:${config.port}`;
}

export function localWebhookRouteUrl(config: WebhookServerSettings, routeId: string): string {
  return `${localWebhookBaseUrl(config)}${WEBHOOK_EVENTS_PATH}/${encodeURIComponent(routeId)}`;
}

function displayHost(bindAddress: string): string {
  if (bindAddress === "0.0.0.0" || bindAddress === "::") return WEBHOOK_SERVER_LOOPBACK_ADDRESS;
  return bindAddress.includes(":") ? `[${bindAddress}]` : bindAddress;
}

function listenProblem(error: unknown): WebhookServerProblem {
  return error instanceof Error && "code" in error && error.code === "EADDRINUSE" ? "port_in_use" : "unavailable";
}

export interface LocalWebhookServerOptions {
  /** Path of `mybot-webhook-server.json` in userData. */
  path: string;
  /** Called when the address of the routes changes, so that every route gets its new URL. */
  onAddressChanged?: () => void;
}

export class LocalWebhookServer implements HostWebhookRelay {
  readonly #options: LocalWebhookServerOptions;
  readonly #lock = Semaphore.makeUnsafe(1);
  #config: LocalWebhookServerConfig = DEFAULT_LOCAL_WEBHOOK_CONFIG;
  #handler: WebhookIngressHandler | null = null;
  #server: Server | null = null;
  #opening: Promise<void> | null = null;
  #listening = false;
  #problem: WebhookServerProblem | null = null;
  #enabled = false;
  #active = true;
  #stopped = false;
  readonly #rates = new Map<string, { start: number; count: number }>();

  constructor(options: LocalWebhookServerOptions) {
    this.#options = options;
  }

  /** Reads the settings file, or writes the default one so that it can be edited. */
  readonly load = Effect.fn("LocalWebhookServer.load")(function* (this: LocalWebhookServer) {
    const { path } = this.#options;
    const stored = yield* Effect.result(readPreferenceFile(path, (value) => configSchema.parse(value)));
    if (Result.isSuccess(stored)) {
      this.#config = stored.success;
      return;
    }
    const cause = stored.failure.cause;
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      const written = yield* Effect.result(writePreferenceFile(path, DEFAULT_LOCAL_WEBHOOK_CONFIG));
      if (Result.isFailure(written))
        logger.warn("The webhook server settings could not be written.", toLogValue(written.failure.cause));
      return;
    }
    logger.warn("The webhook server settings are invalid. The defaults are used.", toLogValue(cause));
  }).bind(this);

  status(): WebhookServerStatus {
    const { bindAddress, port, publicUrl } = this.#config;
    return {
      bindAddress,
      port,
      publicUrl,
      enabled: this.#enabled && this.#active,
      listening: this.#listening,
      problem: this.#problem,
      baseUrl: localWebhookBaseUrl(this.#config),
    };
  }

  /** Saves the settings, listens on the new address, and gives every route its new URL. */
  readonly save = Effect.fn("LocalWebhookServer.save")(
    function* (this: LocalWebhookServer, settings: WebhookServerSettings) {
      const next: LocalWebhookServerConfig = { version: 1, ...settings };
      const previous = this.#config;
      yield* writePreferenceFile(this.#options.path, next).pipe(
        Effect.mapError(({ cause }) => new LocalWebhookServerFailed({ cause })),
      );
      this.#config = next;
      const moved = previous.bindAddress !== next.bindAddress || previous.port !== next.port;
      if (moved && this.#server) {
        this.#close();
        yield* Effect.promise(() => this.#apply());
      } else if (moved) {
        this.#problem = null;
      }
      if (localWebhookBaseUrl(previous) !== localWebhookBaseUrl(next)) this.#options.onAddressChanged?.();
      logger.info("The webhook server settings changed.");
      return this.status();
    },
    (operation) => this.#lock.withPermit(operation),
  ).bind(this);

  handle(handler: WebhookIngressHandler | null): void {
    this.#handler = handler;
  }

  connected(): boolean {
    return this.#listening;
  }

  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
    void this.#apply();
  }

  setAccountActive(active: boolean): void {
    this.#active = active;
    void this.#apply();
  }

  refresh(): void {}

  ensureHost(): Effect.Effect<void> {
    return Effect.void;
  }

  registerRoute(routeId: string): Effect.Effect<string> {
    return Effect.sync(() => localWebhookRouteUrl(this.#config, routeId));
  }

  revokeRoute(): Effect.Effect<void> {
    return Effect.void;
  }

  stop(): void {
    this.#stopped = true;
    this.#handler = null;
    this.#close();
  }

  #apply(): Promise<void> {
    if (this.#stopped) return Promise.resolve();
    if (this.#enabled && this.#active) return this.#open();
    this.#close();
    return Promise.resolve();
  }

  #open(): Promise<void> {
    if (this.#server) return this.#opening ?? Promise.resolve();
    const { bindAddress, port } = this.#config;
    const server = createServer((request, response) => void this.#serve(request, response));
    server.requestTimeout = 15_000;
    server.headersTimeout = 10_000;
    this.#server = server;
    const opening = new Promise<void>((resolve) => {
      server.once("error", (error) => {
        logger.warn(`The webhook server could not listen on ${bindAddress}:${port}.`, toLogValue(error));
        if (this.#server === server) {
          this.#server = null;
          this.#listening = false;
          this.#problem = listenProblem(error);
        }
        server.close();
        resolve();
      });
      server.listen(port, bindAddress, () => {
        if (this.#server === server) {
          this.#listening = true;
          this.#problem = null;
          logger.info(`The webhook server listens on ${bindAddress}:${port}.`);
        }
        resolve();
      });
    });
    this.#opening = opening;
    void opening.then(() => {
      if (this.#opening === opening) this.#opening = null;
    });
    return opening;
  }

  #close(): void {
    const server = this.#server;
    this.#server = null;
    this.#opening = null;
    this.#listening = false;
    this.#problem = null;
    this.#rates.clear();
    if (server) {
      server.close();
      server.closeAllConnections();
    }
  }

  #allow(key: string, now: number): boolean {
    const rate = this.#rates.get(key);
    if (!rate || now - rate.start >= RATE_WINDOW_MS) {
      if (this.#rates.size >= RATE_KEYS_LIMIT) {
        for (const [stored, value] of this.#rates) if (now - value.start >= RATE_WINDOW_MS) this.#rates.delete(stored);
        if (this.#rates.size >= RATE_KEYS_LIMIT) return false;
      }
      this.#rates.set(key, { start: now, count: 1 });
      return true;
    }
    rate.count += 1;
    return rate.count <= RATE_LIMIT;
  }

  async #serve(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const status = await this.#answer(request).catch((error: unknown) => {
      logger.warn("A webhook delivery failed.", toLogValue(error));
      return 503 as const;
    });
    if (!response.headersSent) {
      response.writeHead(status, { "Cache-Control": "no-store", Connection: "close" });
      response.end();
    }
    if (!request.complete) request.destroy();
  }

  async #answer(request: IncomingMessage): Promise<WebhookDeliveryStatus | 405 | 415> {
    const url = new URL(request.url ?? "/", "http://localhost");
    const prefix = `${WEBHOOK_EVENTS_PATH}/`;
    if (!url.pathname.startsWith(prefix)) return 404;
    let routeId: string;
    try {
      routeId = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return 404;
    }
    if (!WEBHOOK_ROUTE_ID_PATTERN.test(routeId)) return 404;
    if (request.method !== "POST") return 405;
    const declaredLength = Number(request.headers["content-length"] ?? "0");
    if (!Number.isFinite(declaredLength) || declaredLength > WEBHOOK_DELIVERY_BODY_BYTES_LIMIT) return 413;
    const mediaType = request.headers["content-type"]?.split(";", 1)[0]?.trim().toLowerCase();
    if (mediaType !== "application/json") return 415;
    const signed = localWebhookSignedHeaders(request);
    if (!signed) return 401;
    const handler = this.#handler;
    if (!handler) return 503;
    if (!this.#allow(`${routeId}:${request.socket.remoteAddress ?? ""}`, Date.now())) return 429;
    const body = await readBodyWithin(request, WEBHOOK_DELIVERY_BODY_BYTES_LIMIT);
    if (!body) return 413;
    const answer = await Effect.runPromise(handler({ ...signed, routeId, body: new Uint8Array(body) }));
    return answer.status;
  }
}
