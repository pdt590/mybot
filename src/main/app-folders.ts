/**
 * MyBot: the app folders are named `MyBot`, and they are separate from the OpenBot folders, so MyBot
 * and OpenBot can be installed and run side by side:
 * - `<appData>/MyBot`: `userData`, with `openbot.db`, the settings, the logs and the provider runtimes.
 * - `~/MyBot`: the agent workspaces, the shared files, the downloads and the local servers.
 *
 * MyBot never reads, moves or changes `<appData>/OpenBot` or `~/OpenBot`: they belong to OpenBot.
 *
 * Earlier MyBot builds moved the OpenBot folders to the MyBot names and then rewrote the absolute
 * paths in `openbot.db`. A pending file in `userData` records each such move until its rewrite
 * completes. `rebaseMovedFolderPaths` still finishes a rewrite that an earlier build left pending.
 * The rewrite only changes the old prefix to the new one, so to run it twice is safe.
 */
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDynamicRecord, isString } from "@openbot/contracts/runtime-values";
import { createOpenBotLogger, toLogValue } from "@openbot/logging";
import { substituteStoredText } from "../backend/migrations/0013-generated-agent-ids";

/** The folder name of this build. */
export const APP_FOLDER_NAME = "MyBot";

const PENDING_MOVES_FILE = "mybot-folder-moves-v1.json";
const DATABASE_FILE = "openbot.db";

const logger = createOpenBotLogger("app-folders");

export interface FolderMove {
  readonly from: string;
  readonly to: string;
}

/** The folder of the agents, shared files, downloads and local servers: `~/MyBot`. */
export function appWorkspaceRoot(home: string): string {
  return join(home, APP_FOLDER_NAME);
}

/** The name of the installed app's `userData` folder under `appData`: `MyBot`. */
export function appDataFolderName(): string {
  return APP_FOLDER_NAME;
}

/**
 * The `userData` folder of the installed app: `<appData>/MyBot`. Call it only for the default
 * profile of the installed app: not for a `--user-data-dir` profile, and not in a local server
 * child, whose folders are inside the parent's.
 */
export function appUserDataFolder(options: { appData: string }): string {
  return join(options.appData, APP_FOLDER_NAME);
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

/** Finishes the path rewrite of a move by an earlier build. Call it before anything opens `openbot.db`. */
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
