// @vitest-environment node

// MyBot: the conversations of an agent's own Telegram bot archive, open again and delete like side threads.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentSummary } from "@openbot/contracts/ipc";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentThreadStore } from "../../agent-threads/agent-thread-store";
import { runCauseEffect } from "../../effect-boundary";
import { OpenBotDatabase } from "../../openbot-database";
import { MessagingStore } from "../messaging-store";

const roots: string[] = [];
const databases: OpenBotDatabase[] = [];

afterEach(async () => {
  for (const database of databases.splice(0)) database.close();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const AGENT: AgentSummary = {
  id: "agent-1",
  provider: "codex",
  name: "Agent",
  title: "Helper",
  description: "",
  notifications: true,
  model: "gpt-5.6-luna",
  reasoningEffort: "medium",
  threadId: "openbot-thread-agent-1",
  workspacePath: "/tmp/mybot-agent-1",
  preview: "",
  updatedAt: "2026-11-01T10:00:00.000Z",
  avatarSeed: "agent-1",
  avatarHue: null,
  avatarUrl: null,
};

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "mybot-telegram-chats-"));
  roots.push(root);
  const database = new OpenBotDatabase(root);
  databases.push(database);
  await runCauseEffect(database.initialize());
  database.replaceAgents("seed", [AGENT], "agents.updated");
  const messaging = new MessagingStore(database);
  const threads = new AgentThreadStore(database);
  const connection = messaging.ensureConnection("telegram_bot", "7012345678", "@agent_bot");
  const link = messaging.ensureLink({
    connectionId: connection.connectionId,
    agentId: AGENT.id,
    platformChannelId: "100200300",
    threadKey: "dm",
    isDirect: true,
    title: "Owner",
  });
  return { messaging, threads, link };
}

describe("Telegram bot conversations", () => {
  it("archive until the next message, and open again", async () => {
    const { messaging, threads, link } = await setup();
    expect(threads.externalChat(AGENT.id, link.threadId)?.closedAt).toBeNull();

    threads.archiveExternalChat(link.threadId);
    expect(threads.externalChat(AGENT.id, link.threadId)?.closedAt).not.toBeNull();

    threads.reopenExternalChat(link.threadId);
    expect(threads.externalChat(AGENT.id, link.threadId)?.closedAt).toBeNull();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T10:00:00.000Z"));
    threads.archiveExternalChat(link.threadId);
    vi.setSystemTime(new Date("2026-11-19T10:00:01.000Z"));
    messaging.touch(link.linkId);
    vi.useRealTimers();
    expect(threads.externalChat(AGENT.id, link.threadId)?.closedAt).toBeNull();
  });

  it("delete with their link and thread", async () => {
    const { messaging, threads, link } = await setup();
    messaging.deleteLink(link.linkId);
    expect(messaging.link(link.linkId)).toBeNull();
    expect(messaging.linkForThread(link.threadId)).toBeNull();
    expect(threads.externalChats(AGENT.id)).toEqual([]);
  });
});
