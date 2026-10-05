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
const BORDER = '#24315f';
// Same Google Fonts already loaded for the rest of this app in index.css — FaceTec just needs the
// CSS font-family string, same as any other font-family declaration.
const FONT_DISPLAY = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_BODY = '"Inter", ui-sans-serif, system-ui, sans-serif';

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
  // The full wordmark logo (shield + "Protegey" text, ~5:1 aspect ratio) rendered huge here —
  // FaceTec renders this image at a fixed height, so a very wide asset ends up spanning most of
  // the screen width. The shield-only mark (square, already shipped as this app's own favicon) is
  // the same asset used at a much smaller visual size elsewhere in the app's own UI.
  customization.overlayCustomization.brandingImage = '/favicon.svg';

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
  customization.guidanceCustomization.headerFont = FONT_DISPLAY;
  customization.guidanceCustomization.subtextFont = FONT_BODY;
  customization.guidanceCustomization.buttonFont = FONT_DISPLAY;

  // Result screen (success / failure animation + message).
  customization.resultScreenCustomization.backgroundColors = NAVY;
  customization.resultScreenCustomization.foregroundColor = INK;
  customization.resultScreenCustomization.resultAnimationBackgroundColor = SURFACE;
  customization.resultScreenCustomization.resultAnimationForegroundColor = TEAL;
  customization.resultScreenCustomization.resultAnimationUnsuccessBackgroundColor = SURFACE;
  customization.resultScreenCustomization.resultAnimationUnsuccessForegroundColor = DANGER;

  // The spinner + "Loading Camera"-style message shown while FaceTec is getting the camera ready.
  customization.initialLoadingAnimationCustomization.backgroundColor = SURFACE;
  customization.initialLoadingAnimationCustomization.foregroundColor = TEAL;
  customization.initialLoadingAnimationCustomization.messageFont = FONT_BODY;

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
  // Matches the rounded-2xl (16px) cards used everywhere else in this app (PageShell, ScanFrame).
  idScan.captureFrameCornerRadius = '16px';

  idScan.reviewScreenBackgroundColors = NAVY;
  idScan.reviewScreenForegroundColor = INK;
  idScan.reviewScreenTextBackgroundColor = 'rgba(16, 29, 84, 0.9)';

  idScan.headerFont = FONT_DISPLAY;
  idScan.subtextFont = FONT_BODY;
  idScan.buttonFont = FONT_DISPLAY;

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

  // The OCR Confirmation Screen ("Examiner et confirmer") — a completely separate namespace from
  // everything above, so it was left on FaceTec's plain white/blue default until now: cramped
  // spacing, English field labels (handled separately via configureOCRLocalization — see
  // useFaceTec.ts), and a default blue "Défiler vers le bas" pill that clashed with our palette.
  const ocr = customization.ocrConfirmationCustomization;
  ocr.backgroundColors = NAVY;
  ocr.mainHeaderDividerLineColor = TEAL;
  ocr.mainHeaderFont = FONT_DISPLAY;
  ocr.mainHeaderTextColor = INK;
  ocr.sectionHeaderFont = FONT_DISPLAY;
  ocr.sectionHeaderTextColor = INK;
  ocr.fieldLabelFont = FONT_BODY;
  ocr.fieldLabelTextColor = MUTED;
  ocr.fieldValueFont = FONT_BODY;
  ocr.fieldValueTextColor = INK;

  ocr.inputFieldBackgroundColor = SURFACE;
  ocr.inputFieldFont = FONT_BODY;
  ocr.inputFieldTextColor = INK;
  ocr.inputFieldBorderColor = BORDER;
  ocr.inputFieldBorderWidth = '1px';
  ocr.inputFieldCornerRadius = '12px';
  ocr.inputFieldPlaceholderFont = FONT_BODY;
  ocr.inputFieldPlaceholderTextColor = MUTED;
  ocr.showInputFieldBottomBorderOnly = false;

  ocr.buttonFont = FONT_DISPLAY;
  ocr.buttonBorderColor = 'transparent';
  ocr.buttonCornerRadius = '12px';
  ocr.buttonTextNormalColor = '#06231d';
  ocr.buttonTextHighlightColor = '#06231d';
  ocr.buttonTextDisabledColor = '#06231d';
  ocr.buttonBackgroundNormalColor = TEAL;
  ocr.buttonBackgroundHighlightColor = '#11b89c';
  ocr.buttonBackgroundDisabledColor = MUTED;

  // The "Défiler vers le bas" pill shown when fields overflow the screen.
  ocr.scrollIndicatorBackgroundNormalColor = SURFACE;
  ocr.scrollIndicatorBackgroundHighlightColor = SURFACE;
  ocr.scrollIndicatorForegroundNormalColor = TEAL;
  ocr.scrollIndicatorForegroundHighlightColor = TEAL;
  ocr.scrollIndicatorBorderColor = 'transparent';
  ocr.scrollIndicatorCornerRadius = '999px';
  ocr.scrollIndicatorFont = FONT_DISPLAY;

  sdk.setCustomization(customization);
}
