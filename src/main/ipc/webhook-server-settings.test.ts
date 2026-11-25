import { isWebhookServerStatus, parseWebhookServerSettings } from "@openbot/contracts/ipc";
import { describe, expect, it } from "vitest";

describe("webhook server settings", () => {
  it("trims the addresses and turns an empty public address into null", () => {
    expect(parseWebhookServerSettings({ bindAddress: " 0.0.0.0 ", port: 8080, publicUrl: "  " })).toEqual({
      bindAddress: "0.0.0.0",
      port: 8080,
      publicUrl: null,
    });
    expect(
      parseWebhookServerSettings({ bindAddress: "127.0.0.1", port: 1, publicUrl: "https://hooks.example.com/" }),
    ).toEqual({ bindAddress: "127.0.0.1", port: 1, publicUrl: "https://hooks.example.com/" });
  });

  it("refuses bad ports and public addresses", () => {
    for (const input of [
      { bindAddress: "127.0.0.1", port: 0, publicUrl: null },
      { bindAddress: "127.0.0.1", port: 65_536, publicUrl: null },
      { bindAddress: "127.0.0.1", port: "8080", publicUrl: null },
      { bindAddress: "", port: 8080, publicUrl: null },
      { bindAddress: "127.0.0.1", port: 8080, publicUrl: "ftp://hooks.example.com" },
      { bindAddress: "127.0.0.1", port: 8080, publicUrl: "https://user:secret@hooks.example.com" },
      { bindAddress: "127.0.0.1", port: 8080, publicUrl: "https://hooks.example.com/?a=1" },
    ])
      expect(() => parseWebhookServerSettings(input)).toThrow();
  });

  it("checks a status from main", () => {
    const status = {
      bindAddress: "127.0.0.1",
      port: 47_811,
      publicUrl: null,
      enabled: false,
      listening: false,
      problem: "port_in_use",
      baseUrl: "http://127.0.0.1:47811",
    };
    expect(isWebhookServerStatus(status)).toBe(true);
    expect(isWebhookServerStatus({ ...status, problem: "other" })).toBe(false);
  });
});
