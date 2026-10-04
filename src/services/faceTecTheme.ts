// Protegey brand palette applied to FaceTec's own native capture UI — the live camera screen,
// frame, feedback bar, and buttons are FaceTec's own rendering (WASM/canvas), not ours, so this is
// the only way to restyle them: FaceTec's own Customization API, not CSS. Same navy/teal tokens as
// the rest of this app (src/index.css's @theme block).
const NAVY = '#0b1741';
const SURFACE = '#101d54';
const TEAL = '#16d6b6';
const INK = '#f4f6f8';
const MUTED = '#93a2c7';
const DANGER = '#ff8a3d';

/** Builds and applies a FaceTecCustomization instance in Protegey's colors. Safe to call more than
 * once (e.g. on every initializeFaceTec() call) — FaceTecSDK.setCustomization() just replaces the
 * active customization each time, no accumulation. */
export function applyProtegeyFaceTecTheme(): void {
  const sdk = window.FaceTecSDK;
  if (!sdk) return;

  const customization = new sdk.FaceTecCustomization();

  // The live camera frame — border + area around the oval/guide shape.
  customization.frameCustomization.borderColor = TEAL;
  customization.frameCustomization.backgroundColor = NAVY;

  // The overlay behind the frame (visible letterboxing on wide screens).
  customization.overlayCustomization.backgroundColor = NAVY;
  customization.overlayCustomization.showBrandingImage = false;

  // The instruction pill ("Scan Front of ID", "Hold Still", etc.) shown during live capture.
  customization.feedbackCustomization.backgroundColor = 'rgba(16, 29, 84, 0.9)';
  customization.feedbackCustomization.textColor = INK;

  // Ready/Retry screens shown before and after a capture attempt.
  customization.guidanceCustomization.backgroundColors = NAVY;
  customization.guidanceCustomization.foregroundColor = INK;
  customization.guidanceCustomization.buttonBackgroundNormalColor = TEAL;
  customization.guidanceCustomization.buttonBackgroundHighlightColor = '#11b89c';
  customization.guidanceCustomization.buttonBackgroundDisabledColor = MUTED;
  customization.guidanceCustomization.buttonTextNormalColor = '#06231d';
  customization.guidanceCustomization.buttonTextHighlightColor = '#06231d';
  customization.guidanceCustomization.retryScreenImageBorderColor = TEAL;
  customization.guidanceCustomization.retryScreenOvalStrokeColor = TEAL;

  // Result screen (success / failure animation + message).
  customization.resultScreenCustomization.backgroundColors = NAVY;
  customization.resultScreenCustomization.foregroundColor = INK;
  customization.resultScreenCustomization.resultAnimationBackgroundColor = SURFACE;
  customization.resultScreenCustomization.resultAnimationForegroundColor = TEAL;
  customization.resultScreenCustomization.resultAnimationUnsuccessBackgroundColor = SURFACE;
  customization.resultScreenCustomization.resultAnimationUnsuccessForegroundColor = DANGER;

  // The oval guide shown during the face liveness step.
  customization.ovalCustomization.strokeColor = TEAL;
  customization.ovalCustomization.progressColor1 = TEAL;
  customization.ovalCustomization.progressColor2 = SURFACE;

  sdk.setCustomization(customization);
}
