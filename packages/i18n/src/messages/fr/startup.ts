import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "MyBot n’a pas pu démarrer",
  "startup.failedBody":
    "{message}\n\nVos données locales n’ont pas été réinitialisées ni écrasées. Consultez le guide de dépannage pour savoir comment récupérer la situation.",
  "startup.archiveChangedTitle": "Des fichiers d’MyBot ont été modifiés",
  "startup.archiveChangedBody":
    "Un autre programme a modifié le fichier app.asar d’MyBot. MyBot fonctionne maintenant, mais il ne s’ouvrira plus après sa fermeture.\n\nPour le réparer, réinstallez MyBot. Vos données locales sont conservées.",
  "startup.filesDamagedBody":
    "Certains fichiers d’MyBot sont endommagés ou manquants.\n\nPour le réparer, réinstallez MyBot. Vos données locales sont conservées.",
  "startup.newerDataUpdatingTitle": "Mise à jour d’MyBot",
  "startup.newerDataUpdatingBody":
    "Une version plus récente d’MyBot a enregistré vos données. MyBot installe la dernière version, puis se rouvre.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataTitle": "Installez la dernière version d’MyBot",
  "startup.newerDataBody":
    "Une version plus récente d’MyBot a enregistré vos données, et cette version ({version}) ne peut pas les ouvrir. Installez la dernière version pour ouvrir vos données.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.newerDataQuit": "Quitter",
  "startup.newerDataLoopTitle": "La dernière version d’MyBot ne s’est pas ouverte",
  "startup.newerDataLoopBody":
    "Une version plus récente d’MyBot a enregistré vos données, et cette version ({version}) ne peut pas les ouvrir. MyBot {loopVersion} s’est arrêté avant de s’ouvrir plusieurs fois de suite : il n’est donc pas réinstallé.\n\nInstallez une version plus récente que {loopVersion} dès qu’elle est disponible. Pour obtenir de l’aide, ouvrez le guide.\n\nVos données locales n’ont pas été réinitialisées ni écrasées.",
  "startup.recoveryWindowTitle": "Récupération d’MyBot",
  "startup.recoveryTitle": "MyBot ne s’est pas ouvert",
  "startup.recoveryBody": {
    one: "MyBot {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
    other:
      "MyBot {version} s’est arrêté avant de s’ouvrir, {count} fois de suite. Vos données locales n’ont pas été réinitialisées ni écrasées.",
  },
  "startup.recoveryHint":
    "Réessayez, ou installez la dernière version qui s’est ouverte. Pour obtenir de l’aide, exportez le diagnostic et envoyez le fichier avec votre rapport.",
  "startup.recoveryHintLatest":
    "MyBot n’a trouvé aucune version antérieure capable d’ouvrir vos données. Réessayez, ou installez la dernière version. Pour obtenir de l’aide, exportez le diagnostic et envoyez le fichier avec votre rapport.",
  "startup.recoveryRetry": "Réessayer",
  "startup.recoveryExportDiagnostics": "Exporter le diagnostic",
  "startup.recoveryOpenDataFolder": "Ouvrir le dossier des données",
  "startup.recoveryQuit": "Quitter",
  "startup.recoveryDiagnosticsSaved": "Le fichier de diagnostic est enregistré.",
  "startup.recoveryActionFailed": "MyBot n’a pas pu effectuer cette action.",
} as const satisfies PartialTranslation<typeof source>;
