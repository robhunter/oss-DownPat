/**
 * Theme Generator Utility
 *
 * Generates CSS custom properties from a small set of brand colors.
 * Uses HSL color manipulation to create a full palette.
 */

export interface ThemeColors {
  /** Primary brand color (e.g., "#3b82f6") */
  primary: string;
  /** Secondary/accent color (optional, defaults to primary with hue shift) */
  secondary?: string;
  /** Success/positive color (optional, defaults to green) */
  success?: string;
  /** Danger/error color (optional, defaults to red) */
  danger?: string;
  /** Neutral/gray base (optional, defaults to slate gray) */
  neutral?: string;
}

export interface ThemeOptions {
  /** Whether to generate dark mode variables */
  includeDarkMode?: boolean;
  /** CSS selector for dark mode (default: '[data-theme="dark"]') */
  darkModeSelector?: string;
  /** Prefix for CSS variable names (default: 'downpat') */
  prefix?: string;
}

export interface GeneratedTheme {
  /** CSS string with all variable definitions */
  css: string;
  /** Object containing all generated CSS variables */
  variables: Record<string, string>;
  /** Object containing dark mode CSS variables */
  darkVariables?: Record<string, string>;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Parse a hex color to HSL components
 */
function hexToHsl(hex: string): HSL {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s, l };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const hue = h / 360;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }

  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a palette of 10 shades from a base color
 */
function generatePalette(baseHex: string): string[] {
  const base = hexToHsl(baseHex);

  // Generate shades from light (50) to dark (950)
  const lightnesses = [0.97, 0.93, 0.89, 0.79, 0.65, 0.5, 0.41, 0.33, 0.25, 0.15];

  return lightnesses.map((l) => {
    // Adjust saturation based on lightness
    const saturation = base.s * (l > 0.5 ? 0.8 + (1 - l) * 0.4 : 0.8 + l * 0.4);
    return hslToHex({ h: base.h, s: Math.min(saturation, 1), l });
  });
}

/**
 * Generate dark mode variant of a palette
 */
function generateDarkPalette(baseHex: string): string[] {
  const palette = generatePalette(baseHex);
  // Invert the palette for dark mode
  return palette.slice().reverse();
}

/**
 * Get default color if not provided
 */
function getDefaultColor(type: 'secondary' | 'success' | 'danger' | 'neutral', primaryHex: string): string {
  const primary = hexToHsl(primaryHex);

  switch (type) {
    case 'secondary':
      // Shift hue by 30 degrees
      return hslToHex({ ...primary, h: (primary.h + 30) % 360 });
    case 'success':
      return '#10b981'; // Tailwind emerald-500
    case 'danger':
      return '#ef4444'; // Tailwind red-500
    case 'neutral':
      return '#64748b'; // Tailwind slate-500
  }
}

/**
 * Generate a complete CSS theme from input colors
 */
export function generateTheme(
  colors: ThemeColors,
  options: ThemeOptions = {}
): GeneratedTheme {
  const {
    includeDarkMode = true,
    darkModeSelector = '[data-theme="dark"]',
    prefix = 'downpat',
  } = options;

  const variables: Record<string, string> = {};
  const darkVariables: Record<string, string> = {};

  // Primary color
  const primaryPalette = generatePalette(colors.primary);
  const shadeNames = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  shadeNames.forEach((shade, i) => {
    variables[`--${prefix}-primary-${shade}`] = primaryPalette[i];
  });

  // Secondary color
  const secondary = colors.secondary || getDefaultColor('secondary', colors.primary);
  const secondaryPalette = generatePalette(secondary);
  shadeNames.forEach((shade, i) => {
    variables[`--${prefix}-secondary-${shade}`] = secondaryPalette[i];
  });

  // Success color
  const success = colors.success || getDefaultColor('success', colors.primary);
  const successPalette = generatePalette(success);
  shadeNames.forEach((shade, i) => {
    variables[`--${prefix}-success-${shade}`] = successPalette[i];
  });

  // Danger color
  const danger = colors.danger || getDefaultColor('danger', colors.primary);
  const dangerPalette = generatePalette(danger);
  shadeNames.forEach((shade, i) => {
    variables[`--${prefix}-danger-${shade}`] = dangerPalette[i];
  });

  // Neutral color
  const neutral = colors.neutral || getDefaultColor('neutral', colors.primary);
  const neutralPalette = generatePalette(neutral);
  shadeNames.forEach((shade, i) => {
    variables[`--${prefix}-neutral-${shade}`] = neutralPalette[i];
  });

  // Semantic colors
  variables[`--${prefix}-background`] = '#ffffff';
  variables[`--${prefix}-foreground`] = neutralPalette[8]; // neutral-800
  variables[`--${prefix}-muted`] = neutralPalette[1]; // neutral-100
  variables[`--${prefix}-muted-foreground`] = neutralPalette[5]; // neutral-500
  variables[`--${prefix}-border`] = neutralPalette[2]; // neutral-200
  variables[`--${prefix}-ring`] = primaryPalette[4]; // primary-400

  // Message type colors
  variables[`--${prefix}-user-bg`] = primaryPalette[0]; // primary-50
  variables[`--${prefix}-conversation-bg`] = neutralPalette[0]; // neutral-50
  variables[`--${prefix}-commentary-bg`] = '#fef3c7'; // amber-100
  variables[`--${prefix}-summary-bg`] = successPalette[1]; // success-100
  variables[`--${prefix}-moderation-bg`] = dangerPalette[1]; // danger-100

  // Generate dark mode variables
  if (includeDarkMode) {
    const darkPrimaryPalette = generateDarkPalette(colors.primary);
    shadeNames.forEach((shade, i) => {
      darkVariables[`--${prefix}-primary-${shade}`] = darkPrimaryPalette[i];
    });

    const darkSecondaryPalette = generateDarkPalette(secondary);
    shadeNames.forEach((shade, i) => {
      darkVariables[`--${prefix}-secondary-${shade}`] = darkSecondaryPalette[i];
    });

    const darkSuccessPalette = generateDarkPalette(success);
    shadeNames.forEach((shade, i) => {
      darkVariables[`--${prefix}-success-${shade}`] = darkSuccessPalette[i];
    });

    const darkDangerPalette = generateDarkPalette(danger);
    shadeNames.forEach((shade, i) => {
      darkVariables[`--${prefix}-danger-${shade}`] = darkDangerPalette[i];
    });

    const darkNeutralPalette = generateDarkPalette(neutral);
    shadeNames.forEach((shade, i) => {
      darkVariables[`--${prefix}-neutral-${shade}`] = darkNeutralPalette[i];
    });

    // Dark mode semantic colors
    darkVariables[`--${prefix}-background`] = neutralPalette[8]; // neutral-800
    darkVariables[`--${prefix}-foreground`] = neutralPalette[0]; // neutral-50
    darkVariables[`--${prefix}-muted`] = neutralPalette[7]; // neutral-700
    darkVariables[`--${prefix}-muted-foreground`] = neutralPalette[3]; // neutral-300
    darkVariables[`--${prefix}-border`] = neutralPalette[6]; // neutral-600
    darkVariables[`--${prefix}-ring`] = primaryPalette[5]; // primary-500

    // Dark mode message type colors
    darkVariables[`--${prefix}-user-bg`] = primaryPalette[8]; // primary-800
    darkVariables[`--${prefix}-conversation-bg`] = neutralPalette[7]; // neutral-700
    darkVariables[`--${prefix}-commentary-bg`] = '#92400e'; // amber-700
    darkVariables[`--${prefix}-summary-bg`] = successPalette[7]; // success-700
    darkVariables[`--${prefix}-moderation-bg`] = dangerPalette[7]; // danger-700
  }

  // Generate CSS
  const formatVariables = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

  let css = `:root {\n${formatVariables(variables)}\n}`;

  if (includeDarkMode) {
    css += `\n\n${darkModeSelector} {\n${formatVariables(darkVariables)}\n}`;
  }

  return {
    css,
    variables,
    darkVariables: includeDarkMode ? darkVariables : undefined,
  };
}

/**
 * Apply theme to the document by injecting a style element
 */
export function applyTheme(theme: GeneratedTheme): void {
  if (typeof document === 'undefined') {
    throw new Error('applyTheme can only be called in a browser environment');
  }

  // Remove existing theme style if present
  const existingStyle = document.getElementById('downpat-theme');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create and append new style element
  const style = document.createElement('style');
  style.id = 'downpat-theme';
  style.textContent = theme.css;
  document.head.appendChild(style);
}
