import { MYBOT_LOGO_IMAGE } from "@openbot/brand/mybot-logo-image";

// MyBot: the recovery window shows the MyBot logo in place of the plush. It keeps the "plush" class
// so the window's landing and breathing animations still apply.
export function recoveryPlushSvg(): string | null {
  return `<svg class="plush" viewBox="-110 -120 220 200" aria-hidden="true" focusable="false">
<defs><clipPath id="mybot-logo-clip"><rect x="-62" y="-104" width="124" height="124" rx="26" ry="26"/></clipPath></defs>
<image x="-62" y="-104" width="124" height="124" preserveAspectRatio="xMidYMid slice" clip-path="url(#mybot-logo-clip)" href="${MYBOT_LOGO_IMAGE}"/>
</svg>`;
}
