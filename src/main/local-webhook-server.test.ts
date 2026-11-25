import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCAL_WEBHOOK_CONFIG,
  LOCAL_WEBHOOK_SERVER_FILE,
  LocalWebhookServer,
  localWebhookRouteUrl,
} from "./local-webhook-server";
import type { WebhookIngressDelivery } from "./signal-ingress";

const folders: string[] = [];
const servers: LocalWebhookServer[] = [];

afterEach(async () => {
  for (const server of servers.splice(0)) server.stop();
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true });
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function started(publicUrl: string | null = null) {
  const folder = await mkdtemp(join(tmpdir(), "mybot-webhooks-"));
  folders.push(folder);
  const port = await freePort();
  const path = join(folder, LOCAL_WEBHOOK_SERVER_FILE);
  await writeFile(path, JSON.stringify({ version: 1, bindAddress: "127.0.0.1", port, publicUrl }));
  const server = new LocalWebhookServer({ path });
  servers.push(server);
  await Effect.runPromise(server.load());
  const received: WebhookIngressDelivery[] = [];
  server.handle((delivery) =>
    Effect.sync(() => {
      received.push(delivery);
      return { status: 202 as const };
    }),
  );
  server.setEnabled(true);
  await vi.waitFor(() => expect(server.connected()).toBe(true));
  return { server, port, received, base: `http://127.0.0.1:${port}` };
}

const body = JSON.stringify({ type: "order.created", data: { id: 1 } });

describe("LocalWebhookServer", () => {
  it("hands a delivery signed with the x-mybot headers to the handler", async () => {
    const { base, received } = await started();
    const response = await fetch(`${base}/v1/webhooks/route-1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-mybot-timestamp": "1700000000",
        "x-mybot-delivery-id": "delivery-1",
        "x-mybot-signature": `sha256=${"a".repeat(64)}`,
      },
      body,
    });
    expect(response.status).toBe(202);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      routeId: "route-1",
      deliveryId: "delivery-1",
      timestamp: "1700000000",
      signature: `sha256=${"a".repeat(64)}`,
    });
    expect(received[0]?.format).toBeUndefined();
    expect(new TextDecoder().decode(received[0]?.body)).toBe(body);
  });

  it("reads Standard Webhooks headers", async () => {
    const { base, received } = await started();
    const response = await fetch(`${base}/v1/webhooks/route-1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "msg_1",
        "webhook-timestamp": "1700000000",
        "webhook-signature": "v1,c2lnbmF0dXJl",
      },
      body,
    });
    expect(response.status).toBe(202);
    expect(received[0]?.format).toBe("standard-webhooks");
  });

  it("refuses the upstream x-openbot headers and malformed requests", async () => {
    const { base, received } = await started();
    const openbot = await fetch(`${base}/v1/webhooks/route-1`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-openbot-timestamp": "1700000000",
        "x-openbot-delivery-id": "delivery-1",
        "x-openbot-signature": `sha256=${"a".repeat(64)}`,
      },
      body,
    });
    expect(openbot.status).toBe(401);
    const text = await fetch(`${base}/v1/webhooks/route-1`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body,
    });
    expect(text.status).toBe(415);
    expect((await fetch(`${base}/v1/webhooks/route-1`)).status).toBe(405);
    expect((await fetch(`${base}/other`, { method: "POST" })).status).toBe(404);
    expect(received).toHaveLength(0);
  });

  it("names the route by the public URL, or by the local address", async () => {
    const { server, port } = await started("https://hooks.example.com/");
    expect(await Effect.runPromise(server.registerRoute("route-1"))).toBe(
      "https://hooks.example.com/v1/webhooks/route-1",
    );
    expect(localWebhookRouteUrl({ ...DEFAULT_LOCAL_WEBHOOK_CONFIG, port, bindAddress: "0.0.0.0" }, "r")).toBe(
      `http://127.0.0.1:${port}/v1/webhooks/r`,
    );
  });

  it("stops listening when it is turned off", async () => {
    const { server } = await started();
    server.setEnabled(false);
    expect(server.connected()).toBe(false);
  });

  it("saves new settings, listens on the new port and asks for new route URLs", async () => {
    const folder = await mkdtemp(join(tmpdir(), "mybot-webhooks-"));
    folders.push(folder);
    const path = join(folder, LOCAL_WEBHOOK_SERVER_FILE);
    let addressChanges = 0;
    const server = new LocalWebhookServer({ path, onAddressChanged: () => (addressChanges += 1) });
    servers.push(server);
    await Effect.runPromise(server.load());
    const port = await freePort();
    await Effect.runPromise(server.save({ bindAddress: "127.0.0.1", port, publicUrl: null }));
    server.setEnabled(true);
    await vi.waitFor(() => expect(server.connected()).toBe(true));
    expect(server.status()).toMatchObject({ port, enabled: true, listening: true, problem: null });
    expect(addressChanges).toBe(1);

    const next = await freePort();
    const status = await Effect.runPromise(
      server.save({ bindAddress: "127.0.0.1", port: next, publicUrl: "https://hooks.example.com" }),
    );
    expect(status).toMatchObject({
      port: next,
      listening: true,
      baseUrl: "https://hooks.example.com",
      publicUrl: "https://hooks.example.com",
    });
    expect(addressChanges).toBe(2);
    expect((await fetch(`http://127.0.0.1:${next}/v1/webhooks/route-1`)).status).toBe(405);
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
      version: 1,
      bindAddress: "127.0.0.1",
      port: next,
      publicUrl: "https://hooks.example.com",
    });
  });

  it("reports a port that another program holds", async () => {
    const { port } = await started();
    const folder = await mkdtemp(join(tmpdir(), "mybot-webhooks-"));
    folders.push(folder);
    const path = join(folder, LOCAL_WEBHOOK_SERVER_FILE);
    await writeFile(path, JSON.stringify({ version: 1, bindAddress: "127.0.0.1", port, publicUrl: null }));
    const second = new LocalWebhookServer({ path });
    servers.push(second);
    await Effect.runPromise(second.load());
    second.setEnabled(true);
    await vi.waitFor(() => expect(second.status()).toMatchObject({ listening: false, problem: "port_in_use" }));
  });

  it("writes the default settings when there are none", async () => {
    const folder = await mkdtemp(join(tmpdir(), "mybot-webhooks-"));
    folders.push(folder);
    const path = join(folder, LOCAL_WEBHOOK_SERVER_FILE);
    await Effect.runPromise(new LocalWebhookServer({ path }).load());
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual(DEFAULT_LOCAL_WEBHOOK_CONFIG);
  });
});
