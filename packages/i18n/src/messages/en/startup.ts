import { defineMessages } from "../../message";

export const messages = defineMessages("startup", {
  "startup.failedTitle": "MyBot couldn’t start",
  "startup.failedBody":
    "{message}\n\nYour local data was not reset or overwritten. See the troubleshooting guide for recovery steps.",
  "startup.archiveChangedTitle": "MyBot files were changed",
  "startup.archiveChangedBody":
    "Another program changed the MyBot file app.asar. MyBot runs now, but it will not open after you quit it.\n\nTo repair MyBot, install it again. Your local data stays.",
  "startup.filesDamagedBody":
    "Some MyBot files are damaged or missing.\n\nTo repair MyBot, install it again. Your local data stays.",
  "startup.newerDataUpdatingTitle": "Updating MyBot",
  "startup.newerDataUpdatingBody":
    "A newer version of MyBot saved your data. MyBot installs the latest version and then opens again.\n\nYour local data was not reset or overwritten.",
  "startup.newerDataTitle": "Install the latest MyBot",
  "startup.newerDataBody":
    "A newer version of MyBot saved your data, and this version ({version}) cannot open it. Install the latest version to open your data.\n\nYour local data was not reset or overwritten.",
  "startup.newerDataQuit": "Quit",
  "startup.newerDataLoopTitle": "The latest MyBot did not open",
  "startup.newerDataLoopBody":
    "A newer version of MyBot saved your data, and this version ({version}) cannot open it. MyBot {loopVersion} stopped before it opened several times in a row, so it is not installed again.\n\nInstall a version newer than {loopVersion} when one is available. To get help, open the guide.\n\nYour local data was not reset or overwritten.",
  "startup.recoveryWindowTitle": "MyBot recovery",
  "startup.recoveryTitle": "MyBot did not open",
  "startup.recoveryBody": {
    one: "MyBot {version} stopped before it opened, {count} time in a row. Your local data was not reset or overwritten.",
    other:
      "MyBot {version} stopped before it opened, {count} times in a row. Your local data was not reset or overwritten.",
  },
  "startup.recoveryHint":
    "Try again, or install the last version that opened. To get help, export the diagnostics and send the file with your report.",
  "startup.recoveryHintLatest":
    "MyBot found no earlier version that can open your data. Try again, or install the latest version. To get help, export the diagnostics and send the file with your report.",
  "startup.recoveryRetry": "Try again",
  "startup.recoveryExportDiagnostics": "Export diagnostics",
  "startup.recoveryOpenDataFolder": "Open data folder",
  "startup.recoveryQuit": "Quit",
  "startup.recoveryDiagnosticsSaved": "The diagnostics file is saved.",
  "startup.recoveryActionFailed": "MyBot could not do this action.",
});
