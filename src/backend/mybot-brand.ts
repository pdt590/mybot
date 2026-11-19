// MyBot: the agents call the app MyBot. The upstream prompts, tool descriptions, tool results, notes
// and skills say "OpenBot". They stay as upstream wrote them, so a sync has no conflict and the code
// that reads its own stored prompts back still finds its markers. The text is renamed only on its way
// to a provider: `brandProviderDrivers` (every request, response and notification of a provider
// client), the local MCP bridge (tool list, server instructions and tool results) and the managed skills.

import { OPENBOT_COMMIT_TRAILER } from "@openbot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord } from "@openbot/contracts/runtime-values";
import type { AgentClient } from "./agent-client";
import type { BuiltInProviderDriver } from "./provider-drivers";

/**
 * "OpenBot" as a word. Not after a letter, digit, `_`, `@`, `/`, `\`, `.` or `-`, and not before a
 * letter, digit, `_`, `/`, `\`, `-` or a `.` that goes on with a letter or digit. So identifiers
 * (`OpenBotDatabase`, `answerInOpenBot`), paths (`~/OpenBot/...`, `C:\...\OpenBot`), file and asset
 * names (`OpenBot.exe`, `OpenBot-1.0-x64.exe`) and headers (`X-OpenBot-...`) keep their names, while
 * "OpenBot." at the end of a sentence is renamed.
 */
const BRAND = /(?<![A-Za-z0-9_@/\\.-])OpenBot(?![A-Za-z0-9_/\\-]|\.[A-Za-z0-9])/g;
/** "an OpenBot" reads "a MyBot". */
const ARTICLE = /\b([Aa])n (?=OpenBot(?![A-Za-z0-9_/\\-]|\.[A-Za-z0-9]))/g;

/**
 * The text with the app's name MyBot. The commit trailer stays exact: it names a GitHub account, and
 * the co-author tool and the commit checks compare it as it is.
 */
export function mybotBrand(text: string): string {
  if (!text.includes("OpenBot")) return text;
  return text
    .split(OPENBOT_COMMIT_TRAILER)
    .map((part) => part.replace(ARTICLE, "$1 ").replace(BRAND, "MyBot"))
    .join(OPENBOT_COMMIT_TRAILER);
}

/**
 * What goes to a provider: the params of a request or notification, or a response. Its strings are
 * renamed; any other value passes as it is.
 */
export type ProviderPayload = NonNullable<unknown> | null | undefined;

/**
 * Each string in a JSON-like value, renamed. Keys, class instances and binary data stay as they are,
 * and a part with nothing to rename is the same value.
 */
export function mybotBrandDeep(value: unknown): ProviderPayload {
  if (typeof value === "string") return mybotBrand(value);
  if (Array.isArray(value)) {
    const next = value.map(mybotBrandDeep);
    return next.some((entry, index) => entry !== value[index]) ? next : value;
  }
  if (!isDynamicRecord(value)) return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;
  return brandedRecord(value);
}

function brandedRecord(value: DynamicRecord): DynamicRecord {
  const entries = Object.entries(value).map(([key, entry]) => [key, mybotBrandDeep(entry)] as const);
  return entries.some(([key, entry]) => entry !== value[key]) ? Object.fromEntries(entries) : value;
}

/** The members of a provider client that send to its provider. */
type ProviderOutput = Pick<AgentClient, "request" | "respond" | "notify">;

/**
 * Makes the client rename each request, response and notification that it sends to its provider:
 * the developer instructions, the turn input and its notes, the dynamic tools and the tool results.
 * What the provider sends back is not changed. The client stays the same object.
 */
export function brandedAgentClient<C extends ProviderOutput>(client: C): C {
  const request = client.request.bind(client);
  const respond = client.respond.bind(client);
  const notify = client.notify.bind(client);
  const branded: ProviderOutput = {
    request: (method, params, decoder, timeoutMs) => request(method, mybotBrandDeep(params), decoder, timeoutMs),
    respond: (id, result) => respond(id, mybotBrandDeep(result)),
    notify: (method, params) => notify(method, mybotBrandDeep(params)),
  };
  // `request` is a readonly field of most clients, so it is defined again rather than assigned.
  Object.defineProperties(client, {
    request: { value: branded.request, configurable: true, writable: true },
    respond: { value: branded.respond, configurable: true, writable: true },
    notify: { value: branded.notify, configurable: true, writable: true },
  });
  return client;
}

function brandedFactory<A extends unknown[]>(create: (...args: A) => AgentClient): (...args: A) => AgentClient {
  return (...args) => brandedAgentClient(create(...args));
}

/** Makes every client of these provider drivers a branded one. Call it once. */
export function brandProviderDrivers(drivers: readonly BuiltInProviderDriver[]): void {
  for (const driver of drivers) {
    driver.createClient = brandedFactory(driver.createClient.bind(driver));
    if (driver.createProfileClient)
      driver.createProfileClient = brandedFactory(driver.createProfileClient.bind(driver));
    if (driver.createMediaClient) driver.createMediaClient = brandedFactory(driver.createMediaClient.bind(driver));
  }
}
