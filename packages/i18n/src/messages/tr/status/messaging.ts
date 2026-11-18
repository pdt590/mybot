import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  // Text that MyBot posts in a Slack conversation. Slack users read it. It names no agent: in
  // Slack, every answer comes from MyBot.
  "status.messaging.working": "Üzerinde çalışılıyor…",
  "status.messaging.queued": "Bekleniyor: MyBot başka bir istek üzerinde çalışıyor. Yanıt buraya gelecek.",
  "status.messaging.busy": "Çok fazla istek bekliyor. Daha sonra tekrar deneyin.",
  "status.messaging.failed": "MyBot bu isteği tamamlayamadı. Ayrıntılar MyBot ana makinesinde mevcuttur.",
  "status.messaging.noAnswer": "MyBot yazılı bir yanıt olmadan tamamlandı.",
  "status.messaging.noAgent": "Henüz burada yanıt verebilecek bir ajan yok. MyBot'ta Slack Düzenleyicisini ekleyin.",
  "status.messaging.delegated": "Bir ekip arkadaşı üzerinde çalışıyor. Yanıt buraya gelecek.",
  "status.messaging.stopped": "Durduruldu.",
  "status.messaging.stop": "Durdur",
  "status.messaging.approvalTitle": "MyBot devam etmek için onay istiyor.",
  "status.messaging.approvalCommand": "Bir komut çalıştır",
  "status.messaging.approvalFileChange": "Dosyaları değiştir",
  "status.messaging.approvalPermissions": "Daha fazla izin al",
  "status.messaging.approve": "Onayla",
  "status.messaging.deny": "Reddet",
  "status.messaging.approvedBy": "{user} tarafından onaylandı.",
  "status.messaging.deniedBy": "{user} tarafından reddedildi.",
  "status.messaging.answeredOnHost": "MyBot ana makinesinde yanıtlandı.",
  "status.messaging.requestInactive": "Bu istek artık etkin değil.",
  "status.messaging.onlyRequester": "Bunu yalnızca {user} yapabilir. MyBot ana makinesi de yanıt verebilir.",
  "status.messaging.hostOnly": "Bu isteği yalnızca MyBot ana makinesi yanıtlayabilir.",
  "status.messaging.filesSkipped": "Bazı dosyalar gönderilmedi: {names}.",
  // The name and title of the agent that MyBot adds to answer in Slack. The user can rename it.
  "status.messaging.orchestratorName": "Slack Düzenleyicisi",
  "status.messaging.orchestratorTitle": "Slack'te yanıt verir ve ekibe sorar",
  // The same texts for Discord. Discord users read the first one.
  "status.messaging.discordNoAgent":
    "Henüz burada yanıt verebilecek bir ajan yok. MyBot'ta Discord Düzenleyicisini ekleyin.",
  "status.messaging.discordOrchestratorName": "Discord Düzenleyicisi",
  "status.messaging.discordOrchestratorTitle": "Discord'da yanıt verir ve ekibe sorar",
  // The sidebar section that MyBot puts the Slack Orchestrator in. The user can rename it.
  "status.messaging.integrationsSection": "Entegrasyonlar",
  // The page a development Slack install ends on.
  "status.messaging.signInReceived": "MyBot Slack kurulumunu aldı. Bu sekmeyi kapatabilirsiniz.",
  "status.messaging.signInUnknown": "MyBot bu Slack kurulumunu başlatmadı. MyBot içinde tekrar başlatın.",
  "status.messaging.telegramNoAgent":
    "Henüz burada yanıt verebilecek bir ajan yok. MyBot'ta Telegram Düzenleyicisini ekleyin.",
  "status.messaging.telegramLinked":
    "MyBot bu sohbete bağlandı. Ajanlara sormak için {bot} adını anın veya MyBot'un bir mesajını yanıtlayın.",
  "status.messaging.telegramOrchestratorName": "Telegram Düzenleyicisi",
  "status.messaging.telegramOrchestratorTitle": "Telegram'da yanıt verir ve ekibe sorar",
  "status.messaging.whatsappNoAgent":
    "Henüz burada yanıt verebilecek bir ajan yok. MyBot'ta WhatsApp Düzenleyicisini ekleyin.",
  "status.messaging.whatsappApprovalMenu": "Onaylamak için 1, reddetmek için 2 yazın.",
  "status.messaging.whatsappStopMenu": "Durdurmak için “stop” yazın.",
  "status.messaging.whatsappPairingCode":
    "Bu numara yalnızca sahibinin izin verdiği kişileri yanıtlar. Sahibine şu kodu verin: {code}",
  "status.messaging.whatsappPairingApproved": "Artık bu numaraya istek gönderebilirsiniz.",
  "status.messaging.whatsappOwnChat": "Kendine mesaj gönder",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *MyBot bağlandı*\n\nAjanlarına sormak için buraya yaz. WhatsApp Orchestrator yanıtlar ya da işi doğru ajana verir.\n\nBir isteği durdurmak için *stop* gönder.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *MyBot bağlandı*\n\nOpenBot'ta izin verdiğin kişiler artık bu numaraya yazabilir. Yeni bir kişi bir kod alır: MyBot'ta İstekler altında onayla.\n\nBir isteği durdurmak için *stop* gönder.",
  "status.messaging.whatsappOtherOpenBot":
    "Bu WhatsApp numarasına başka bir MyBot da bağlı, bu yüzden iki yanıt alabilirsin. Düzeltmek için telefonundaki WhatsApp'ta Bağlı cihazlar'ı aç ve kullanmadığın MyBot'tan çıkış yap.",
  "status.messaging.whatsappPaused":
    "MyBot burada 10 dakika yanıt vermeyi durdurdu: kısa sürede çok fazla mesaj geldi. Bu numaraya başka bir MyBot da bağlıysa telefonundaki WhatsApp'ta Bağlı cihazlar'ı aç ve kullanmadığın MyBot'tan çıkış yap.",
  "status.messaging.whatsappOrchestratorName": "WhatsApp Düzenleyicisi",
  "status.messaging.whatsappOrchestratorTitle": "WhatsApp'ta yanıt verir ve ekibe sorar",
} as const satisfies PartialTranslation<typeof source>;
