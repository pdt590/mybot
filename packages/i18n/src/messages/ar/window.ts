import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot – المضيف المحلي",
  "window.localClientTitle": "MyBot – العميل المحلي",
  "window.computerUsePermissionTitle": "تشغيل التحكم في الحاسوب",
} as const satisfies PartialTranslation<typeof source>;
