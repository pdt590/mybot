import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot מארח מקומי",
  "window.localClientTitle": "MyBot לקוח מקומי",
  "window.computerUsePermissionTitle": "הפעלת שליטה במחשב",
} as const satisfies PartialTranslation<typeof source>;
