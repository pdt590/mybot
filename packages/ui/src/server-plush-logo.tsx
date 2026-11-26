import { serverPlushHex } from "@openbot/brand/bloub-avatar";
import type { ServerAppearance, ServerAppearanceShape } from "@openbot/contracts/team-protocol/host-appearance-v1";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal } from "solid-js";
import capsule from "./assets/plush/server/flat/capsule.webp";
import carre from "./assets/plush/server/flat/carre.webp";
import cercle from "./assets/plush/server/flat/cercle.webp";
import galet from "./assets/plush/server/flat/galet.webp";
import hexagone from "./assets/plush/server/flat/hexagone.webp";
import losange from "./assets/plush/server/flat/losange.webp";
import nuage from "./assets/plush/server/flat/nuage.webp";
import pentagone from "./assets/plush/server/flat/pentagone.webp";
import squircle from "./assets/plush/server/flat/squircle.webp";
import triangle from "./assets/plush/server/flat/triangle.webp";
import { cx } from "./utils";

// MyBot: server logos are flat. Each shape is a white silhouette (made from the plush shapes) that is
// filled with the server color, with a darker crescent at the bottom like the flat balls.
const SILHOUETTES: Readonly<Record<ServerAppearanceShape, string>> = {
  squircle,
  cercle,
  galet,
  capsule,
  carre,
  losange,
  triangle,
  pentagone,
  hexagone,
  nuage,
};

const SHADE = { darken: 0.82, offsetX: -0.04, offsetY: -0.08 } as const;

const flatBodies = new Map<string, Promise<string>>();

function flatBody(shape: ServerAppearanceShape, hex: string): Promise<string> {
  const key = `${shape}|${hex}`;
  const cached = flatBodies.get(key);
  if (cached) return cached;
  const result = drawFlatBody(SILHOUETTES[shape], hex);
  flatBodies.set(key, result);
  result.catch(() => flatBodies.delete(key));
  return result;
}

function darker(hex: string): string {
  const channel = (offset: number) =>
    Math.round(Number.parseInt(hex.slice(offset, offset + 2), 16) * SHADE.darken)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function filledLayer(mask: HTMLImageElement, color: string, dx = 0, dy = 0): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = mask.naturalWidth;
  layer.height = mask.naturalHeight;
  const context = layer.getContext("2d");
  if (!context) throw new Error("No 2D canvas.");
  context.drawImage(mask, dx, dy);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, layer.width, layer.height);
  return layer;
}

async function drawFlatBody(url: string, hex: string): Promise<string> {
  const mask = new Image();
  mask.src = url;
  await mask.decode();
  const width = mask.naturalWidth;
  const height = mask.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas.");
  context.drawImage(filledLayer(mask, darker(hex)), 0, 0);
  const top = filledLayer(mask, hex, width * SHADE.offsetX, height * SHADE.offsetY);
  const topContext = top.getContext("2d");
  if (!topContext) throw new Error("No 2D canvas.");
  topContext.globalCompositeOperation = "destination-in";
  topContext.drawImage(mask, 0, 0);
  context.drawImage(top, 0, 0);
  return canvas.toDataURL("image/webp", 0.92);
}

function isAutomatic(appearance: ServerAppearance | null | undefined): appearance is null | undefined {
  return !appearance || (appearance.shape === "squircle" && appearance.color === null);
}

export interface ServerPlushLogoProps {
  seed: string;
  appearance?: ServerAppearance | null | undefined;
  class?: JSX.HTMLAttributes<HTMLImageElement>["class"];
}

export function ServerPlushLogo(props: ServerPlushLogoProps): JSX.Element {
  const [drawn, setDrawn] = createSignal<{ key: string; url: string | null } | null>(null);
  const chosen = () => {
    const appearance = props.appearance;
    const shape: ServerAppearanceShape = isAutomatic(appearance) ? "squircle" : appearance.shape;
    const hex = serverPlushHex(props.seed, isAutomatic(appearance) ? null : appearance.color);
    return { shape, hex, key: `${shape}|${hex}` };
  };
  createEffect(chosen, (current) => {
    let live = true;
    flatBody(current.shape, current.hex).then(
      (url) => {
        if (live) setDrawn({ key: current.key, url });
      },
      () => {
        if (live) setDrawn({ key: current.key, url: null });
      },
    );
    return () => {
      live = false;
    };
  });
  const source = () => {
    const current = drawn();
    if (current?.key !== chosen().key) return undefined;
    return current.url ?? SILHOUETTES[chosen().shape];
  };
  return (
    <img class={cx("ui-server-plush-logo", props.class)} src={source()} alt="" draggable={false} aria-hidden="true" />
  );
}
