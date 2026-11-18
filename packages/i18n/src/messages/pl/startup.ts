import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "Nie udało się uruchomić MyBot",
  "startup.failedBody":
    "{message}\n\nTwoje lokalne dane nie zostały zresetowane ani nadpisane. Kroki przywracania znajdziesz w przewodniku rozwiązywania problemów.",
  "startup.archiveChangedTitle": "Pliki MyBot zostały zmienione",
  "startup.archiveChangedBody":
    "Inny program zmienił plik app.asar MyBot. MyBot działa teraz, ale nie uruchomi się po zamknięciu.\n\nAby naprawić MyBot, zainstaluj go ponownie. Twoje lokalne dane zostaną zachowane.",
  "startup.filesDamagedBody":
    "Niektóre pliki MyBot są uszkodzone lub ich brakuje.\n\nAby naprawić MyBot, zainstaluj go ponownie. Twoje lokalne dane zostaną zachowane.",
  "startup.newerDataUpdatingTitle": "Aktualizowanie MyBot",
  "startup.newerDataUpdatingBody":
    "Nowsza wersja MyBot zapisała Twoje dane. MyBot instaluje najnowszą wersję, a potem uruchomi się ponownie.\n\nTwoje lokalne dane nie zostały zresetowane ani nadpisane.",
  "startup.newerDataTitle": "Zainstaluj najnowszy MyBot",
  "startup.newerDataBody":
    "Nowsza wersja MyBot zapisała Twoje dane, a ta wersja ({version}) nie może ich otworzyć. Zainstaluj najnowszą wersję, aby otworzyć swoje dane.\n\nTwoje lokalne dane nie zostały zresetowane ani nadpisane.",
  "startup.newerDataQuit": "Zakończ",
  "startup.recoveryWindowTitle": "Odzyskiwanie MyBot",
  "startup.recoveryTitle": "MyBot się nie otworzył",
  "startup.recoveryBody": {
    one: "MyBot {version} zatrzymał się przed otwarciem {count} raz z rzędu. Twoje lokalne dane nie zostały zresetowane ani nadpisane.",
    few: "MyBot {version} zatrzymał się przed otwarciem {count} razy z rzędu. Twoje lokalne dane nie zostały zresetowane ani nadpisane.",
    many: "MyBot {version} zatrzymał się przed otwarciem {count} razy z rzędu. Twoje lokalne dane nie zostały zresetowane ani nadpisane.",
    other:
      "MyBot {version} zatrzymał się przed otwarciem {count} razy z rzędu. Twoje lokalne dane nie zostały zresetowane ani nadpisane.",
  },
  "startup.recoveryHint":
    "Spróbuj ponownie albo zainstaluj ostatnią wersję, która się otwierała. Aby uzyskać pomoc, wyeksportuj diagnostykę i wyślij plik ze zgłoszeniem.",
  "startup.recoveryRetry": "Spróbuj ponownie",
  "startup.recoveryPreviousVersion": "Pobierz poprzednią wersję",
  "startup.recoveryExportDiagnostics": "Eksportuj diagnostykę",
  "startup.recoveryOpenDataFolder": "Otwórz folder danych",
  "startup.recoveryQuit": "Zakończ",
  "startup.recoveryDiagnosticsSaved": "Plik diagnostyki został zapisany.",
  "startup.recoveryActionFailed": "MyBot nie mógł wykonać tej czynności.",
} as const satisfies PartialTranslation<typeof source>;
