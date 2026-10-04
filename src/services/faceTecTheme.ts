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

  // The live camera frame — area around the oval/guide shape. No border: it read as an unnecessary
  // extra outline around both the camera box and the button bar beneath it.
  customization.frameCustomization.borderColor = 'transparent';
  customization.frameCustomization.backgroundColor = NAVY;

  // The overlay behind the frame (visible letterboxing on wide screens) — FaceTec renders our own
  // logo underneath the frame when given one, same spot our own screens put it (PageShell).
  customization.overlayCustomization.backgroundColor = NAVY;
  customization.overlayCustomization.showBrandingImage = true;
  customization.overlayCustomization.brandingImage = 'https://protegey-bucket.s3.eu-north-1.amazonaws.com/public/constant/protegey_logo.svg';

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

  // ID Scan has its OWN separate customization namespace — none of the above touches the
  // document-type selection, capture ("Scan Front of ID"), review ("Confirm Photo is Sharp &
  // Legible" + Retry/Accept), or feedback screens. All of those live here instead.
  const idScan = customization.idScanCustomization;
  idScan.selectionScreenBackgroundColors = NAVY;
  idScan.selectionScreenForegroundColor = INK;

  idScan.captureScreenBackgroundColor = NAVY;
  idScan.captureScreenForegroundColor = INK;
  idScan.captureScreenTextBackgroundColor = 'rgba(16, 29, 84, 0.9)';
  idScan.captureFrameStrokeColor = 'transparent';

  idScan.reviewScreenBackgroundColors = NAVY;
  idScan.reviewScreenForegroundColor = INK;
  idScan.reviewScreenTextBackgroundColor = 'rgba(16, 29, 84, 0.9)';

  idScan.idFeedbackScreenBackgroundColors = NAVY;
  idScan.idFeedbackScreenForegroundColor = INK;

  idScan.additionalReviewScreenBackgroundColors = NAVY;
  idScan.additionalReviewScreenForegroundColor = INK;
  idScan.additionalReviewTagImageColor = TEAL;
  idScan.additionalReviewTagTextColor = INK;

  // Retry / Accept buttons on the Review screen, and the buttons on every other ID Scan screen.
  idScan.buttonBackgroundNormalColor = TEAL;
  idScan.buttonBackgroundHighlightColor = '#11b89c';
  idScan.buttonBackgroundDisabledColor = MUTED;
  idScan.buttonTextNormalColor = '#06231d';
  idScan.buttonTextHighlightColor = '#06231d';
  idScan.buttonTextDisabledColor = '#06231d';
  idScan.buttonBorderColor = 'transparent';

  sdk.setCustomization(customization);
}
