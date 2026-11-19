import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  // Kullanıcının okuduğu güncelleyici durumu.
  "error.update.unsupported": "Güncellemeler yüklü masaüstü derlemelerinde kullanılabilir.",
  "error.update.notReady": "Bir güncelleme yüklenmeye hazır değil.",
  "error.update.restartFailed": "MyBot güncellemeyi yüklemek için yeniden başlatılamadı.",
  "error.update.downloadStalled": "Güncelleme indirmesi yanıt vermeyi durdurdu. Tekrar deneyin.",
  "error.update.installFailed": "Güncelleme yüklenemedi. MyBot'tan çıkıp yeniden açın, ardından tekrar deneyin.",
  "error.update.notInstalled": "Son yeniden başlatma güncellemeyi yüklemedi. Tekrar denemek için yeniden başlatın.",
  "error.update.downloadFailed": "Güncelleme indirilemedi. Tekrar deneyin.",
  "error.update.checkFailed": "Güncellemeler denetlenemedi. Tekrar deneyin.",
  "error.update.checkStalled": "Güncelleme denetimi yanıt vermeyi durdurdu. Tekrar deneyin.",
  "error.update.checkOffline":
    "Güncelleme hizmetine ulaşılamadı. İnternet bağlantınızı kontrol edin, ardından tekrar deneyin.",
  "error.update.checkUnavailable":
    "Güncelleme hizmeti yanıt vermedi. MyBot birkaç dakika içinde kendiliğinden tekrar dener.",
  "error.update.checkNoRelease":
    "Bu platform için yayımlanmış bir güncelleme bulunamadı. MyBot birkaç dakika içinde kendiliğinden tekrar dener.",
  "error.update.managedByNix": "Bu MyBot kopyasının güncellemelerini Nix yükler. Nix ile güncelleyin.",
  "error.update.managedByHost":
    "Bu Mac üzerindeki güncellemeler ana makine tarafından yüklenir. Güncelleme, ana makinenin bakımı çalışana kadar hazır kalır.",
  "error.update.siblingSession":
    "Bu uygulamadan çalışan başka bir MyBot oturumu var. Önce diğer tüm macOS kullanıcı hesaplarında MyBot'u durdurun, ardından güncellemeyi tekrar yükleyin.",
  "error.update.siblingSessionSameAccount":
    "Bu kullanıcı hesabında başka bir MyBot işlemi hâlâ çalışıyor. Bu işlemi kapatın, ardından güncellemeyi tekrar yükleyin.",
  "error.update.siblingCheckFailed": "Diğer MyBot oturumları doğrulanamadı. Yüklemeden önce tekrar deneyin.",
  "error.update.readOnlyLocation":
    "MyBot bu konumdan güncelleme yükleyemez. MyBot'tan çıkın. Finder'da MyBot'u Uygulamalar klasörüne sürükleyin (zaten oradaysa dışarı sürükleyip geri koyun). Ardından MyBot'u açın ve güncellemeyi yeniden yükleyin.",
  "error.update.appImageMissing":
    "AppImage dosyası taşındığı, yeniden adlandırıldığı veya değiştirildiği için MyBot güncellemeyi yükleyemiyor. MyBot'tan çıkın, sonra AppImage dosyasını yeniden açın.",
  "error.update.appImageReadOnly":
    "MyBot, AppImage dosyasının bulunduğu klasöre güncelleme yükleyemiyor. MyBot'tan çıkın, AppImage dosyasını ana klasörünüzdeki bir klasöre taşıyın, sonra dosyayı açıp güncellemeyi yeniden yükleyin.",
  // Katılınan bir sunucunun yöneticisi bunları ana makineden okur.
  "error.update.remoteDisabled": "Sunucu yöneticilerinden gelen güncellemeler bu bilgisayarda kapalı.",
  "error.update.restartStarted": "MyBot, güncellemeyi yüklemek için zaten yeniden başlatılıyor.",
  "error.update.alreadyRestarting": "MyBot zaten yeniden başlatılıyor.",
} as const satisfies PartialTranslation<typeof source>;
