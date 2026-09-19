// A small, disciplined type scale. Every screen should pull from here
// instead of inventing one-off font sizes.
export const typography = {
  display: { fontSize: 28, fontWeight: "800" as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: "700" as const, lineHeight: 23 },
  subheading: { fontSize: 15, fontWeight: "600" as const, lineHeight: 20 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: "500" as const, lineHeight: 17 },
  micro: {
    fontSize: 11,
    fontWeight: "700" as const,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
};

export type TypographyVariant = keyof typeof typography;
