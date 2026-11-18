import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { appDataFolderName, appWorkspaceRoot, moveAppFolders, rebaseMovedFolderPaths } from "./app-folders";

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
  it("moves both OpenBot folders and rewrites the stored paths", () => {
    const { appData, home } = sandbox();
    const oldUserData = join(appData, "OpenBot");
    const oldWorkspace = join(home, "OpenBot");
    mkdirSync(join(oldWorkspace, "Agents", "agent-1"), { recursive: true });
    mkdirSync(oldUserData, { recursive: true });
    writeFileSync(join(oldWorkspace, "Agents", "agent-1", "notes.md"), "kept");
    seedDatabase(join(oldUserData, "openbot.db"), join(oldWorkspace, "Agents", "agent-1"));

    const userData = moveAppFolders({ appData, home });
    expect(userData).toBe(join(appData, "MyBot"));
    expect(appDataFolderName()).toBe("MyBot");
    expect(appWorkspaceRoot(home)).toBe(join(home, "MyBot"));
    expect(existsSync(oldUserData)).toBe(false);
    expect(existsSync(oldWorkspace)).toBe(false);
    expect(readFileSync(join(home, "MyBot", "Agents", "agent-1", "notes.md"), "utf8")).toBe("kept");

    rebaseMovedFolderPaths(userData);
    const newWorkspace = join(home, "MyBot", "Agents", "agent-1");
    const rows = readRows(join(userData, "openbot.db"));
    expect(JSON.parse(rows[0]?.agent_json ?? "{}")).toEqual({ workspacePath: newWorkspace });
    expect(rows[1]?.agent_json).toBe(`See ${newWorkspace}${sep}notes.md`);
    expect(existsSync(join(userData, "mybot-folder-moves-v1.json"))).toBe(false);

    // A second start finds nothing to move and nothing to rewrite.
    expect(moveAppFolders({ appData, home })).toBe(userData);
    rebaseMovedFolderPaths(userData);
    expect(readRows(join(userData, "openbot.db"))).toEqual(rows);
  });

  it("keeps a MyBot folder that already exists and leaves the OpenBot folder alone", () => {
    const { appData, home } = sandbox();
    mkdirSync(join(appData, "OpenBot"), { recursive: true });
    mkdirSync(join(appData, "MyBot"), { recursive: true });
    writeFileSync(join(appData, "OpenBot", "marker"), "old");

    expect(moveAppFolders({ appData, home })).toBe(join(appData, "MyBot"));
    expect(readFileSync(join(appData, "OpenBot", "marker"), "utf8")).toBe("old");
    expect(existsSync(join(appData, "MyBot", "mybot-folder-moves-v1.json"))).toBe(false);
  });

  it("uses the MyBot folders on a computer with no OpenBot data", () => {
    const { appData, home } = sandbox();
    expect(moveAppFolders({ appData, home })).toBe(join(appData, "MyBot"));
    expect(appWorkspaceRoot(home)).toBe(join(home, "MyBot"));
  });
});
