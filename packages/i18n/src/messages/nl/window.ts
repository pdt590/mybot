import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "Lokale MyBot-host",
  "window.localClientTitle": "Lokale MyBot-client",
  "window.computerUsePermissionTitle": "Zet Computerbesturing aan",
} as const satisfies PartialTranslation<typeof source>;
