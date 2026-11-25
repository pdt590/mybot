import { defineMessages } from "../../../message";

export const messages = defineMessages("error.messaging", {
  "error.messaging.notConnected": "This Slack workspace is not connected.",
  "error.messaging.unsupported": "This computer cannot connect to Slack.",
  "error.messaging.relayUnavailable":
    "MyBot cannot receive Slack events on this computer. Sign in, give this computer a name, and try again.",
  "error.messaging.discordNotConnected": "This Discord server is not connected.",
  "error.messaging.discordUnsupported": "This computer cannot connect to Discord.",
  "error.messaging.discordRelayUnavailable":
    "MyBot cannot receive Discord events on this computer. Sign in, give this computer a name, and try again.",
  "error.messaging.discordRolesUnsupported": "MyBot cannot list Discord roles yet. Try again later.",
  "error.messaging.telegramNotConnected": "This Telegram chat is not connected.",
  "error.messaging.telegramUnsupported": "This computer cannot connect to Telegram.",
  "error.messaging.telegramRelayUnavailable":
    "MyBot cannot reach Telegram on this computer. Sign in, give this computer a name, and try again.",
  "error.messaging.telegramRelayUnreachable":
    "MyBot cannot connect to its service from this computer. Check the internet connection, VPN, proxy, or firewall, and try again.",
  "error.messaging.telegramServiceUnavailable": "MyBot cannot connect Telegram now. Try again later.",
  // MyBot: errors of an agent's own Telegram bot.
  "error.messaging.telegramBotNotConnected": "This agent has no Telegram bot.",
  "error.messaging.telegramBotTokenInvalid": "Telegram does not accept this token. Copy it again from @BotFather.",
  "error.messaging.telegramBotUnreachable": "MyBot cannot reach Telegram. Check the network and try again.",
  "error.messaging.telegramBotInUse": "This bot already belongs to another agent. Disconnect it there first.",
  "error.messaging.telegramBotRequestGone": "This request ended. Ask the person to write to the bot again.",
  "error.messaging.whatsappNotConnected": "This WhatsApp number is not connected.",
  "error.messaging.whatsappUnsupported": "This computer cannot connect to WhatsApp.",
  "error.messaging.whatsappTooManySenders": "A WhatsApp number can allow up to 200 contacts and groups.",
  "error.messaging.whatsappNumberNotFound":
    "This number has no WhatsApp account. Type it with its country code, such as +44 7700 900123.",
  "error.messaging.whatsappSenderNotFound": "This contact or group is not on the list now.",
  "error.messaging.whatsappRequestEnded": "This request ended. Ask the person to write again for a new code.",
  "error.messaging.memoryLimit": "A connected workspace can have up to {limit} memories. Delete one first.",
});
