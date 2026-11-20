import { useText } from "@openbot/ui/text";
import { SetupProviderPicker, type SetupProviders } from "./SetupProviderPicker";

export interface FirstRunPlanStepProps {
  providers: SetupProviders;
  disabled: boolean;
  menuMount: HTMLElement | undefined;
}

export function FirstRunPlanStep(props: FirstRunPlanStepProps) {
  const { t } = useText();
  return (
    // MyBot: no "Connect your plan" title or "Sign in once" description.
    <section class="onboarding-panel" aria-label={t("onboarding.provider.label")}>
      <div class="onboarding-provider">
        <SetupProviderPicker
          providers={props.providers}
          ariaLabel={t("onboarding.provider.defaultLabel")}
          label={t("onboarding.provider.label")}
          hint={t("onboarding.provider.hintChange")}
          disabled={props.disabled}
          menuMount={props.menuMount}
        />
      </div>
    </section>
  );
}
