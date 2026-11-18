import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "MyBot не удалось запустить",
  "startup.failedBody":
    "{message}\n\nЛокальные данные не сброшены и не перезаписаны. Шаги восстановления — в руководстве по устранению неполадок.",
  "startup.archiveChangedTitle": "Файлы MyBot изменены",
  "startup.archiveChangedBody":
    "Другая программа изменила файл MyBot app.asar. Сейчас MyBot работает, но после выхода он больше не запустится.\n\nЧтобы исправить это, установите MyBot заново. Ваши локальные данные сохранятся.",
  "startup.filesDamagedBody":
    "Некоторые файлы MyBot повреждены или отсутствуют.\n\nЧтобы исправить это, установите MyBot заново. Ваши локальные данные сохранятся.",
  "startup.newerDataUpdatingTitle": "Обновление MyBot",
  "startup.newerDataUpdatingBody":
    "Более новая версия MyBot сохранила ваши данные. MyBot устанавливает последнюю версию и затем откроется снова.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataTitle": "Установите последнюю версию MyBot",
  "startup.newerDataBody":
    "Более новая версия MyBot сохранила ваши данные, и эта версия ({version}) не может их открыть. Установите последнюю версию, чтобы открыть данные.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataQuit": "Выйти",
  "startup.newerDataLoopTitle": "Последняя версия MyBot не открылась",
  "startup.newerDataLoopBody":
    "Более новая версия MyBot сохранила ваши данные, и эта версия ({version}) не может их открыть. MyBot {loopVersion} несколько раз подряд останавливался до открытия, поэтому он не будет установлен снова.\n\nУстановите версию новее {loopVersion}, когда она появится. Чтобы получить помощь, откройте руководство.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.recoveryWindowTitle": "Восстановление MyBot",
  "startup.recoveryTitle": "MyBot не открылся",
  "startup.recoveryBody": {
    one: "MyBot {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    few: "MyBot {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    many: "MyBot {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    other:
      "MyBot {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
  },
  "startup.recoveryHint":
    "Попробуйте снова или установите последнюю версию, которая открывалась. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryHintLatest":
    "MyBot не нашёл более раннюю версию, которая может открыть ваши данные. Попробуйте снова или установите последнюю версию. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryRetry": "Повторить",
  "startup.recoveryExportDiagnostics": "Экспорт диагностики",
  "startup.recoveryOpenDataFolder": "Открыть папку данных",
  "startup.recoveryQuit": "Выйти",
  "startup.recoveryDiagnosticsSaved": "Файл диагностики сохранён.",
  "startup.recoveryActionFailed": "MyBot не удалось выполнить это действие.",
} as const satisfies PartialTranslation<typeof source>;
