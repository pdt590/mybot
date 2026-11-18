import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/host";

export const messages = {
  "status.host.registered": "Этот MyBot зарегистрирован для доступа через WebRTC.",
  "status.host.keyRotated": "Ключ сервера изменён. Связанные устройства остаются связанными.",
  "status.host.identityUpdated": "Идентификатор сервера обновлён.",
  "status.host.starting": "Запуск хоста WebRTC…",
  "status.host.ready": "Этот MyBot готов к подключениям WebRTC.",
  "status.host.signalLost": "Другие устройства сейчас не могут подключиться к этому MyBot. Он подключается снова.",
  "status.host.stopping": "Перевод этого MyBot в приватный режим…",
  "status.host.private": "Этот MyBot приватный.",
  "status.host.removed": "Этот MyBot удалён из вашего аккаунта. Опубликуйте его снова, чтобы открыть доступ.",
} as const satisfies PartialTranslation<typeof source>;
