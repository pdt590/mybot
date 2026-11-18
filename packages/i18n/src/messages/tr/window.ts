import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot Yerel Ana Makine",
  "window.localClientTitle": "MyBot Yerel İstemci",
  "window.computerUsePermissionTitle": "Bilgisayar Kullanımını aç",
} as const satisfies PartialTranslation<typeof source>;
