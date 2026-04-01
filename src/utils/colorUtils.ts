import { colorsNamed, converter, differenceEuclidean, formatHex, nearest, parse } from "culori";

import type { OklabColor } from "@/async/ai/schemas/image-analysis";
import type { ImgMetadataType } from "@/types/apiTypes";

/**
 * CSS color names → human-readable display names.
 * Culori uses lowercase single-word keys (e.g., "saddlebrown").
 */
const DISPLAY_NAMES: Record<string, string> = {
  aliceblue: "Alice Blue",
  antiquewhite: "Antique White",
  aqua: "Aqua",
  aquamarine: "Aquamarine",
  azure: "Azure",
  beige: "Beige",
  bisque: "Bisque",
  black: "Black",
  blanchedalmond: "Blanched Almond",
  blue: "Blue",
  blueviolet: "Blue Violet",
  brown: "Brown",
  burlywood: "Burlywood",
  cadetblue: "Cadet Blue",
  chartreuse: "Chartreuse",
  chocolate: "Chocolate",
  coral: "Coral",
  cornflowerblue: "Cornflower Blue",
  cornsilk: "Cornsilk",
  crimson: "Crimson",
  cyan: "Cyan",
  darkblue: "Dark Blue",
  darkcyan: "Dark Cyan",
  darkgoldenrod: "Dark Goldenrod",
  darkgray: "Dark Gray",
  darkgreen: "Dark Green",
  darkgrey: "Dark Gray",
  darkkhaki: "Dark Khaki",
  darkmagenta: "Dark Magenta",
  darkolivegreen: "Dark Olive Green",
  darkorange: "Dark Orange",
  darkorchid: "Dark Orchid",
  darkred: "Dark Red",
  darksalmon: "Dark Salmon",
  darkseagreen: "Dark Sea Green",
  darkslateblue: "Dark Slate Blue",
  darkslategray: "Dark Slate Gray",
  darkslategrey: "Dark Slate Gray",
  darkturquoise: "Dark Turquoise",
  darkviolet: "Dark Violet",
  deeppink: "Deep Pink",
  deepskyblue: "Deep Sky Blue",
  dimgray: "Dim Gray",
  dimgrey: "Dim Gray",
  dodgerblue: "Dodger Blue",
  firebrick: "Firebrick",
  floralwhite: "Floral White",
  forestgreen: "Forest Green",
  fuchsia: "Fuchsia",
  gainsboro: "Gainsboro",
  ghostwhite: "Ghost White",
  gold: "Gold",
  goldenrod: "Goldenrod",
  gray: "Gray",
  green: "Green",
  grey: "Gray",
  greenyellow: "Green Yellow",
  honeydew: "Honeydew",
  hotpink: "Hot Pink",
  indianred: "Indian Red",
  indigo: "Indigo",
  ivory: "Ivory",
  khaki: "Khaki",
  lavender: "Lavender",
  lavenderblush: "Lavender Blush",
  lawngreen: "Lawn Green",
  lemonchiffon: "Lemon Chiffon",
  lightblue: "Light Blue",
  lightcoral: "Light Coral",
  lightcyan: "Light Cyan",
  lightgoldenrodyellow: "Light Goldenrod Yellow",
  lightgray: "Light Gray",
  lightgreen: "Light Green",
  lightgrey: "Light Gray",
  lightpink: "Light Pink",
  lightsalmon: "Light Salmon",
  lightseagreen: "Light Sea Green",
  lightskyblue: "Light Sky Blue",
  lightslategray: "Light Slate Gray",
  lightslategrey: "Light Slate Gray",
  lightsteelblue: "Light Steel Blue",
  lightyellow: "Light Yellow",
  lime: "Lime",
  limegreen: "Lime Green",
  linen: "Linen",
  magenta: "Magenta",
  maroon: "Maroon",
  mediumaquamarine: "Medium Aquamarine",
  mediumblue: "Medium Blue",
  mediumorchid: "Medium Orchid",
  mediumpurple: "Medium Purple",
  mediumseagreen: "Medium Sea Green",
  mediumslateblue: "Medium Slate Blue",
  mediumspringgreen: "Medium Spring Green",
  mediumturquoise: "Medium Turquoise",
  mediumvioletred: "Medium Violet Red",
  midnightblue: "Midnight Blue",
  mintcream: "Mint Cream",
  mistyrose: "Misty Rose",
  moccasin: "Moccasin",
  navajowhite: "Navajo White",
  navy: "Navy",
  oldlace: "Old Lace",
  olive: "Olive",
  olivedrab: "Olive Drab",
  orange: "Orange",
  orangered: "Orange Red",
  orchid: "Orchid",
  palegoldenrod: "Pale Goldenrod",
  palegreen: "Pale Green",
  paleturquoise: "Pale Turquoise",
  palevioletred: "Pale Violet Red",
  papayawhip: "Papaya Whip",
  peachpuff: "Peach Puff",
  peru: "Peru",
  pink: "Pink",
  plum: "Plum",
  powderblue: "Powder Blue",
  purple: "Purple",
  rebeccapurple: "Rebecca Purple",
  red: "Red",
  rosybrown: "Rosy Brown",
  royalblue: "Royal Blue",
  saddlebrown: "Saddle Brown",
  salmon: "Salmon",
  sandybrown: "Sandy Brown",
  seagreen: "Sea Green",
  seashell: "Seashell",
  sienna: "Sienna",
  silver: "Silver",
  skyblue: "Sky Blue",
  slateblue: "Slate Blue",
  slategray: "Slate Gray",
  slategrey: "Slate Gray",
  snow: "Snow",
  springgreen: "Spring Green",
  steelblue: "Steel Blue",
  tan: "Tan",
  teal: "Teal",
  thistle: "Thistle",
  tomato: "Tomato",
  turquoise: "Turquoise",
  violet: "Violet",
  wheat: "Wheat",
  white: "White",
  whitesmoke: "White Smoke",
  yellow: "Yellow",
  yellowgreen: "Yellow Green",
};

/**
 * colorsNamed values are numeric RGB integers (e.g. 0xf0f8ff).
 * Convert each to a hex string so culori can parse it for comparison.
 */
const cssColorEntries: [string, string][] = Object.entries(colorsNamed).map(([name, value]) => [
  name,
  `#${value.toString(16).padStart(6, "0")}`,
]);

const findNearestCssColor = nearest(cssColorEntries, differenceEuclidean(), ([, hex]) => hex);

export function getColorName(hex: string): string {
  const results = findNearestCssColor(hex, 1);
  if (results.length === 0) {
    return hex;
  }
  const [[cssName]] = results;
  return DISPLAY_NAMES[cssName] ?? cssName;
}

/**
 * Parse a search term as a color and return OKLAB values.
 * Accepts CSS color names ("brown") and hex values ("#8B4513").
 */
export function parseSearchColor(term: string): OklabColor | null {
  const trimmed = term.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const parsed = parse(trimmed);
  if (!parsed) {
    return null;
  }

  const toOklab = converter("oklab");
  const oklab = toOklab(parsed);
  if (!oklab) {
    return null;
  }

  return { a: oklab.a ?? 0, b: oklab.b ?? 0, l: oklab.l ?? 0 };
}

function oklabToHex(color: OklabColor): string {
  return formatHex(`oklab(${color.l} ${color.a} ${color.b})`) ?? "#000000";
}

/**
 * Extract color hex strings from bookmark image_keywords for display.
 * Converts stored OKLAB values to hex. Returns primary color first, then secondary colors.
 */
export function getBookmarkColors(imageKeywords: ImgMetadataType["image_keywords"]): string[] {
  try {
    if (!imageKeywords || Array.isArray(imageKeywords) || !("color" in imageKeywords)) {
      return [];
    }
    const { color } = imageKeywords;
    if (!color || typeof color === "string") {
      return [];
    }
    const hexes: string[] = [];
    if (color.primary_color) {
      hexes.push(oklabToHex(color.primary_color));
    }
    for (const c of color.secondary_colors ?? []) {
      hexes.push(oklabToHex(c));
    }
    return hexes;
  } catch {
    return [];
  }
}
