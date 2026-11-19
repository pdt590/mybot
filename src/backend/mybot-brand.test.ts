// @vitest-environment node

import { OPENBOT_COMMIT_TRAILER } from "@openbot/contracts/ipc";
import { isDynamicRecord } from "@openbot/contracts/runtime-values";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { brandedAgentClient, mybotBrand, mybotBrandDeep } from "./mybot-brand";
import type { RequestId, ResponseDecoder } from "./protocol";

describe("mybotBrand", () => {
  it("renames the app in prose", () => {
    expect(mybotBrand("You are a persistent local OpenBot teammate.")).toBe(
      "You are a persistent local MyBot teammate.",
    );
    expect(mybotBrand("How to do something in OpenBot.")).toBe("How to do something in MyBot.");
    expect(mybotBrand("OpenBot's browser, the OpenBot Vault, (OpenBot)")).toBe(
      "MyBot's browser, the MyBot Vault, (MyBot)",
    );
    expect(mybotBrand("Ask an OpenBot teammate. An OpenBot bug. A plan, an OpenBotDatabase.")).toBe(
      "Ask a MyBot teammate. A MyBot bug. A plan, an OpenBotDatabase.",
    );
  });

  it("keeps identifiers, paths, file names, headers and tool names", () => {
    for (const text of [
      "OpenBotDatabase",
      "answerInOpenBot",
      "@OpenBot",
      "~/OpenBot/workspace",
      "C:\\Users\\me\\OpenBot\\agents",
      "OpenBot.exe",
      "OpenBot-1.0.0-x64.exe",
      "X-OpenBot-Team",
      "openbot.show_setting",
      "openbot.db",
    ])
      expect(mybotBrand(text)).toBe(text);
  });

  it("keeps the commit trailer exact", () => {
    const text = `End its message with this trailer once: ${OPENBOT_COMMIT_TRAILER}. Ask OpenBot.`;
    expect(mybotBrand(text)).toBe(`End its message with this trailer once: ${OPENBOT_COMMIT_TRAILER}. Ask MyBot.`);
  });

  it("renames the strings of a JSON value, not its keys", () => {
    const value = { OpenBot: "Open OpenBot", list: ["OpenBot", 3, null], same: { a: "x" } };
    const branded = mybotBrandDeep(value);
    expect(branded).toEqual({ OpenBot: "Open MyBot", list: ["MyBot", 3, null], same: { a: "x" } });
    expect(isDynamicRecord(branded) && branded.same).toBe(value.same);
    expect(value.list[0]).toBe("OpenBot");
  });
});

class FakeClient {
  readonly #sent: unknown[] = [];
  readonly provider = "codex";
  get sent() {
    return this.#sent;
  }
  readonly request = <T>(method: string, params: unknown, decoder: ResponseDecoder<T>) => {
    this.#sent.push({ method, params });
    return Effect.succeed(decoder(params));
  };
  respond(id: RequestId, result: unknown) {
    this.#sent.push({ id, result });
  }
  notify(method: string, params?: unknown) {
    this.#sent.push({ method, params });
  }
}

describe("brandedAgentClient", () => {
  it("renames what goes to the provider and keeps the client's own members", () => {
    const fake = new FakeClient();
    const client = brandedAgentClient(fake);
    client.request("thread/start", { developerInstructions: "An OpenBot teammate" }, (value) => value);
    client.respond(1, { contentItems: [{ type: "inputText", text: "OpenBot Settings" }] });
    client.notify("turn/steer", { text: "OpenBot note" });
    expect(fake.sent).toEqual([
      { method: "thread/start", params: { developerInstructions: "A MyBot teammate" } },
      { id: 1, result: { contentItems: [{ type: "inputText", text: "MyBot Settings" }] } },
      { method: "turn/steer", params: { text: "MyBot note" } },
    ]);
    expect(client.provider).toBe("codex");
    expect(client).toBe(fake);
  });
});
