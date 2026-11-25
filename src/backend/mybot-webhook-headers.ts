// MyBot: the signature headers of MyBot's own webhook server (`src/main/local-webhook-server.ts`). They replace
// upstream's `x-openbot-*`, which only the upstream Signal relay reads.
export const MYBOT_WEBHOOK_TIMESTAMP_HEADER = "x-mybot-timestamp";
export const MYBOT_WEBHOOK_DELIVERY_ID_HEADER = "x-mybot-delivery-id";
export const MYBOT_WEBHOOK_SIGNATURE_HEADER = "x-mybot-signature";
