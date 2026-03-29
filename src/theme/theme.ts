/**
 * ══════════════════════════════════════════════════════════════
 * PROJECT CURRENT — Master Theme
 * Single source of truth for all colors, typography, shadows,
 * and spacing. NEVER hardcode values in component files.
 * ══════════════════════════════════════════════════════════════
 */

// ─── Canvas Colors ───────────────────────────────────────────
export const Colors = {
  // Canvas backgrounds
  lightCanvas: '#F9F8F1',     // Warm Off-White
  darkCanvas: '#2D3135',      // Soft Charcoal
  darkFill: '#222528',        // Dark Indent Fill (slightly darker than darkCanvas)

  // Text
  textPrimaryLight: '#2D3135',   // Primary text on light backgrounds
  textPrimaryDark: '#F9F8F1',    // Primary text on dark backgrounds
  textSecondary: '#A9B4C2',      // Overcast Slate — secondary/muted text

  // Mood Spectrum — "Sunset-to-Dusk"
  mood5: '#EC4724',  // Great — Clear Skies — Vibrant Terra Cotta
  mood4: '#F37F21',  // Good — Steady Winds — Soft Orange
  mood3: '#d7d5b2',  // Average — Calm Waters — Muted Sand
  mood2: '#A9B4C2',  // Below Avg — Overcast — Overcast Slate
  mood1: '#5C6B73',  // Bad — Heavy Weather — Deep Twilight

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Mood score → color mapping
export const MoodColors: Record<number, string> = {
  5: Colors.mood5,
  4: Colors.mood4,
  3: Colors.mood3,
  2: Colors.mood2,
  1: Colors.mood1,
};

// Mood score → nautical label
export const MoodLabels: Record<number, { title: string; subtitle: string }> = {
  5: { title: 'Clear Skies', subtitle: 'Warmth and Energy' },
  4: { title: 'Steady Winds', subtitle: 'Gentle and Pleasant' },
  3: { title: 'Calm Waters', subtitle: 'Grounded and Peaceful' },
  2: { title: 'Overcast', subtitle: 'Cloudy and Unthreatening' },
  1: { title: 'Heavy Weather', subtitle: 'Storm and Chaos' },
};

// Mood score → confirmation copy
export const MoodConfirmations: Record<number, string> = {
  5: 'Smooth sailing ahead, Captain.',
  4: 'A steady breeze to carry you forward.',
  3: 'Sometimes, quiet waters are all we need.',
  2: 'Keep a steady hand on the wheel.',
  1: 'Remember, even storms pass.',
};

// ─── Typography ──────────────────────────────────────────────
export const Typography = {
  // Font families (loaded via @expo-google-fonts)
  serif: {
    regular: 'Lora_400Regular',
    italic: 'Lora_400Regular_Italic',
    medium: 'Lora_500Medium',
    mediumItalic: 'Lora_500Medium_Italic',
    semiBold: 'Lora_600SemiBold',
    semiBoldItalic: 'Lora_600SemiBold_Italic',
    bold: 'Lora_700Bold',
    boldItalic: 'Lora_700Bold_Italic',
  },
  sans: {
    extraLight: 'Nunito_200ExtraLight',
    light: 'Nunito_300Light',
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
    black: 'Nunito_900Black',
  },

  // Preset text styles (use these in components)
  heading: {
    fontFamily: 'Lora_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimaryLight,
  },
  headingDark: {
    fontFamily: 'Lora_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimaryDark,
  },
  subheading: {
    fontFamily: 'Lora_500Medium',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.textPrimaryLight,
  },
  quote: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    lineHeight: 26,
    color: Colors.textPrimaryLight,
  },
  quoteDark: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    lineHeight: 26,
    color: Colors.textPrimaryDark,
  },
  body: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimaryLight,
  },
  bodyDark: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimaryDark,
  },
  bodySmall: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: Colors.textSecondary,
  },
  button: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 1.5,
    color: Colors.lightCanvas,
  },
  caption: {
    fontFamily: 'Nunito_300Light',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
} as const;

// ─── Shadows — "Indented Paper" Neumorphism ─────────────────
// These are the inner-shadow specifications for the pressed-in effect.
// React Native doesn't natively support inner shadows, so these values
// are used with @shopify/react-native-skia or custom shadow components.

export const Shadows = {
  /**
   * Light Canvas Indent
   * Used on the warm off-white (#F9F8F1) background.
   * Creates the illusion of an element pressed into paper.
   */
  lightIndent: {
    topLeft: {
      offsetX: 4,
      offsetY: 4,
      blur: 8,
      color: Colors.black,
      opacity: 0.06, // 5–8% — use 6% as default
    },
    bottomRight: {
      offsetX: -4,
      offsetY: -4,
      blur: 8,
      color: Colors.white,
      opacity: 0.9, // 80–100% — use 90% as default
    },
    outerShadow: null, // STRICTLY ZERO
  },

  /**
   * Dark Canvas Indent (Captain's Cabin)
   * Used on the dark charcoal (#2D3135) background.
   * Subtle rim light on bottom-right edge.
   */
  darkIndent: {
    topLeft: {
      offsetX: 4,
      offsetY: 4,
      blur: 8,
      color: Colors.black,
      opacity: 0.4, // 40%
    },
    bottomRight: {
      offsetX: -4,
      offsetY: -4,
      blur: 8,
      color: Colors.white,
      opacity: 0.1, // 10% — subtle rim light
    },
    outerShadow: null, // STRICTLY ZERO
  },

  /**
   * Approximate inner shadow for non-Skia contexts (simple containers).
   * For true neumorphism, always prefer Skia-rendered shadows.
   * Uses boxShadow for React Native Web compatibility.
   */
  lightIndentApprox: {
    boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(255,255,255,0.9)',
  } as any,
  darkIndentApprox: {
    boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.4), inset -4px -4px 8px rgba(255,255,255,0.1)',
  } as any,
} as const;

// ─── Spacing (8pt grid) ─────────────────────────────────────
export const Spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ─── Border Radius ──────────────────────────────────────────
// NO 90-degree corners. All indented elements use rounded corners.
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
  circle: 9999,
} as const;

// ─── Animation Durations ────────────────────────────────────
export const Durations = {
  fast: 150,
  normal: 300,
  slow: 500,
  xslow: 800,
} as const;
