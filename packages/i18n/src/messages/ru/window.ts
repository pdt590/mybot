import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot: локальный хост",
  "window.localClientTitle": "MyBot: локальный клиент",
  "window.computerUsePermissionTitle": "Включите управление компьютером",
} as const satisfies PartialTranslation<typeof source>;
