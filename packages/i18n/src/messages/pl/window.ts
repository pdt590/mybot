import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot – lokalny host",
  "window.localClientTitle": "MyBot – lokalny klient",
  "window.computerUsePermissionTitle": "Włącz Sterowanie komputerem",
} as const satisfies PartialTranslation<typeof source>;
