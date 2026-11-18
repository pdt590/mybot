import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "MyBot kan niet starten",
  "startup.failedBody":
    "{message}\n\nJe lokale gegevens zijn niet gereset of overschreven. Bekijk de handleiding voor probleemoplossing voor herstelstappen.",
  "startup.archiveChangedTitle": "MyBot-bestanden zijn gewijzigd",
  "startup.archiveChangedBody":
    "Een ander programma heeft het MyBot-bestand app.asar gewijzigd. MyBot werkt nu, maar opent niet meer nadat je het afsluit.\n\nInstalleer MyBot opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.filesDamagedBody":
    "Sommige MyBot-bestanden zijn beschadigd of ontbreken.\n\nInstalleer MyBot opnieuw om het te herstellen. Je lokale gegevens blijven bewaard.",
  "startup.newerDataUpdatingTitle": "MyBot wordt bijgewerkt",
  "startup.newerDataUpdatingBody":
    "Een nieuwere versie van MyBot heeft je gegevens opgeslagen. MyBot installeert de nieuwste versie en opent daarna opnieuw.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataTitle": "Installeer de nieuwste MyBot",
  "startup.newerDataBody":
    "Een nieuwere versie van MyBot heeft je gegevens opgeslagen, en deze versie ({version}) kan ze niet openen. Installeer de nieuwste versie om je gegevens te openen.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.newerDataQuit": "Stoppen",
  "startup.newerDataLoopTitle": "De nieuwste MyBot opende niet",
  "startup.newerDataLoopBody":
    "Een nieuwere versie van MyBot heeft je gegevens opgeslagen, en deze versie ({version}) kan ze niet openen. MyBot {loopVersion} stopte meerdere keren achter elkaar voordat het opende, dus het wordt niet opnieuw geïnstalleerd.\n\nInstalleer een versie nieuwer dan {loopVersion} zodra er een beschikbaar is. Open de gids voor hulp.\n\nJe lokale gegevens zijn niet gereset of overschreven.",
  "startup.recoveryWindowTitle": "MyBot-herstel",
  "startup.recoveryTitle": "MyBot is niet geopend",
  "startup.recoveryBody": {
    one: "MyBot {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
    other:
      "MyBot {version} stopte voordat het openging, {count} keer achter elkaar. Je lokale gegevens zijn niet gewist of overschreven.",
  },
  "startup.recoveryHint":
    "Probeer het opnieuw, of installeer de laatste versie die wel opende. Exporteer voor hulp de diagnose en stuur het bestand mee met je melding.",
  "startup.recoveryHintLatest":
    "MyBot vond geen eerdere versie die je gegevens kan openen. Probeer het opnieuw, of installeer de nieuwste versie. Exporteer voor hulp de diagnose en stuur het bestand mee met je melding.",
  "startup.recoveryRetry": "Opnieuw",
  "startup.recoveryExportDiagnostics": "Diagnose exporteren",
  "startup.recoveryOpenDataFolder": "Gegevensmap openen",
  "startup.recoveryQuit": "Stoppen",
  "startup.recoveryDiagnosticsSaved": "Het diagnosebestand is opgeslagen.",
  "startup.recoveryActionFailed": "MyBot kon deze actie niet uitvoeren.",
} as const satisfies PartialTranslation<typeof source>;
