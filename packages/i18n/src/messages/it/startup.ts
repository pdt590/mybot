import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "MyBot non è riuscito ad avviarsi",
  "startup.failedBody":
    "{message}\n\nI tuoi dati locali non sono stati reimpostati né sovrascritti. Consulta la guida alla risoluzione dei problemi per i passaggi di ripristino.",
  "startup.archiveChangedTitle": "I file di MyBot sono stati modificati",
  "startup.archiveChangedBody":
    "Un altro programma ha modificato il file app.asar di MyBot. MyBot ora funziona, ma non si aprirà più dopo la chiusura.\n\nPer ripararlo, installa di nuovo MyBot. I tuoi dati locali restano.",
  "startup.filesDamagedBody":
    "Alcuni file di MyBot sono danneggiati o mancanti.\n\nPer ripararlo, installa di nuovo MyBot. I tuoi dati locali restano.",
  "startup.newerDataUpdatingTitle": "Aggiornamento di MyBot",
  "startup.newerDataUpdatingBody":
    "Una versione più recente di MyBot ha salvato i tuoi dati. MyBot installa l’ultima versione e poi si riapre.\n\nI tuoi dati locali non sono stati reimpostati né sovrascritti.",
  "startup.newerDataTitle": "Installa l’ultima versione di MyBot",
  "startup.newerDataBody":
    "Una versione più recente di MyBot ha salvato i tuoi dati e questa versione ({version}) non può aprirli. Installa l’ultima versione per aprire i tuoi dati.\n\nI tuoi dati locali non sono stati reimpostati né sovrascritti.",
  "startup.newerDataQuit": "Esci",
  "startup.recoveryWindowTitle": "Ripristino di MyBot",
  "startup.recoveryTitle": "MyBot non si è aperto",
  "startup.recoveryBody": {
    one: "MyBot {version} si è chiuso prima di aprirsi, {count} volta di seguito. I tuoi dati locali non sono stati reimpostati né sovrascritti.",
    other:
      "MyBot {version} si è chiuso prima di aprirsi, {count} volte di seguito. I tuoi dati locali non sono stati reimpostati né sovrascritti.",
  },
  "startup.recoveryHint":
    "Riprova, oppure installa l’ultima versione che si è aperta. Per ricevere aiuto, esporta la diagnostica e invia il file con la tua segnalazione.",
  "startup.recoveryRetry": "Riprova",
  "startup.recoveryPreviousVersion": "Scarica versione precedente",
  "startup.recoveryExportDiagnostics": "Esporta diagnostica",
  "startup.recoveryOpenDataFolder": "Apri cartella dati",
  "startup.recoveryQuit": "Esci",
  "startup.recoveryDiagnosticsSaved": "Il file di diagnostica è stato salvato.",
  "startup.recoveryActionFailed": "MyBot non è riuscito a eseguire questa azione.",
} as const satisfies PartialTranslation<typeof source>;
