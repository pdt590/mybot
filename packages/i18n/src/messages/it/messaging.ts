import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/messaging";

export const messages = {
  "messaging.help.invalid_token":
    "Slack non accetta più MyBot in questo workspace. Potrebbe essere stato disinstallato. Connetti di nuovo il workspace.",
  "messaging.help.secret_storage_unavailable":
    "MyBot non riesce a leggere i token salvati su questo computer. Disconnetti il workspace, poi connettilo di nuovo.",
  "messaging.help.relay_unavailable":
    "MyBot non riesce a ricevere gli eventi di Slack su questo computer. Accedi, dai un nome a questo computer nelle impostazioni del server e tieni aperto MyBot.",
  "messaging.help.not_linked": "Questo workspace non è collegato a questo server. Seleziona Riconnetti per collegarlo.",
  "messaging.discordHelp.invalid_token":
    "Discord non accetta più MyBot in questo server Discord. Potrebbe essere stato rimosso. Connetti di nuovo il server Discord.",
  "messaging.discordHelp.secret_storage_unavailable":
    "MyBot non riesce a leggere i token salvati su questo computer. Disconnetti il server Discord, poi connettilo di nuovo.",
  "messaging.discordHelp.relay_unavailable":
    "MyBot non riesce a ricevere gli eventi di Discord su questo computer. Accedi, dai un nome a questo computer nelle impostazioni del server e tieni aperto MyBot.",
  "messaging.discordHelp.not_linked":
    "Questo server Discord non è collegato a questo server MyBot. Seleziona Riconnetti per collegarlo.",
} as const satisfies PartialTranslation<typeof source>;
