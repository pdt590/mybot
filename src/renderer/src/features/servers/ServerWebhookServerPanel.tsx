// MyBot: the settings of the app's own webhook server (`src/main/local-webhook-server.ts`). The webhook
// triggers of this computer receive their events there, in place of upstream's Signal relay.

import {
  isWebhookServerPublicUrl,
  WEBHOOK_SERVER_LOOPBACK_ADDRESS,
  type WebhookServerDesktopApi,
  type WebhookServerStatus,
} from "@openbot/contracts/ipc";
import {
  Button,
  CopyButton,
  Field,
  Input,
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsSection,
  Spinner,
  Text,
} from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createStore, Show, untrack } from "solid-js";
import type { ServerSettingsSectionHost } from "./server-settings-section";

export interface ServerWebhookServerOptions {
  api: WebhookServerDesktopApi;
}

const ALL_NETWORKS_ADDRESS = "0.0.0.0";
const SAVE_KEY = "webhook-server-save";

interface WebhookServerForm {
  publicUrl: string;
  bindAddress: string;
  port: string;
}

function formOf(status: WebhookServerStatus): WebhookServerForm {
  return { publicUrl: status.publicUrl ?? "", bindAddress: status.bindAddress, port: String(status.port) };
}

function parsedPort(value: string): number | null {
  if (!/^[0-9]{1,5}$/u.test(value.trim())) return null;
  const port = Number(value.trim());
  return port >= 1 && port <= 65_535 ? port : null;
}

export function ServerWebhookServerPanel(
  props: ServerWebhookServerOptions & Pick<ServerSettingsSectionHost, "busy" | "run" | "menuMount" | "showCopyError">,
) {
  const { t, errorMessage } = useText();
  const [state, setState] = createStore<{
    status: WebhookServerStatus | null;
    form: WebhookServerForm;
    loading: boolean;
    loadError: string | null;
    saved: boolean;
  }>({
    status: null,
    form: { publicUrl: "", bindAddress: WEBHOOK_SERVER_LOOPBACK_ADDRESS, port: "" },
    loading: true,
    loadError: null,
    saved: false,
  });

  const read = () => {
    props.api.status().then(
      (status) =>
        setState((current) => {
          current.status = status;
          current.form = formOf(status);
          current.loading = false;
        }),
      (error) =>
        setState((current) => {
          current.loadError = errorMessage(error, t("server.settings.actionFailed"));
          current.loading = false;
        }),
    );
  };
  const retry = () => {
    setState((current) => {
      current.loading = true;
      current.loadError = null;
    });
    read();
  };
  untrack(read);

  const edit = (change: Partial<WebhookServerForm>) =>
    setState((current) => {
      current.form = { ...current.form, ...change };
      current.saved = false;
    });

  const publicUrlError = () => {
    const value = state.form.publicUrl.trim();
    return value !== "" && !isWebhookServerPublicUrl(value) ? t("server.webhookServer.publicUrlInvalid") : undefined;
  };
  const portError = () => (parsedPort(state.form.port) === null ? t("server.webhookServer.portInvalid") : undefined);
  const changed = () => {
    const status = state.status;
    if (!status) return false;
    const saved = formOf(status);
    return (
      saved.publicUrl !== state.form.publicUrl.trim() ||
      saved.bindAddress !== state.form.bindAddress ||
      saved.port !== state.form.port.trim()
    );
  };
  const bindOptions = () => {
    const options = [WEBHOOK_SERVER_LOOPBACK_ADDRESS, ALL_NETWORKS_ADDRESS];
    const current = state.status?.bindAddress;
    return current && !options.includes(current) ? [...options, current] : options;
  };
  const bindLabel = (value: string) =>
    value === WEBHOOK_SERVER_LOOPBACK_ADDRESS
      ? t("server.webhookServer.bindLocal")
      : value === ALL_NETWORKS_ADDRESS
        ? t("server.webhookServer.bindAll")
        : value;

  const save = () => {
    const port = parsedPort(state.form.port);
    if (port === null || publicUrlError()) return;
    const publicUrl = state.form.publicUrl.trim();
    void props
      .run(SAVE_KEY, async () => {
        const status = await props.api.save({
          bindAddress: state.form.bindAddress,
          port,
          publicUrl: publicUrl === "" ? null : publicUrl,
        });
        setState((current) => {
          current.status = status;
          current.form = formOf(status);
        });
      })
      .then((done) => {
        if (done)
          setState((current) => {
            current.saved = true;
          });
      });
  };

  const statusText = (status: WebhookServerStatus) => {
    const address = `${status.bindAddress}:${status.port}`;
    if (status.problem === "port_in_use") return t("server.webhookServer.portInUse", { port: status.port });
    if (status.problem === "unavailable") return t("server.webhookServer.unavailable", { address });
    return status.listening ? t("server.webhookServer.listening", { address }) : t("server.webhookServer.idle");
  };

  return (
    <SettingsSection title={t("server.webhookServer.title")}>
      <Show when={state.loading}>
        <div class="server-settings-routine-feed-loading">
          <Spinner label={t("server.webhookServer.loading")} />
        </div>
      </Show>
      <Show when={state.loadError}>
        {(message) => (
          <div class="server-settings-routine-feed-error">
            <Text variant="caption" tone="danger" role="alert">
              {message()}
            </Text>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              {t("common.retry")}
            </Button>
          </div>
        )}
      </Show>
      <Show when={state.status}>
        {(status) => (
          <ItemGroup class="settings-modal-card">
            <Item size="spacious">
              <ItemContent class="server-settings-webhook-server">
                <ItemDescription class="server-settings-routine-feed-text">
                  {t("server.webhookServer.description")}
                </ItemDescription>
                <Text
                  variant="caption"
                  tone={status().problem ? "danger" : "muted"}
                  role={status().problem ? "alert" : undefined}
                >
                  {statusText(status())}
                </Text>
                <Field label={t("server.webhookServer.baseUrl")}>
                  <div class="server-settings-routine-feed-row">
                    <Input
                      size="md"
                      readonly
                      value={status().baseUrl}
                      title={status().baseUrl}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <CopyButton
                      value={status().baseUrl}
                      copiedLabel={t("common.copied")}
                      size="sm"
                      variant="outline"
                      onCopyError={props.showCopyError}
                    />
                  </div>
                </Field>
                <Field
                  label={t("server.webhookServer.publicUrl")}
                  description={t("server.webhookServer.publicUrlHint")}
                  error={publicUrlError()}
                >
                  <Input
                    type="url"
                    inputmode="url"
                    autocomplete="off"
                    spellcheck={false}
                    placeholder={t("server.webhookServer.publicUrlPlaceholder")}
                    value={state.form.publicUrl}
                    onValueChange={(publicUrl) => edit({ publicUrl })}
                  />
                </Field>
                <div class="server-settings-webhook-server-row">
                  <Field
                    label={t("server.webhookServer.bindAddress")}
                    description={
                      state.form.bindAddress === WEBHOOK_SERVER_LOOPBACK_ADDRESS
                        ? undefined
                        : t("server.webhookServer.bindAllHint")
                    }
                  >
                    <Select<string>
                      options={bindOptions()}
                      value={state.form.bindAddress}
                      placement="bottom-start"
                      onChange={(bindAddress) => {
                        if (bindAddress) edit({ bindAddress });
                      }}
                      itemComponent={(item) => (
                        <SelectItem item={item.item}>{bindLabel(item.item.rawValue)}</SelectItem>
                      )}
                    >
                      <SelectTrigger size="sm" aria-label={t("server.webhookServer.bindAddress")}>
                        <SelectValue<string>>{(value) => bindLabel(value.selectedOption())}</SelectValue>
                      </SelectTrigger>
                      <SelectContent mount={props.menuMount()} />
                    </Select>
                  </Field>
                  <Field label={t("server.webhookServer.port")} error={portError()}>
                    <Input
                      class="server-settings-webhook-server-port"
                      inputmode="numeric"
                      autocomplete="off"
                      value={state.form.port}
                      onValueChange={(port) => edit({ port })}
                    />
                  </Field>
                </div>
                <div class="server-settings-routine-feed-actions">
                  <Show when={state.saved && !changed()}>
                    <Text variant="caption" tone="muted" role="status">
                      {t("server.webhookServer.saved")}
                    </Text>
                  </Show>
                  <Button
                    type="button"
                    size="sm"
                    loading={props.busy() === SAVE_KEY}
                    disabled={Boolean(props.busy()) || !changed() || Boolean(publicUrlError() || portError())}
                    onClick={save}
                  >
                    {t("server.webhookServer.save")}
                  </Button>
                </div>
              </ItemContent>
            </Item>
          </ItemGroup>
        )}
      </Show>
    </SettingsSection>
  );
}
