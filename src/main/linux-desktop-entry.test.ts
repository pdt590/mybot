import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { installLinuxDesktopEntry } from "./linux-desktop-entry";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** The `Exec` value of an entry for this path, quoted as the desktop entry specification asks. */
function exec(path: string): string {
  return `Exec="${path.replace(/(["`$\\])/gu, "\\$1")}" %U`;
}

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "mybot-desktop-"));
  roots.push(root);
  const iconPath = join(root, "icon.png");
  writeFileSync(iconPath, "icon");
  const applications = join(root, "data", "applications");
  mkdirSync(applications, { recursive: true });
  return { root, iconPath, applications, appImage: join(root, "MyBot.AppImage") };
}

// MyBot: the desktop entry is `mybot.desktop`; the `openbot.desktop` of an earlier MyBot build goes.
describe("MyBot Linux desktop entry", () => {
  it("writes mybot.desktop and removes the earlier entry of this AppImage", async () => {
    const { root, iconPath, applications, appImage } = sandbox();
    writeFileSync(join(applications, "openbot.desktop"), `[Desktop Entry]\n${exec(appImage)}\n`);
    const path = await Effect.runPromise(
      installLinuxDesktopEntry({
        platform: "linux",
        environment: { APPIMAGE: appImage, XDG_DATA_HOME: join(root, "data") },
        iconPath,
      }),
    );
    expect(path).toBe(join(applications, "mybot.desktop"));
    const entry = readFileSync(join(applications, "mybot.desktop"), "utf8");
    expect(entry).toContain("Name=MyBot\n");
    expect(entry).toContain("StartupWMClass=mybot\n");
    expect(entry).toContain("MimeType=x-scheme-handler/mybot;\n");
    expect(existsSync(join(applications, "openbot.desktop"))).toBe(false);
  });

  it("keeps an openbot.desktop that opens another app", async () => {
    const { root, iconPath, applications, appImage } = sandbox();
    const openBot = `[Desktop Entry]\n${exec(join(root, "OpenBot.AppImage"))}\n`;
    writeFileSync(join(applications, "openbot.desktop"), openBot);
    await Effect.runPromise(
      installLinuxDesktopEntry({
        platform: "linux",
        environment: { APPIMAGE: appImage, XDG_DATA_HOME: join(root, "data") },
        iconPath,
      }),
    );
    expect(readFileSync(join(applications, "openbot.desktop"), "utf8")).toBe(openBot);
  });
});
