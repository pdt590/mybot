// MyBot: the own Telegram bot of one agent, on the computer that runs it, as a page of the agent's
// settings panel, like Advanced. The user pastes the token of a bot from @BotFather, opens their own
// chat with a one-use link, and sees who can write and who waits for approval.

import type { TelegramBotDesktopApi, TelegramBotStatus } from "@openbot/contracts/ipc";
import { Button, Field, IconButton, Input, Trash2 } from "@openbot/ui";
import { SettingsPanelContent, SettingsPanelHeader } from "@openbot/ui/components/SettingsPanel";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

/** While the page is open, it reads the state again this often, for new requests and the connection. */
const REFRESH_MS = 3_000;

/** Read on each call: tests and stories replace `window.openbot`. */
export const telegramBotPort = (): TelegramBotDesktopApi => window.openbot.telegramBot;

interface AgentTelegramBotViewProps {
  agentId: string;
  onBack: () => void;
  onClose: () => void;
  /** The bot's `@username`, or null without a bot, for the settings row. */
  onStatusChange?: ((username: string | null) => void) | undefined;
  port?: TelegramBotDesktopApi | undefined;
}

export function AgentTelegramBotView(props: AgentTelegramBotViewProps) {
  const { t, errorMessage } = useText();
  const [status, setStatus] = createSignal<TelegramBotStatus | null>(null);
  const [token, setToken] = createSignal("");
  const [editingToken, setEditingToken] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const port = () => props.port ?? telegramBotPort();
  let timer: ReturnType<typeof setInterval> | undefined;

  function show(next: TelegramBotStatus): void {
    setStatus(next);
    props.onStatusChange?.(next.connection && next.botUsername ? `@${next.botUsername}` : null);
  }

  async function load(): Promise<void> {
    try {
      show(await port().status({ agentId: props.agentId }));
    } catch (caught) {
      setError(errorMessage(caught, t("agentSettings.telegram.loadFailed")));
    }
  }

  function stopRefresh(): void {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
  }

  createEffect(
    () => props.agentId,
    () => {
      stopRefresh();
      setStatus(null);
      setError(null);
      setToken("");
      setEditingToken(false);
      void load();
      timer = setInterval(() => void load(), REFRESH_MS);
    },
  );
  onCleanup(stopRefresh);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (caught) {
      setError(errorMessage(caught, t("agentSettings.telegram.actionFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function connect(): Promise<void> {
    const value = token().trim();
    if (!value) return;
    await run(async () => {
      show(await port().connect({ agentId: props.agentId, token: value }));
      setToken("");
      setEditingToken(false);
    });
  }

  function stateText(bot: TelegramBotStatus): string {
    const connection = bot.connection;
    if (!connection) return t("agentSettings.telegram.notConnected");
    if (bot.problem === "conflict") return t("agentSettings.telegram.stateConflict");
    switch (connection.state) {
      case "connected":
        return t("agentSettings.telegram.stateConnected");
      case "connecting":
        return t("agentSettings.telegram.stateConnecting");
      case "reconnecting":
      case "rate_limited":
        return t("agentSettings.telegram.stateReconnecting");
      case "invalid_token":
        return t("agentSettings.telegram.stateInvalidToken");
      case "paused":
        return t("agentSettings.telegram.statePaused");
      default:
        return t("agentSettings.telegram.stateError");
    }
  }

  const connected = () => status()?.connection ?? null;
  const healthy = () => connected()?.state === "connected" && status()?.problem === null;
  const hasPerson = () => status()?.allowedSenders.some((sender) => sender.kind === "contact") ?? false;

  const tokenCard = () => (
    <form
      class="agent-telegram-card"
      onSubmit={(event) => {
        event.preventDefault();
        void connect();
      }}
    >
      <span class="agent-telegram-note">{t("agentSettings.telegram.steps")}</span>
      <Field label={t("agentSettings.telegram.tokenLabel")}>
        <Input type="password" autocomplete="off" spellcheck={false} value={token()} onValueChange={setToken} />
      </Field>
      <div class="agent-telegram-actions">
        <Show when={editingToken()}>
          <Button type="button" variant="ghost" disabled={busy()} onClick={() => setEditingToken(false)}>
            {t("common.cancel")}
          </Button>
        </Show>
        <Button type="submit" loading={busy()} disabled={!token().trim()}>
          {t("agentSettings.telegram.connect")}
        </Button>
      </div>
    </form>
  );

  return (
    <>
      <SettingsPanelHeader
        title={t("agentSettings.telegram.title")}
        onBack={props.onBack}
        backLabel={t("agentSettings.backToSettings")}
        onClose={props.onClose}
        closeLabel={t("agentSettings.closeDetails")}
      />
      <SettingsPanelContent>
        <div class="agent-settings-page agent-telegram-page">
          <Show when={error()}>
            {(message) => (
              <p class="agent-memory-error" role="alert">
                {message()}
              </p>
            )}
          </Show>

          <Show when={status()} fallback={<p class="agent-memory-state">…</p>}>
            {(bot) => (
              <Show
                when={connected()}
                fallback={
                  <>
                    <span class="agent-telegram-note">{t("agentSettings.telegram.description")}</span>
                    {tokenCard()}
                  </>
                }
              >
                {(connection) => (
                  <>
                    <div class="agent-settings-notifications">
                      <div>
                        <strong>{connection().workspaceName}</strong>
                        <span>{stateText(bot())}</span>
                      </div>
                      <Show when={!healthy()}>
                        <Button
                          variant="outline"
                          type="button"
                          disabled={busy()}
                          onClick={() => void run(() => port().reconnect({ agentId: props.agentId }))}
                        >
                          {t("agentSettings.telegram.reconnect")}
                        </Button>
                      </Show>
                    </div>

                    <div class="agent-settings-notifications">
                      <div>
                        <strong>{t("agentSettings.telegram.openChat")}</strong>
                        <span>{t("agentSettings.telegram.openChatHint")}</span>
                      </div>
                      <Button
                        variant="outline"
                        type="button"
                        disabled={busy() || !healthy()}
                        onClick={() => void run(() => port().open({ agentId: props.agentId, place: "direct" }))}
                      >
                        {t("agentSettings.telegram.open")}
                      </Button>
                    </div>

                    <div class="agent-settings-notifications">
                      <div>
                        <strong>{t("agentSettings.telegram.addGroup")}</strong>
                        <span>{t("agentSettings.telegram.groupHint")}</span>
                      </div>
                      <Button
                        variant="outline"
                        type="button"
                        disabled={busy() || !healthy() || !hasPerson()}
                        onClick={() => void run(() => port().open({ agentId: props.agentId, place: "group" }))}
                      >
                        {t("agentSettings.telegram.add")}
                      </Button>
                    </div>

                    <Show when={bot().pendingRequests.length > 0}>
                      <div class="agent-telegram-card">
                        <strong>{t("agentSettings.telegram.requests")}</strong>
                        <ul class="agent-telegram-list">
                          <For each={bot().pendingRequests}>
                            {(request) => (
                              <li class="agent-telegram-row">
                                <span>
                                  {t("agentSettings.telegram.requestLine", { name: request.name, code: request.code })}
                                </span>
                                <span class="agent-telegram-row-actions">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy()}
                                    onClick={() =>
                                      void run(() =>
                                        port().answerRequest({
                                          agentId: props.agentId,
                                          code: request.code,
                                          approve: false,
                                        }),
                                      )
                                    }
                                  >
                                    {t("agentSettings.telegram.deny")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={busy()}
                                    onClick={() =>
                                      void run(() =>
                                        port().answerRequest({
                                          agentId: props.agentId,
                                          code: request.code,
                                          approve: true,
                                        }),
                                      )
                                    }
                                  >
                                    {t("agentSettings.telegram.approve")}
                                  </Button>
                                </span>
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    </Show>

                    <div class="agent-telegram-card">
                      <strong>{t("agentSettings.telegram.allowed")}</strong>
                      <Show
                        when={bot().allowedSenders.length > 0}
                        fallback={<span class="agent-telegram-note">{t("agentSettings.telegram.allowedEmpty")}</span>}
                      >
                        <ul class="agent-telegram-list">
                          <For each={bot().allowedSenders}>
                            {(sender) => (
                              <li class="agent-telegram-row">
                                <span class="agent-telegram-sender">
                                  <span>{sender.name}</span>
                                  <span class="agent-telegram-note">
                                    {sender.kind === "group"
                                      ? t("agentSettings.telegram.group")
                                      : t("agentSettings.telegram.contact")}
                                  </span>
                                </span>
                                <IconButton
                                  label={t("agentSettings.telegram.remove", { name: sender.name })}
                                  variant="destructive-ghost"
                                  disabled={busy()}
                                  onClick={() =>
                                    void run(() => port().removeSender({ agentId: props.agentId, senderId: sender.id }))
                                  }
                                >
                                  <Trash2 />
                                </IconButton>
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                    </div>

                    <Show
                      when={editingToken()}
                      fallback={
                        <div class="agent-settings-notifications">
                          <div>
                            <strong>{t("agentSettings.telegram.changeToken")}</strong>
                            <span>{t("agentSettings.telegram.changeTokenHint")}</span>
                          </div>
                          <Button
                            variant="outline"
                            type="button"
                            disabled={busy()}
                            onClick={() => setEditingToken(true)}
                          >
                            {t("agentSettings.telegram.change")}
                          </Button>
                        </div>
                      }
                    >
                      {tokenCard()}
                    </Show>

                    <div class="agent-settings-notifications">
                      <div>
                        <strong>{t("agentSettings.telegram.disconnect")}</strong>
                        <span>{t("agentSettings.telegram.disconnectHint")}</span>
                      </div>
                      <Button
                        variant="destructive"
                        type="button"
                        disabled={busy()}
                        onClick={() => void run(() => port().disconnect({ agentId: props.agentId }))}
                      >
                        {t("agentSettings.telegram.disconnect")}
                      </Button>
                    </div>

                    <span class="agent-telegram-note">{t("agentSettings.telegram.permissionsNote")}</span>
                  </>
                )}
              </Show>
            )}
          </Show>
        </div>
      </SettingsPanelContent>
    </>
  );
}
