import { createTheme, type MantineColorsTuple } from "@mantine/core";

/*
 * Mantine theme built from the brand tokens in tokens.css (§5a of the plan).
 * Every value here references a --bmp-* custom property — tokens.css is the
 * single source of truth for literal hex/px values, this file never repeats one.
 *
 * Mantine color scales need exactly 10 shades. Purple/orange define 8 brand
 * shades each (two darkest extrapolated); blue/green/yellow/red define only
 * 7 (50-600), so both the lightest and two darkest slots are extrapolated.
 * Extrapolated shades should not be used directly in designs — stick to the
 * WCAG-approved pairs.
 */

const bmpPurple: MantineColorsTuple = [
  "var(--bmp-purple-25)",
  "var(--bmp-purple-50)",
  "var(--bmp-purple-100)",
  "var(--bmp-purple-200)",
  "var(--bmp-purple-300)",
  "var(--bmp-purple-400)", // ★ primary action color
  "var(--bmp-purple-500)",
  "var(--bmp-purple-600)",
  "var(--bmp-purple-700)", // extrapolated
  "var(--bmp-purple-800)", // extrapolated
];

const bmpOrange: MantineColorsTuple = [
  "var(--bmp-orange-25)",
  "var(--bmp-orange-50)",
  "var(--bmp-orange-100)",
  "var(--bmp-orange-200)", // ★ prominent accent
  "var(--bmp-orange-300)",
  "var(--bmp-orange-400)",
  "var(--bmp-orange-500)",
  "var(--bmp-orange-600)",
  "var(--bmp-orange-700)", // extrapolated
  "var(--bmp-orange-800)", // extrapolated
];

const bmpGray: MantineColorsTuple = [
  "var(--bmp-gray-50)",
  "var(--bmp-gray-100)",
  "var(--bmp-gray-200)", // WCAG pairs doc value; brand reference has e5e5e7 — treat this as authoritative
  "var(--bmp-gray-300)",
  "var(--bmp-gray-400)",
  "var(--bmp-gray-500)",
  "var(--bmp-gray-600)",
  "var(--bmp-gray-700)",
  "var(--bmp-gray-800)",
  "var(--bmp-gray-900)",
];

// Supporting colors: brand values only define 7 shades (50-600) each,
// so both the lightest and the two darkest slots below are extrapolated.
const bmpBlue: MantineColorsTuple = [
  "var(--bmp-blue-25)", // extrapolated
  "var(--bmp-blue-50)",
  "var(--bmp-blue-100)",
  "var(--bmp-blue-200)",
  "var(--bmp-blue-300)",
  "var(--bmp-blue-400)",
  "var(--bmp-blue-500)",
  "var(--bmp-blue-600)",
  "var(--bmp-blue-700)", // extrapolated
  "var(--bmp-blue-800)", // extrapolated
];

const bmpGreen: MantineColorsTuple = [
  "var(--bmp-green-25)", // extrapolated
  "var(--bmp-green-50)",
  "var(--bmp-green-100)",
  "var(--bmp-green-200)",
  "var(--bmp-green-300)",
  "var(--bmp-green-400)",
  "var(--bmp-green-500)",
  "var(--bmp-green-600)",
  "var(--bmp-green-700)", // extrapolated
  "var(--bmp-green-800)", // extrapolated
];

const bmpYellow: MantineColorsTuple = [
  "var(--bmp-yellow-25)", // extrapolated
  "var(--bmp-yellow-50)",
  "var(--bmp-yellow-100)",
  "var(--bmp-yellow-200)",
  "var(--bmp-yellow-300)",
  "var(--bmp-yellow-400)",
  "var(--bmp-yellow-500)",
  "var(--bmp-yellow-600)",
  "var(--bmp-yellow-700)", // extrapolated
  "var(--bmp-yellow-800)", // extrapolated
];

const bmpRed: MantineColorsTuple = [
  "var(--bmp-red-25)", // extrapolated
  "var(--bmp-red-50)",
  "var(--bmp-red-100)",
  "var(--bmp-red-200)",
  "var(--bmp-red-300)",
  "var(--bmp-red-400)",
  "var(--bmp-red-500)",
  "var(--bmp-red-600)",
  "var(--bmp-red-700)", // extrapolated
  "var(--bmp-red-800)", // extrapolated
];

export const theme = createTheme({
  colors: {
    bmpPurple,
    bmpOrange,
    bmpBlue,
    bmpGreen,
    bmpYellow,
    bmpRed,
    gray: bmpGray,
  },
  primaryColor: "bmpPurple",
  primaryShade: 5, // Purple 400
  white: "var(--bmp-bg-page)",
  black: "var(--bmp-color-black)",

  fontFamily: "var(--bmp-font-body)",
  headings: {
    fontFamily: "var(--bmp-font-heading)",
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "var(--bmp-font-size-3xl)" },
      h2: { fontSize: "var(--bmp-font-size-2xl)" },
      h3: { fontSize: "var(--bmp-font-size-xl)" },
    },
  },
  fontSizes: {
    sm: "var(--bmp-font-size-sm)",
    md: "var(--bmp-font-size-base)",
    lg: "var(--bmp-font-size-lg)",
  },

  // From brand-values/theme.json settings.custom.unit.spacing (px values
  // preserved as-is; the brand scale happens to already line up with
  // Mantine's default xs–xl keys, so this pins it rather than changing it).
  spacing: {
    xxs: "var(--bmp-space-40)",
    xs: "var(--bmp-space-100)",
    sm: "var(--bmp-space-120)",
    md: "var(--bmp-space-160)",
    lg: "var(--bmp-space-200)",
    xl: "var(--bmp-space-320)",
    xxl: "var(--bmp-space-400)",
  },

  defaultRadius: 4, // brand buttons: 4px radius

  other: {
    textBody: "var(--bmp-text-body)",
    textTitle: "var(--bmp-text-title)",
    textSubheading: "var(--bmp-text-subheading)",
    textLink: "var(--bmp-text-link)",
    textLinkHover: "var(--bmp-text-link-hover)",
    bgPage: "var(--bmp-bg-page)",
    bgSurface: "var(--bmp-bg-surface)",
    borderColor: "var(--bmp-border-color)",
    fontWeightRegular: "var(--bmp-font-weight-regular)",
    fontWeightMedium: "var(--bmp-font-weight-medium)",
    fontWeightBold: "var(--bmp-font-weight-bold)",
    // Outside the 10-shade gray scale but used in WCAG-approved pairs
    gray25: "var(--bmp-gray-25)",
    gray950: "var(--bmp-gray-950)",
  },
});
