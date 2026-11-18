import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "MyBot no pudo iniciarse",
  "startup.failedBody":
    "{message}\n\nTus datos locales no se han restablecido ni sobrescrito. Consulta la guía de solución de problemas para recuperarlos.",
  "startup.archiveChangedTitle": "Se cambiaron archivos de MyBot",
  "startup.archiveChangedBody":
    "Otro programa cambió el archivo app.asar de MyBot. MyBot funciona ahora, pero no se abrirá después de cerrarlo.\n\nPara repararlo, vuelve a instalar MyBot. Tus datos locales se conservan.",
  "startup.filesDamagedBody":
    "Algunos archivos de MyBot están dañados o faltan.\n\nPara repararlo, vuelve a instalar MyBot. Tus datos locales se conservan.",
  "startup.newerDataUpdatingTitle": "Actualizando MyBot",
  "startup.newerDataUpdatingBody":
    "Una versión más reciente de MyBot guardó tus datos. MyBot instala la última versión y luego se abre de nuevo.\n\nTus datos locales no se restablecieron ni se sobrescribieron.",
  "startup.newerDataTitle": "Instala la última versión de MyBot",
  "startup.newerDataBody":
    "Una versión más reciente de MyBot guardó tus datos y esta versión ({version}) no puede abrirlos. Instala la última versión para abrir tus datos.\n\nTus datos locales no se restablecieron ni se sobrescribieron.",
  "startup.newerDataQuit": "Salir",
  "startup.newerDataLoopTitle": "La última versión de MyBot no se abrió",
  "startup.newerDataLoopBody":
    "Una versión más reciente de MyBot guardó tus datos y esta versión ({version}) no puede abrirlos. MyBot {loopVersion} se detuvo antes de abrirse varias veces seguidas, así que no se vuelve a instalar.\n\nInstala una versión más reciente que {loopVersion} cuando esté disponible. Para obtener ayuda, abre la guía.\n\nTus datos locales no se restablecieron ni se sobrescribieron.",
  "startup.recoveryWindowTitle": "Recuperación de MyBot",
  "startup.recoveryTitle": "MyBot no se abrió",
  "startup.recoveryBody": {
    one: "MyBot {version} se detuvo antes de abrirse, {count} vez seguida. Tus datos locales no se restablecieron ni se sobrescribieron.",
    other:
      "MyBot {version} se detuvo antes de abrirse, {count} veces seguidas. Tus datos locales no se restablecieron ni se sobrescribieron.",
  },
  "startup.recoveryHint":
    "Vuelve a intentarlo o instala la última versión que se abrió. Para obtener ayuda, exporta el diagnóstico y envía el archivo con tu informe.",
  "startup.recoveryHintLatest":
    "MyBot no encontró una versión anterior que pueda abrir tus datos. Vuelve a intentarlo o instala la última versión. Para obtener ayuda, exporta el diagnóstico y envía el archivo con tu informe.",
  "startup.recoveryRetry": "Reintentar",
  "startup.recoveryExportDiagnostics": "Exportar diagnóstico",
  "startup.recoveryOpenDataFolder": "Abrir carpeta de datos",
  "startup.recoveryQuit": "Salir",
  "startup.recoveryDiagnosticsSaved": "El archivo de diagnóstico se guardó.",
  "startup.recoveryActionFailed": "MyBot no pudo realizar esta acción.",
} as const satisfies PartialTranslation<typeof source>;
