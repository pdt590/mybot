import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/window";

export const messages = {
  "window.localHostTitle": "MyBot Yerel Ana Makine",
  "window.localClientTitle": "MyBot Yerel İstemci",
  "window.computerUsePermissionTitle": "Bilgisayar Kullanımını aç",
  "window.rendererStoppedTitle": "MyBot çalışmayı durdurdu",
  "window.rendererStoppedBody":
    "Pencere birkaç kez durdu. Sohbetleriniz kaydedildi ve ajanlarınız çalışmaya devam ediyor.",
  "window.rendererStoppedReload": "Yeniden yükle",
} as const satisfies PartialTranslation<typeof source>;
