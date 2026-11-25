// MyBot: drives the app's own webhook server (`src/main/local-webhook-server.ts`) over real HTTP. A workflow
// with a webhook trigger gets a local address; signed requests with the `x-mybot-*` headers, or Standard
// Webhooks headers, start a run; upstream's `x-openbot-*` headers and bad requests are refused; new settings
// move the listener and give the route its new URL. Run: `bun scripts/local-webhook-e2e.ts`.

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AGENT_PROVIDERS, type WorkflowGraph } from "@openbot/contracts/ipc";
import { Effect } from "effect";
import type { AgentBrowserHost } from "../src/backend/agent/turn-lifecycle";

const OUT = resolve(import.meta.dirname, "../.openbot-build/local-webhook-e2e");
const root = await mkdtemp(join(tmpdir(), "mybot-local-webhook-"));
const userData = join(root, "user-data");
const home = join(root, "home");
process.env.HOME = home;
process.env.CODEX_HOME = join(home, ".codex");
mkdirSync(home, { recursive: true });

const { AgentService } = await import("../src/backend/agent-service");
const { AgentStore } = await import("../src/backend/agent-store");
const { runCauseEffect } = await import("../src/backend/effect-boundary");
const { MailboxStore } = await import("../src/backend/mailbox-store");
const { OpenBotDatabase } = await import("../src/backend/openbot-database");
const { WorkflowGitHubStore } = await import("../src/backend/workflows/workflow-github-store");
const { WorkflowRunStore } = await import("../src/backend/workflows/workflow-run-store");
const { WorkflowStore } = await import("../src/backend/workflows/workflow-store");
const { workflowScheduleDueAt } = await import("../src/backend/workflows/workflow-triggers");
const { createWorkflows } = await import("../src/backend/workflows/workflows");
const { HostEventsService } = await import("../src/main/host-events-service");
const { DEFAULT_LOCAL_WEBHOOK_CONFIG, LOCAL_WEBHOOK_SERVER_FILE, LocalWebhookServer } = await import(
  "../src/main/local-webhook-server"
);
const { signWebhookBody } = await import("../src/main/webhook-security");

interface Report {
  checks: string[];
  statuses?: Record<string, number>;
  passed: boolean;
  failure?: string;
}

const report: Report = { checks: [], passed: false };
const check = (name: string, ok: boolean, detail?: unknown) => {
  assert.ok(ok, `${name}${detail === undefined ? "" : `: ${JSON.stringify(detail)}`}`);
  report.checks.push(name);
};

const unused = () => Effect.die(new Error("Not used by this check."));
const browser: AgentBrowserHost = {
  listTabs: () => [],
  toolCanUseTab: () => false,
  beginTakeover: unused,
  endTakeover: () => {},
  resolveUploadTarget: unused,
  handleDynamicTool: unused,
  userControlTabFor: () => null,
  awaitUserControlRelease: unused,
  onChanged: () => () => {},
  onControlChanged: () => () => {},
  onDocumentChanged: () => () => {},
  clearControls: () => {},
  endControl: () => {},
  close: () => Effect.void,
  clearAgentSession: () => Effect.void,
  shareTab: () => undefined,
  unshareThread: () => undefined,
  agentTab: () => null,
};

const graphOf = (trigger: "webhook" | "manual"): WorkflowGraph => ({
  nodes: [
    { id: "trigger", kind: "trigger", at: { x: 0, y: 0 }, fields: { trigger } },
    { id: "step", kind: "output", at: { x: 300, y: 0 }, fields: { target: "notify" } },
  ],
  edges: [{ id: "edge", from: "trigger", to: "step", type: "text" }],
  strokes: [],
});

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolvePort(port));
    });
  });
}

const database = new OpenBotDatabase(userData);
const store = new AgentStore(userData, home, database);
const mailbox = new MailboxStore(userData, store.sharedRoot, store.database);
const agents = new AgentService({ store, mailbox, browser, preferredProvider: "codex", offProviders: AGENT_PROVIDERS });
const workflowStore = new WorkflowStore({ database, nextDueAt: workflowScheduleDueAt(() => "UTC") });
const settingsPath = join(userData, LOCAL_WEBHOOK_SERVER_FILE);
let closeWorkflows: (() => Promise<void>) | null = null;
let pendingSync: Promise<unknown> = Promise.resolve();
let events: InstanceType<typeof HostEventsService> | null = null;
const server = new LocalWebhookServer({
  path: settingsPath,
  onAddressChanged: () => {
    if (events) pendingSync = Effect.runPromise(events.syncRoutes({ all: true }));
  },
});
const occupied = createNetServer();

try {
  await runCauseEffect(agents.initialize());
  await Effect.runPromise(server.load());
  check(
    "the first start writes the default settings",
    JSON.stringify(JSON.parse(await readFile(settingsPath, "utf8"))) === JSON.stringify(DEFAULT_LOCAL_WEBHOOK_CONFIG),
  );
  const port = await freePort();
  await Effect.runPromise(server.save({ bindAddress: "127.0.0.1", port, publicUrl: null }));
  check("the server is off while no webhook trigger exists", !server.status().listening && !server.status().enabled);

  const workflows = await Effect.runPromise(
    createWorkflows({
      store: workflowStore,
      runs: new WorkflowRunStore({ database }),
      github: new WorkflowGitHubStore({ database }),
      githubApp: () => null,
      delivery: () => null,
      turnAnswer: () => null,
      sendHandoff: () => Effect.fail({ cause: new Error("No agent step runs in this test.") }),
      stopDelivery: () => Effect.void,
      generateText: () => Effect.fail({ message: "No model step runs in this test." }),
      notify: () => {},
      connectionOn: () => false,
      post: () => Effect.die(new Error("No output posts in this test.")),
      changed: () => {},
      rearm: () => {},
      timezone: () => "UTC",
    }),
  );
  closeWorkflows = () => Effect.runPromise(workflows.close());
  events = new HostEventsService({
    routines: agents.routineRecords,
    workflows: { receive: (delivery) => workflows.receiveWebhook(delivery), changed: () => {} },
    cipher: {
      encrypt: (value) => Buffer.from(`sealed:${Buffer.from(value).toString("base64")}`),
      decrypt: (value) => Buffer.from(value.toString().slice("sealed:".length), "base64").toString(),
    },
    relay: server,
    accountPrincipal: () => "local@mybot.local",
  });
  const hostEvents = events;
  server.handle((input) => hostEvents.receive(input));

  const created = await runCauseEffect(workflows.create({ title: "Paid orders" }));
  const workflowId = created.summary.id;
  const saved = await runCauseEffect(
    workflows.saveGraph({ workflowId, baseRevision: created.revision, graph: graphOf("webhook") }),
  );
  assert.ok(saved.ok);
  const { secret } = await runCauseEffect(hostEvents.rotateWorkflowSecret({ workflowId, nodeId: "trigger" }));
  await server.opened();
  const webhookUrl = async () =>
    (await runCauseEffect(workflows.get(workflowId))).triggers.find((entry) => entry.nodeId === "trigger")
      ?.webhookUrl ?? null;
  const url = await webhookUrl();
  check(
    "a webhook trigger gets the local address",
    url?.startsWith(`http://127.0.0.1:${port}/v1/webhooks/`) === true,
    url,
  );
  check("the server listens once a webhook trigger exists", server.status().listening && server.connected());
  const runs = async () => (await runCauseEffect(workflows.runs({ workflowId, limit: 50 }))).runs.length;

  const body = JSON.stringify({ type: "order.paid", data: { order: "order-7f3a" } });
  const bytes = new TextEncoder().encode(body);
  const now = () => String(Math.floor(Date.now() / 1000));
  const post = (target: string, headers: Record<string, string>, payload = body) =>
    fetch(target, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: payload }).then(
      (response) => response.status,
    );
  const mybot = (deliveryId: string, key = secret, timestamp = now()) => ({
    "x-mybot-timestamp": timestamp,
    "x-mybot-delivery-id": deliveryId,
    "x-mybot-signature": signWebhookBody(key, timestamp, deliveryId, bytes),
  });
  const statuses: Record<string, number> = {};
  const target = url ?? "";

  statuses.signed = await post(target, mybot("delivery-1"));
  check(
    "a request signed with the x-mybot headers starts a run",
    statuses.signed === 202 && (await runs()) === 1,
    statuses,
  );
  statuses.repeat = await post(target, mybot("delivery-1"));
  check("the same delivery again is a no-op", statuses.repeat === 200 && (await runs()) === 1, statuses);

  const timestamp = now();
  statuses.openbot = await post(target, {
    "x-openbot-timestamp": timestamp,
    "x-openbot-delivery-id": "delivery-2",
    "x-openbot-signature": signWebhookBody(secret, timestamp, "delivery-2", bytes),
  });
  check("upstream's x-openbot headers are refused", statuses.openbot === 401 && (await runs()) === 1, statuses);
  statuses.wrongSecret = await post(target, mybot("delivery-3", "whsec_wrong"));
  check("a wrong signature is refused", statuses.wrongSecret === 401, statuses);
  statuses.stale = await post(target, mybot("delivery-4", secret, String(Number(now()) - 3600)));
  check("a timestamp an hour old is refused", statuses.stale === 401, statuses);
  statuses.unsigned = await post(target, {});
  check("an unsigned request is refused", statuses.unsigned === 401, statuses);

  const standardId = "msg_standard_1";
  const standardSignature = createHmac("sha256", secret).update(`${standardId}.${timestamp}.${body}`).digest("base64");
  statuses.standard = await post(target, {
    "webhook-id": standardId,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${standardSignature}`,
  });
  check("a Standard Webhooks request starts a run", statuses.standard === 202 && (await runs()) === 2, statuses);

  statuses.text = await fetch(target, {
    method: "POST",
    headers: { "content-type": "text/plain", ...mybot("delivery-5") },
    body,
  }).then((response) => response.status);
  check("a body that is not JSON is refused", statuses.text === 415, statuses);
  statuses.get = (await fetch(target)).status;
  check("a GET is refused", statuses.get === 405, statuses);
  statuses.unknown = await post(`http://127.0.0.1:${port}/v1/webhooks/no-such-route`, mybot("delivery-6"));
  check("an unknown route is refused", statuses.unknown === 404, statuses);
  statuses.otherPath = await post(`http://127.0.0.1:${port}/elsewhere`, mybot("delivery-7"));
  check("another path is refused", statuses.otherPath === 404, statuses);

  const nextPort = await freePort();
  const moved = await Effect.runPromise(
    server.save({ bindAddress: "127.0.0.1", port: nextPort, publicUrl: "https://hooks.example.com/" }),
  );
  await pendingSync;
  check(
    "new settings move the listener",
    moved.listening && moved.port === nextPort && moved.baseUrl === "https://hooks.example.com",
    moved,
  );
  const publicUrl = await webhookUrl();
  check(
    "the route gets the public address",
    publicUrl === `https://hooks.example.com/v1/webhooks/${new URL(target).pathname.split("/").at(-1)}`,
    publicUrl,
  );
  const localTarget = `http://127.0.0.1:${nextPort}${new URL(target).pathname}`;
  statuses.moved = await post(localTarget, mybot("delivery-8"));
  check("the new port takes requests", statuses.moved === 202 && (await runs()) === 3, statuses);
  check(
    "the settings file keeps the new settings",
    JSON.parse(await readFile(settingsPath, "utf8")).publicUrl === "https://hooks.example.com/",
  );

  await new Promise<void>((resolveListen) => occupied.listen(port, "127.0.0.1", resolveListen));
  const blocked = await Effect.runPromise(server.save({ bindAddress: "127.0.0.1", port, publicUrl: null }));
  check(
    "a port that another program holds is reported",
    !blocked.listening && blocked.problem === "port_in_use",
    blocked,
  );
  await new Promise<void>((resolveClose) => occupied.close(() => resolveClose()));
  const freed = await Effect.runPromise(server.save({ bindAddress: "127.0.0.1", port: nextPort, publicUrl: null }));
  await pendingSync;
  check("another port works again", freed.listening && freed.problem === null, freed);

  const current = await runCauseEffect(workflows.get(workflowId));
  const manual = await runCauseEffect(
    workflows.saveGraph({ workflowId, baseRevision: current.revision, graph: graphOf("manual") }),
  );
  assert.ok(manual.ok);
  await Effect.runPromise(hostEvents.syncRoutes({ all: false }));
  check("the server stops when no webhook trigger is left", !server.status().listening && !server.status().enabled);

  report.statuses = statuses;
  report.passed = true;
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  server.stop();
  if (occupied.listening) occupied.close();
  mkdirSync(OUT, { recursive: true });
  const artifact = join(OUT, "report.json");
  writeFileSync(artifact, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${artifact}\n`);
  if (report.failure) process.stderr.write(`${report.failure}\n`);
  try {
    if (closeWorkflows) await closeWorkflows();
    await runCauseEffect(agents.stop()).catch(() => undefined);
    database.close();
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (error) {
    process.stderr.write(`The temporary folder was not removed: ${String(error)}\n`);
  }
}
