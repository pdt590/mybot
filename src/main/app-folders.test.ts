import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { appDataFolderName, appUserDataFolder, appWorkspaceRoot, rebaseMovedFolderPaths } from "./app-folders";

const roots: string[] = [];

function sandbox(): { appData: string; home: string } {
  const root = mkdtempSync(join(tmpdir(), "mybot-folders-"));
  roots.push(root);
  const appData = join(root, "appData");
  const home = join(root, "home");
  mkdirSync(appData, { recursive: true });
  mkdirSync(home, { recursive: true });
  return { appData, home };
}

function seedDatabase(file: string, workspacePath: string): void {
  const db = new DatabaseSync(file);
  db.exec("CREATE TABLE agents (id TEXT PRIMARY KEY, agent_json TEXT, size INTEGER)");
  db.prepare("INSERT INTO agents VALUES (?, ?, ?)").run("agent-1", JSON.stringify({ workspacePath }), 1);
  db.prepare("INSERT INTO agents VALUES (?, ?, ?)").run("agent-2", `See ${workspacePath}${sep}notes.md`, 2);
  db.close();
}

function readRows(file: string): { id: string; agent_json: string }[] {
  const db = new DatabaseSync(file);
  const rows = db
    .prepare("SELECT id, agent_json FROM agents ORDER BY id")
    .all()
    .map((row) => ({ id: String(row.id), agent_json: String(row.agent_json) }));
  db.close();
  return rows;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("app folders", () => {
  it("uses the MyBot folders and leaves the OpenBot folders alone", () => {
    const { appData, home } = sandbox();
    mkdirSync(join(appData, "OpenBot"), { recursive: true });
    mkdirSync(join(home, "OpenBot"), { recursive: true });
    writeFileSync(join(appData, "OpenBot", "marker"), "old");
    writeFileSync(join(home, "OpenBot", "marker"), "old");

    const userData = appUserDataFolder({ appData });
    rebaseMovedFolderPaths(userData);
    expect(userData).toBe(join(appData, "MyBot"));
    expect(appDataFolderName()).toBe("MyBot");
    expect(appWorkspaceRoot(home)).toBe(join(home, "MyBot"));
    expect(readFileSync(join(appData, "OpenBot", "marker"), "utf8")).toBe("old");
    expect(readFileSync(join(home, "OpenBot", "marker"), "utf8")).toBe("old");
    expect(existsSync(join(appData, "MyBot"))).toBe(false);
  });

  it("finishes the path rewrite that an earlier build left pending", () => {
    const { appData, home } = sandbox();
    const userData = appUserDataFolder({ appData });
    const oldWorkspace = join(home, "OpenBot");
    const newWorkspace = join(home, "MyBot");
    mkdirSync(userData, { recursive: true });
    seedDatabase(join(userData, "openbot.db"), join(oldWorkspace, "Agents", "agent-1"));
    writeFileSync(
      join(userData, "mybot-folder-moves-v1.json"),
      JSON.stringify([{ from: oldWorkspace, to: newWorkspace }]),
    );

    rebaseMovedFolderPaths(userData);
    const agentFolder = join(newWorkspace, "Agents", "agent-1");
    const rows = readRows(join(userData, "openbot.db"));
    expect(JSON.parse(rows[0]?.agent_json ?? "{}")).toEqual({ workspacePath: agentFolder });
    expect(rows[1]?.agent_json).toBe(`See ${agentFolder}${sep}notes.md`);
    expect(existsSync(join(userData, "mybot-folder-moves-v1.json"))).toBe(false);

    // A second start finds nothing to rewrite.
    rebaseMovedFolderPaths(userData);
    expect(readRows(join(userData, "openbot.db"))).toEqual(rows);
  });
});
