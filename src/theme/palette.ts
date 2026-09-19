// RAW@ Powerlifting brand palette, tuned separately for dark and light so
// contrast and comfort hold up in both — not just the dark colors with an
// inverted background.

export interface Palette {
  background: string;
  card: string;
  cardAlt: string;
  accent: string;
  accentText: string;
  accentMuted: string;
  text: string;
  silver: string;
  muted: string;
  faint: string;
  border: string;
  divider: string;
  success: string;
  successMuted: string;
  error: string;
  errorMuted: string;
  warning: string;
  warningMuted: string;
  overlay: string;
  shadow: string;
}

export const darkPalette: Palette = {
  background: "#111113",
  card: "#1C1C1F",
  cardAlt: "#26262A",
  accent: "#F0394B",
  accentText: "#FFFFFF",
  accentMuted: "rgba(240, 57, 75, 0.16)",
  text: "#F3F3F5",
  silver: "#D7D9DE",
  muted: "#A5A5AC",
  faint: "#75757D",
  border: "#2C2C31",
  divider: "#232327",
  success: "#3DDC91",
  successMuted: "rgba(61, 220, 145, 0.14)",
  error: "#FF6B6B",
  errorMuted: "rgba(255, 107, 107, 0.16)",
  warning: "#F5B84F",
  warningMuted: "rgba(245, 184, 79, 0.14)",
  overlay: "rgba(0, 0, 0, 0.64)",
  shadow: "rgba(0, 0, 0, 0.4)",
};

export const lightPalette: Palette = {
  background: "#F6F6F8",
  card: "#FFFFFF",
  cardAlt: "#F0F0F3",
  accent: "#D6293A",
  accentText: "#FFFFFF",
  accentMuted: "rgba(214, 41, 58, 0.09)",
  text: "#18181B",
  silver: "#4B4B52",
  muted: "#6C6C74",
  faint: "#9A9AA2",
  border: "#E6E6EA",
  divider: "#EDEDF0",
  success: "#0E9F6E",
  successMuted: "rgba(14, 159, 110, 0.10)",
  error: "#DC2626",
  errorMuted: "rgba(220, 38, 38, 0.10)",
  warning: "#C2760C",
  warningMuted: "rgba(194, 118, 12, 0.10)",
  overlay: "rgba(20, 20, 24, 0.45)",
  shadow: "rgba(20, 20, 24, 0.12)",
};
