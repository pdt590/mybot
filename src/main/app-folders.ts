/**
 * MyBot: the app folders are named `MyBot`. Earlier builds used `OpenBot`:
 * - `<appData>/OpenBot`: `userData`, with `openbot.db`, the settings, the logs and the provider runtimes.
 * - `~/OpenBot`: the agent workspaces, the shared files, the downloads and the local servers.
 *
 * On the first start of a MyBot build, each old folder is moved to its new name with one `rename`.
 * On one volume a `rename` is one system call, so a folder is never half moved. Nothing is copied: a
 * copy that stops halfway loses data, and no backup is made before an upgrade. When the move fails (a
 * Windows lock, a link to another volume, no permission), the app keeps using the old folder and
 * tries the move again at the next start.
 *
 * `openbot.db` keeps absolute paths into both folders: agent workspaces and file links in messages.
 * After a move, `rebaseMovedFolderPaths` rewrites them. A pending file in the new `userData` records
 * each move until the rewrite completes, so an interrupted rewrite runs again at the next start. The
 * rewrite only changes the old prefix to the new one, so to run it twice is safe.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDynamicRecord, isString } from "@openbot/contracts/runtime-values";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";
import { substituteStoredText } from "../backend/openbot-database-schema";

/** The folder name of this build. */
export const APP_FOLDER_NAME = "MyBot";
/** The folder name of the upstream OpenBot builds. */
export const LEGACY_APP_FOLDER_NAME = "OpenBot";

const PENDING_MOVES_FILE = "mybot-folder-moves-v1.json";
const DATABASE_FILE = "openbot.db";

const logger = createOpenBotLogger("app-folders");

export interface FolderMove {
  readonly from: string;
  readonly to: string;
}

let workspaceRoot: string | null = null;
let userDataFolderName: string = APP_FOLDER_NAME;

/** The folder of the agents, shared files, downloads and local servers: `~/MyBot`, or `~/OpenBot` when its move failed. */
export function appWorkspaceRoot(home: string): string {
  return workspaceRoot ?? join(home, APP_FOLDER_NAME);
}

/** The name of the installed app's `userData` folder under `appData`: `MyBot`, or `OpenBot` when its move failed. */
export function appDataFolderName(): string {
  return userDataFolderName;
}

/**
 * True when an OpenBot app may still use `userData`. Chromium keeps a `SingletonLock` link to
 * `<host>-<pid>` there on macOS and Linux while the app runs. A move under a running app would let two
 * apps write one database. Windows needs no check: a folder with open files cannot be renamed there.
 */
function legacyAppRunning(userData: string): boolean {
  if (process.platform === "win32") return false;
  let target: string;
  try {
    target = readlinkSync(join(userData, "SingletonLock"));
  } catch {
    return false;
  }
  const pid = Number.parseInt(target.slice(target.lastIndexOf("-") + 1), 10);
  if (!Number.isSafeInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return isDynamicRecord(error) && error.code === "EPERM";
  }
}

/** Moves `from` to `to` when only `from` exists. Returns the folder to use, and whether it moved now. */
function adoptLegacyFolder(from: string, to: string): { path: string; moved: boolean } {
  if (existsSync(to)) {
    if (existsSync(from)) logger.warn(`Both ${from} and ${to} exist. MyBot uses ${to} and leaves ${from} as it is.`);
    return { path: to, moved: false };
  }
  if (!existsSync(from)) return { path: to, moved: false };
  try {
    renameSync(from, to);
    logger.info(`Moved ${from} to ${to}.`);
    return { path: to, moved: true };
  } catch (error) {
    logger.warn(
      `Could not move ${from} to ${to}. MyBot uses ${from} and tries again at the next start.`,
      toLogValue(error),
    );
    return { path: from, moved: false };
  }
}

function readPendingMoves(userData: string): FolderMove[] {
  try {
    const value = JSON.parse(readFileSync(join(userData, PENDING_MOVES_FILE), "utf8"));
    if (!Array.isArray(value)) return [];
    return value.flatMap((move) =>
      isDynamicRecord(move) && isString(move.from) && isString(move.to) ? [{ from: move.from, to: move.to }] : [],
    );
  } catch {
    return [];
  }
}

function writePendingMoves(userData: string, moves: readonly FolderMove[]): void {
  const all = [...readPendingMoves(userData)];
  for (const move of moves) if (!all.some((item) => item.from === move.from)) all.push(move);
  mkdirSync(userData, { recursive: true });
  writeFileSync(join(userData, PENDING_MOVES_FILE), JSON.stringify(all), { mode: 0o600 });
}

/** The project folder name that Claude Code gives a working directory. */
function claudeProjectName(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, "-");
}

/**
 * Claude Code keeps each session under `<config>/projects/<working directory>`, and resumes it only
 * from the folder of the working directory. The project folders of the agents move with them.
 */
function moveClaudeProjects(move: FolderMove, home: string): void {
  const configs = new Set([
    join(home, ".claude"),
    ...(process.env.CLAUDE_CONFIG_DIR ? [process.env.CLAUDE_CONFIG_DIR] : []),
  ]);
  const oldPrefix = claudeProjectName(move.from);
  const newPrefix = claudeProjectName(move.to);
  for (const config of configs) {
    const projects = join(config, "projects");
    let names: string[];
    try {
      names = readdirSync(projects);
    } catch {
      continue;
    }
    for (const name of names) {
      // Only the folders of agent workspaces: `Agents/<id>` and `Servers/<server>/Agents/<id>`.
      if (!name.startsWith(`${oldPrefix}-Agents-`) && !name.startsWith(`${oldPrefix}-Servers-`)) continue;
      const target = `${newPrefix}${name.slice(oldPrefix.length)}`;
      if (existsSync(join(projects, target))) continue;
      try {
        renameSync(join(projects, name), join(projects, target));
      } catch (error) {
        logger.warn("Could not move a Claude Code project folder of an agent.", toLogValue(error));
      }
    }
  }
}

/**
 * Moves the old folders to their new names, before anything opens `userData`. Returns the `userData`
 * folder to use. Call it only for the default profile of the installed app: not for a
 * `--user-data-dir` profile, and not in a local server child, whose folders are inside the parent's.
 */
export function moveAppFolders(options: { appData: string; home: string }): string {
  const oldUserData = join(options.appData, LEGACY_APP_FOLDER_NAME);
  const newUserData = join(options.appData, APP_FOLDER_NAME);
  const oldWorkspace = join(options.home, LEGACY_APP_FOLDER_NAME);
  const newWorkspace = join(options.home, APP_FOLDER_NAME);
  if (!existsSync(newUserData) && legacyAppRunning(oldUserData)) {
    logger.warn("OpenBot is running, so MyBot uses the OpenBot folders. Quit OpenBot to move them.");
    workspaceRoot = existsSync(newWorkspace) ? newWorkspace : oldWorkspace;
    userDataFolderName = LEGACY_APP_FOLDER_NAME;
    return oldUserData;
  }
  const userData = adoptLegacyFolder(oldUserData, newUserData);
  const workspace = adoptLegacyFolder(oldWorkspace, newWorkspace);
  workspaceRoot = workspace.path;
  userDataFolderName = userData.path === oldUserData ? LEGACY_APP_FOLDER_NAME : APP_FOLDER_NAME;
  const moves: FolderMove[] = [];
  if (userData.moved) moves.push({ from: oldUserData, to: newUserData });
  if (workspace.moved) {
    moves.push({ from: oldWorkspace, to: newWorkspace });
    moveClaudeProjects({ from: oldWorkspace, to: newWorkspace }, options.home);
  }
  if (moves.length > 0) {
    try {
      writePendingMoves(userData.path, moves);
    } catch (error) {
      logger.warn("Could not record the moved folders. Stored paths keep the old folder names.", toLogValue(error));
    }
  }
  return userData.path;
}

/** Each spelling of the folder prefix that a stored value can hold: native, with `/`, and inside JSON. */
function prefixSubstitutions(move: FolderMove): { from: string; to: string }[] {
  const pairs = new Map<string, string>();
  const add = (from: string, to: string) => {
    pairs.set(from, to);
    pairs.set(JSON.stringify(from).slice(1, -1), JSON.stringify(to).slice(1, -1));
  };
  add(`${move.from}${sep}`, `${move.to}${sep}`);
  add(`${move.from.replaceAll("\\", "/")}/`, `${move.to.replaceAll("\\", "/")}/`);
  return [...pairs].filter(([from, to]) => from !== to).map(([from, to]) => ({ from, to }));
}

/** The databases that keep absolute paths: the app's, and each local server's. */
function databaseFiles(userData: string): string[] {
  const files = [join(userData, DATABASE_FILE)];
  const localServers = join(userData, "local-servers");
  try {
    for (const name of readdirSync(localServers)) files.push(join(localServers, name, DATABASE_FILE));
  } catch {
    // No local servers.
  }
  return files.filter((file) => existsSync(file));
}

/** Rewrites the stored paths of the recorded moves. Call it before anything opens `openbot.db`. */
export function rebaseMovedFolderPaths(userData: string): void {
  const moves = readPendingMoves(userData);
  if (moves.length === 0) return;
  const substitutions = moves.flatMap(prefixSubstitutions);
  let complete = true;
  for (const file of databaseFiles(userData)) {
    let db: DatabaseSync | null = null;
    try {
      db = new DatabaseSync(file);
      db.exec("PRAGMA busy_timeout = 5000");
      substituteStoredText(db, substitutions);
    } catch (error) {
      complete = false;
      logger.warn(
        "Could not rewrite the stored folder paths of a database. MyBot tries again at the next start.",
        toLogValue(error),
      );
    } finally {
      try {
        db?.close();
      } catch {
        // The rewrite is already committed or rolled back.
      }
    }
  }
  if (complete) rmSync(join(userData, PENDING_MOVES_FILE), { force: true });
}
