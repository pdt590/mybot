import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  "status.messaging.working": "Mee bezig…",
  "status.messaging.queued": "Even wachten tot een eerder verzoek klaar is. Het antwoord komt hier.",
  "status.messaging.busy": "Er wachten te veel verzoeken. Probeer het later opnieuw.",
  "status.messaging.failed": "MyBot kon dit verzoek niet afronden. De MyBot-host heeft de details.",
  "status.messaging.noAnswer": "MyBot is klaar zonder geschreven antwoord.",
  "status.messaging.noAgent": "Er kan hier nog geen agent antwoorden. Voeg de Slack-orchestrator toe in MyBot.",
  "status.messaging.delegated": "Een teamgenoot is ermee bezig. Het antwoord komt hier.",
  "status.messaging.stopped": "Gestopt.",
  "status.messaging.stop": "Stop",
  "status.messaging.approvalTitle": "MyBot vraagt om goedkeuring om door te gaan.",
  "status.messaging.approvalTitleTeammate": "Teamgenoot {agent} vraagt om goedkeuring om door te gaan.",
  "status.messaging.approvalCommand": "Een opdracht uitvoeren",
  "status.messaging.approvalFileChange": "Bestanden wijzigen",
  "status.messaging.approvalPermissions": "Meer machtigingen krijgen",
  "status.messaging.approve": "Goedkeuren",
  "status.messaging.deny": "Weigeren",
  "status.messaging.approvedBy": "Goedgekeurd door {user}.",
  "status.messaging.deniedBy": "Geweigerd door {user}.",
  "status.messaging.answeredOnHost": "Beantwoord op de MyBot-host.",
  "status.messaging.requestInactive": "Dit verzoek is niet meer actief.",
  "status.messaging.onlyRequester": "Alleen {user} kan dit doen. De MyBot-host kan ook antwoorden.",
  "status.messaging.hostOnly": "Alleen de MyBot-host kan dit verzoek beantwoorden.",
  "status.messaging.filesSkipped": "Sommige bestanden zijn niet verstuurd: {names}.",
  "status.messaging.orchestratorName": "Slack-orchestrator",
  "status.messaging.orchestratorTitle": "Antwoordt in Slack en vraagt het team",
  "status.messaging.discordNoAgent":
    "Er kan hier nog geen agent antwoorden. Voeg de Discord-orchestrator toe in MyBot.",
  "status.messaging.discordOrchestratorName": "Discord-orchestrator",
  "status.messaging.discordOrchestratorTitle": "Antwoordt in Discord en vraagt het team",
  "status.messaging.integrationsSection": "Integraties",
  "status.messaging.signInReceived": "MyBot heeft de Slack-installatie ontvangen. Je kunt dit tabblad sluiten.",
  "status.messaging.signInUnknown": "MyBot heeft deze Slack-installatie niet gestart. Start hem opnieuw in MyBot.",
  "status.messaging.telegramNoAgent":
    "Er kan hier nog geen agent antwoorden. Open in MyBot Marktplaats > Apps > Telegram en klik op Agent toevoegen.",
  "status.messaging.telegramLinked":
    "MyBot is verbonden met deze chat. Noem {bot} of reageer op een bericht van MyBot om de agents iets te vragen.",
  "status.messaging.telegramNotLinked":
    "MyBot is niet verbonden met deze chat. Open de MyBot-app, ga naar Marktplaats → Apps → Telegram en kies 'Toevoegen aan een groep' of 'Open een directe chat' om te verbinden.",
  "status.messaging.telegramOrchestratorName": "Telegram-orchestrator",
  "status.messaging.telegramOrchestratorTitle": "Antwoordt in Telegram en vraagt het team",
  "status.messaging.whatsappNoAgent":
    "Er kan hier nog geen agent antwoorden. Voeg de WhatsApp-orchestrator toe in MyBot.",
  "status.messaging.whatsappApprovalMenu": "Antwoord 1 om goed te keuren of 2 om te weigeren.",
  "status.messaging.whatsappStopMenu": "Antwoord “stop” om te stoppen.",
  "status.messaging.whatsappPairingCode":
    "Dit nummer antwoordt alleen mensen die de eigenaar heeft toegestaan. Geef de eigenaar deze code: {code}",
  "status.messaging.whatsappPairingApproved": "Je kunt nu verzoeken naar dit nummer sturen.",
  "status.messaging.whatsappOwnChat": "Bericht aan jezelf",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *MyBot is verbonden*\n\nSchrijf hier om je agents iets te vragen. De WhatsApp Orchestrator antwoordt, of geeft het werk aan de juiste agent.\n\nStuur *stop* om een verzoek te stoppen.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *MyBot is verbonden*\n\nDe mensen die je in MyBot toestaat, kunnen nu naar dit nummer schrijven. Een nieuw persoon krijgt een code: keur die goed in MyBot onder Verzoeken.\n\nStuur *stop* om een verzoek te stoppen.",
  "status.messaging.whatsappOtherOpenBot":
    "Er is nog een MyBot aan dit WhatsApp-nummer gekoppeld, dus je kunt twee antwoorden krijgen. Open om dit op te lossen Gekoppelde apparaten in WhatsApp op je telefoon en log uit bij de MyBot die je niet gebruikt.",
  "status.messaging.whatsappPaused":
    "MyBot antwoordt hier 10 minuten niet: er kwamen te veel berichten in korte tijd. Als er nog een MyBot aan dit nummer is gekoppeld, open dan Gekoppelde apparaten in WhatsApp op je telefoon en log uit bij de MyBot die je niet gebruikt.",
  "status.messaging.whatsappOrchestratorName": "WhatsApp-orchestrator",
  "status.messaging.whatsappOrchestratorTitle": "Antwoordt in WhatsApp en vraagt het team",
} as const satisfies PartialTranslation<typeof source>;
