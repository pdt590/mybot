import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/update";

export const messages = {
  "error.update.unsupported": "Gli aggiornamenti sono disponibili nelle versioni desktop installate.",
  "error.update.notReady": "Nessun aggiornamento è pronto da installare.",
  "error.update.restartFailed": "MyBot non è riuscito a riavviarsi per installare l'aggiornamento.",
  "error.update.downloadStalled": "Il download dell'aggiornamento ha smesso di rispondere. Riprova.",
  "error.update.installFailed": "Impossibile installare l'aggiornamento. Chiudi e riapri MyBot, poi riprova.",
  "error.update.notInstalled": "L'ultimo riavvio non ha installato l'aggiornamento. Riavvia per riprovare.",
  "error.update.downloadFailed": "Impossibile scaricare l'aggiornamento. Riprova.",
  "error.update.signatureNotConfirmed": "MyBot non è riuscito a verificare l'aggiornamento. Riprova.",
  "error.update.checkFailed": "Impossibile cercare aggiornamenti. Riprova.",
  "error.update.checkStalled": "La ricerca di aggiornamenti ha smesso di rispondere. Riprova.",
  "error.update.checkOffline":
    "Impossibile raggiungere il servizio di aggiornamento. Controlla la connessione a internet, poi riprova.",
  "error.update.checkUnavailable":
    "Il servizio di aggiornamento non ha risposto. MyBot riprova da solo tra qualche minuto.",
  "error.update.checkNoRelease":
    "Non è stato trovato nessun aggiornamento pubblicato per questa piattaforma. MyBot riprova da solo tra qualche minuto.",
  "error.update.managedByNix": "Nix installa gli aggiornamenti di questa copia di MyBot. Aggiornala con Nix.",
  "error.update.managedByHost":
    "Su questo Mac gli aggiornamenti vengono installati dall'host. L'aggiornamento resta pronto fino alla manutenzione dell'host.",
  "error.update.siblingSession":
    "Un'altra sessione di MyBot è ancora attiva da questa applicazione. Ferma prima MyBot in tutti gli altri account utente di macOS, poi installa di nuovo l'aggiornamento.",
  "error.update.siblingSessionSameAccount":
    "Un altro processo di MyBot è ancora attivo in questo account utente. Chiudilo, poi installa di nuovo l'aggiornamento.",
  "error.update.siblingCheckFailed": "Impossibile verificare le altre sessioni di MyBot. Riprova prima di installare.",
  "error.update.readOnlyLocation":
    "MyBot non può installare aggiornamenti da questa posizione. Esci da MyBot. Nel Finder, trascina MyBot nella cartella Applicazioni (se è già lì, trascinalo fuori e poi di nuovo dentro). Quindi apri MyBot e installa di nuovo l’aggiornamento.",
  "error.update.appImageMissing":
    "MyBot non può installare l'aggiornamento perché il suo file AppImage è stato spostato, rinominato o sostituito. Chiudi MyBot, poi apri di nuovo il file AppImage.",
  "error.update.appImageReadOnly":
    "MyBot non può installare aggiornamenti nella cartella del suo file AppImage. Chiudi MyBot, sposta il file AppImage in una cartella della tua cartella home, poi aprilo e installa di nuovo l'aggiornamento.",
  "error.update.remoteDisabled":
    "Gli aggiornamenti dagli amministratori del server sono disattivati su questo computer.",
  "error.update.restartStarted": "MyBot si sta già riavviando per installare l'aggiornamento.",
  "error.update.alreadyRestarting": "MyBot si sta già riavviando.",
} as const satisfies PartialTranslation<typeof source>;
