import { createOpenBotInviteUrl, parseInviteUrl } from "@openbot/contracts/invite-links";
import { describe, expect, it } from "vitest";
import { MCP_OAUTH_REDIRECT_URL, parseDeepLink } from "./deep-link-router";

// MyBot: the app's only link scheme is `mybot://`; it does not read `openbot://` links.
describe("MyBot link scheme", () => {
  it("sends MCP sign-ins back to mybot://", () => {
    expect(MCP_OAUTH_REDIRECT_URL).toBe("mybot://mcp-auth");
    expect(parseDeepLink("mybot://mcp-auth?code=c&state=s")).toEqual({ kind: "mcp-auth", state: "s", code: "c" });
    expect(parseDeepLink("openbot://mcp-auth?code=c&state=s")).toBeNull();
  });

  it("makes and reads mybot://join invitations", () => {
    const payload = {
      apiUrl: "https://api.openbot.run/",
      serverId: "0b6f3c1e-4a2d-4f6b-9c8e-1d2a3b4c5d6e",
      fingerprint: "a".repeat(43),
      token: "b".repeat(43),
    };
    const url = createOpenBotInviteUrl(payload);
    expect(url.startsWith("mybot://join?")).toBe(true);
    expect(() => parseInviteUrl(url.replace(/^mybot:/u, "openbot:"))).toThrow();
    expect(parseDeepLink(url)?.kind).toBe("invite");
  });

  it("ignores links of other schemes", () => {
    expect(parseDeepLink("https://example.com/mcp-auth?code=c&state=s")).toBeNull();
    expect(parseDeepLink("mybotx://mcp-auth?code=c&state=s")).toBeNull();
  });
});
