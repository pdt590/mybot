import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "Обновления доступны в установленных сборках для компьютера.",
  "error.update.notReady": "Обновление не готово к установке.",
  "error.update.restartFailed": "MyBot не смог перезапуститься для установки обновления.",
  "error.update.downloadStalled": "Загрузка обновления перестала отвечать. Повторите попытку.",
  "error.update.installFailed":
    "Не удалось установить обновление. Закройте и снова откройте MyBot, затем повторите попытку.",
  "error.update.downloadFailed": "Не удалось загрузить обновление. Повторите попытку.",
  "error.update.checkFailed": "Не удалось проверить обновления. Повторите попытку.",
  "error.update.checkStalled": "Проверка обновлений перестала отвечать. Повторите попытку.",
  "error.update.checkOffline":
    "Не удалось связаться со службой обновлений. Проверьте подключение к интернету и повторите попытку.",
  "error.update.checkUnavailable": "Служба обновлений не ответила. MyBot сам повторит попытку через несколько минут.",
  "error.update.checkNoRelease":
    "Для этой платформы не найдено опубликованных обновлений. MyBot сам повторит попытку через несколько минут.",
  "error.update.managedByNix": "Обновления этой копии MyBot устанавливает Nix. Обновите её через Nix.",
  "error.update.managedByHost":
    "Обновления на этом Mac устанавливает хост. Обновление остаётся готовым до начала обслуживания хоста.",
  "error.update.siblingSession":
    "Из этого приложения всё ещё запущена другая сессия MyBot. Сначала закройте MyBot во всех других учётных записях macOS, затем установите обновление снова.",
  "error.update.siblingSessionSameAccount":
    "В этой учётной записи всё ещё работает другой процесс MyBot. Завершите его, затем установите обновление снова.",
  "error.update.siblingCheckFailed": "Не удалось проверить другие сессии MyBot. Повторите попытку перед установкой.",
  "error.update.readOnlyLocation":
    "MyBot не может устанавливать обновления из этого места. Закройте MyBot. В Finder перетащите MyBot в папку «Программы» (если он уже там, перетащите его наружу и обратно). Затем откройте MyBot и установите обновление снова.",
  "error.update.appImageMissing":
    "MyBot не может установить обновление, потому что его файл AppImage был перемещён, переименован или заменён. Закройте MyBot, затем снова откройте файл AppImage.",
  "error.update.appImageReadOnly":
    "MyBot не может устанавливать обновления в папку своего файла AppImage. Закройте MyBot, переместите файл AppImage в папку внутри домашней папки, затем откройте его и снова установите обновление.",
  "error.update.remoteDisabled": "Обновления от администраторов сервера отключены на этом компьютере.",
  "error.update.restartStarted": "MyBot уже перезапускается для установки обновления.",
  "error.update.alreadyRestarting": "MyBot уже перезапускается.",
} as const satisfies PartialTranslation<typeof source>;
