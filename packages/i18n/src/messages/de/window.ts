import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "Lokaler MyBot-Host",
  "window.localClientTitle": "Lokaler MyBot-Client",
  "window.computerUsePermissionTitle": "Computersteuerung aktivieren",
} as const satisfies PartialTranslation<typeof source>;
