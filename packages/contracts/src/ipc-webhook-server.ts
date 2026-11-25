/**
 * MyBot: the app's own webhook server (`src/main/local-webhook-server.ts`). It takes the deliveries of the
 * webhook triggers of this computer, in place of upstream's Signal relay. The settings say where it listens
 * and which address the senders use (`publicUrl`, for example a tunnel to this computer).
 */

import { isDynamicRecord, isOneOf } from "./runtime-values";

export const WEBHOOK_SERVER_DEFAULT_PORT = 47_811;
export const WEBHOOK_SERVER_LOOPBACK_ADDRESS = "127.0.0.1";
const BIND_ADDRESS_MAX_LENGTH = 255;
const PUBLIC_URL_MAX_LENGTH = 2048;
const BIND_ADDRESS_PATTERN =
  /^(?:[0-9]{1,3}(?:\.[0-9]{1,3}){3}|[0-9A-Fa-f:]{2,45}|[A-Za-z0-9](?:[A-Za-z0-9.-]{0,253}))$/u;

/** `port_in_use`: another program listens on the port. `unavailable`: the address is not on this computer. */
export const WEBHOOK_SERVER_PROBLEMS = ["port_in_use", "unavailable"] as const;
export type WebhookServerProblem = (typeof WEBHOOK_SERVER_PROBLEMS)[number];

export interface WebhookServerSettings {
  /** The address that the server listens on: `127.0.0.1` for this computer only, `0.0.0.0` for every network. */
  bindAddress: string;
  port: number;
  /** The address that senders use, without the `/v1/webhooks/...` path. Null: the local address. */
  publicUrl: string | null;
}

export interface WebhookServerStatus extends WebhookServerSettings {
  /** True while some webhook trigger exists; the server is off otherwise. */
  enabled: boolean;
  listening: boolean;
  problem: WebhookServerProblem | null;
  /** The base address of the routes, `publicUrl` or the local one. */
  baseUrl: string;
}

export function isWebhookServerBindAddress(value: unknown): value is string {
  return typeof value === "string" && value.length <= BIND_ADDRESS_MAX_LENGTH && BIND_ADDRESS_PATTERN.test(value);
}

export function isWebhookServerPort(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 65_535;
}

export function isWebhookServerPublicUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > PUBLIC_URL_MAX_LENGTH) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isSettings(value: unknown): value is WebhookServerSettings {
  return (
    isDynamicRecord(value) &&
    isWebhookServerBindAddress(value.bindAddress) &&
    isWebhookServerPort(value.port) &&
    (value.publicUrl === null || isWebhookServerPublicUrl(value.publicUrl))
  );
}

export function isWebhookServerStatus(value: unknown): value is WebhookServerStatus {
  return (
    isSettings(value) &&
    isDynamicRecord(value) &&
    typeof value.enabled === "boolean" &&
    typeof value.listening === "boolean" &&
    (value.problem === null || isOneOf(WEBHOOK_SERVER_PROBLEMS, value.problem)) &&
    typeof value.baseUrl === "string"
  );
}

export function parseWebhookServerSettings(value: unknown): WebhookServerSettings {
  if (!isDynamicRecord(value)) throw new Error("Invalid webhook server settings.");
  const bindAddress = typeof value.bindAddress === "string" ? value.bindAddress.trim() : "";
  const publicUrl = typeof value.publicUrl === "string" ? value.publicUrl.trim() : null;
  const settings = { bindAddress, port: value.port, publicUrl: publicUrl === "" ? null : publicUrl };
  if (!isSettings(settings)) throw new Error("Invalid webhook server settings.");
  return settings;
}

export function decodeWebhookServerStatus(value: unknown): WebhookServerStatus {
  if (!isWebhookServerStatus(value)) throw new Error("Invalid webhook server response.");
  return value;
}
