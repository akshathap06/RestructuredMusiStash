// "Paper Mobile" design system (canvas 1a). Dark-first, flat (no gradients/glow),
// Manrope, one accent event per screen. Every legacy key below is kept as an
// alias onto the new blue ramp so pre-redesign screens still compile/run.
const ACCENT = '#4B9CD3';        // Carolina blue — money, progress, THE primary action
const ACCENT_SOFT = '#8ECDF0';   // gains / positive deltas (blue, not green)
const ACCENT_DEEP = '#357FB0';   // pressed
const INK_ON_ACCENT = '#0A0A0C'; // ink on accent — never white (6.6:1)

export const MusiStashTheme = {
  colors: {
    // --- Paper tokens -----------------------------------------------------
    background: '#0A0A0C',
    surface: '#15151A',
    surfaceElevated: '#1D1D24',
    line: '#26262D',             // card / control borders
    listDivider: '#1A1A20',      // hairline between list rows
    borderSubtle: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',
    textPrimary: '#F4F4F6',
    textSecondary: '#C9C6D4',
    textMuted: '#9B9BA4',
    textFaint: '#6A6A74',        // eyebrows, meta
    accentPressed: ACCENT_DEEP,
    accentSoft: 'rgba(75,156,211,0.14)', // tint fill (kept as an rgba for existing call sites)
    accentTint: 'rgba(75,156,211,0.14)',
    accentSolid: ACCENT_SOFT,    // solid light-blue for +deltas / gain text
    onAccent: INK_ON_ACCENT,
    positive: ACCENT_SOFT,       // design uses blue for positive, not green
    negative: '#FF6A5E',
    overlay: 'rgba(0,0,0,0.62)',
    divider: 'rgba(255,255,255,0.08)',
    progressTrack: '#26262D',

    // --- Core brand ----------------------------------------------------
    foreground: '#F4F4F6',
    card: '#15151A',
    cardForeground: '#F4F4F6',

    primary: '#F4F4F6',         // white primary (e.g. Follow button)
    primaryForeground: '#0A0A0C',

    secondary: '#26262D',
    secondaryForeground: '#F4F4F6',

    muted: '#26262D',
    mutedForeground: '#9B9BA4',

    // Accent (Paper blue)
    accent: ACCENT,
    accentLight: ACCENT_SOFT,
    accentDark: ACCENT_DEEP,
    accentForeground: INK_ON_ACCENT,

    // Success/Payment — remapped to accent (payment UI was removed)
    success: ACCENT,
    payment: ACCENT,

    // Destructive
    destructive: '#FF6A5E',
    destructiveForeground: '#FF6A5E',

    // Border colors
    border: '#26262D',
    borderLight: '#33333D',
    input: '#26262D',
    inputBackground: '#15151A',

    // Ring/Focus
    ring: ACCENT,

    // Gradients (keys retained; all flattened to the accent — no gradients)
    gradientBlue: ACCENT,
    gradientBlueLight: ACCENT_SOFT,
    gradientBlueDark: ACCENT_DEEP,
    gradientViolet: ACCENT,
    gradientVioletLight: ACCENT_SOFT,
    gradientVioletDark: ACCENT_DEEP,

    // Grays
    gray100: '#F4F4F6',
    gray200: '#D5D4DA',
    gray300: '#A9A8B0',
    gray400: '#9B9BA4',
    gray500: '#6A6A74',
    gray600: '#4E4E58',
    gray700: '#33333D',
    gray800: '#26262D',
    gray900: '#15151A',

    // Chart colors (blue scale)
    chart1: ACCENT,
    chart2: ACCENT_SOFT,
    chart3: ACCENT_DEEP,
    chart4: '#B9E2F6',
    chart5: '#2A6B96',

    // Special
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',

    // Legacy brand aliases → blue
    blue500: ACCENT,
    blue400: ACCENT_SOFT,
    blue600: ACCENT_DEEP,
    purple500: ACCENT,
    purple400: ACCENT_SOFT,
  },
  
  // Manrope family names as loaded by @expo-google-fonts/manrope.
  // When a custom font is loaded, iOS ignores fontWeight, so the weight lives in
  // the family. fontWeight is kept for Android / system-font fallback.
  fonts: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },

  // Typography scale — "Paper Mobile" (canvas 1a handoff notes)
  typography: {
    // Display 46/800/−.045em — big screen headline (Explore, Portfolio value)
    display: {
      fontFamily: 'Manrope_800ExtraBold',
      fontSize: 46,
      fontWeight: '800' as const,
      letterSpacing: -2,
      lineHeight: 46,
    },
    // Oversized tabular money readout
    money: {
      fontFamily: 'Manrope_800ExtraBold',
      fontSize: 42,
      fontWeight: '800' as const,
      letterSpacing: -1.6,
      lineHeight: 44,
    },
    // Legacy scale kept at original sizes (many pre-redesign screens read these);
    // only fontFamily is added. Redesigned screens use `display` / `money` /
    // `eyebrow` above or explicit inline styles.
    h1: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 48,
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 48,
    },
    h2: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 36,
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 40,
    },
    h3: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 24,
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 32,
    },
    h4: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 20,
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 28,
    },

    // Body text
    body: {
      fontFamily: 'Manrope_400Regular',
      fontSize: 16,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 24,
    },
    bodySmall: {
      fontFamily: 'Manrope_400Regular',
      fontSize: 14,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 20,
    },
    bodyXSmall: {
      fontFamily: 'Manrope_400Regular',
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 16,
    },

    // UI text
    button: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 16,
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 24,
    },
    caption: {
      fontFamily: 'Manrope_400Regular',
      fontSize: 12,
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 16,
    },
    label: {
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 14,
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 20,
    },
    // Eyebrow — 10–11/700/.16em caps
    eyebrow: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1.6,
      lineHeight: 14,
    },
  },
  
  // Spacing scale - From Figma (4px base unit = --spacing)
  spacing: {
    0: 0,
    1: 4,          // calc(var(--spacing) * 1)
    2: 8,          // calc(var(--spacing) * 2)
    3: 12,         // calc(var(--spacing) * 3)
    4: 16,         // calc(var(--spacing) * 4)
    5: 20,         // calc(var(--spacing) * 5)
    6: 24,         // calc(var(--spacing) * 6)
    8: 32,         // calc(var(--spacing) * 8)
    10: 40,        // calc(var(--spacing) * 10)
    12: 48,        // calc(var(--spacing) * 12)
    14: 56,        // calc(var(--spacing) * 14)
    16: 64,        // calc(var(--spacing) * 16)
    20: 80,        // calc(var(--spacing) * 20)
    24: 96,        // calc(var(--spacing) * 24)
  },
  
  // Border radius scale — "Paper Mobile": cards 14–18, sheets 24, pills 999
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 14,
    card: 14,
    xl: 16,
    xxl: 20,
    sheet: 24,
    full: 9999,
  },
  
  // Shadow definitions
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
      elevation: 16,
    },
  },
  
  // Component-specific styles - From Figma Design
  components: {
    // Button variants (from Figma components)
    button: {
      primary: {
        backgroundColor: '#FFFFFF',  // Pure white button (landing page auth buttons)
        borderColor: '#FFFFFF',
        textColor: '#000000',
        height: 56,                  // h-14 in Figma
        borderRadius: 14,            // rounded-xl (full in some cases)
      },
      secondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // bg-white/5 in Figma
        borderColor: '#454648',      // border-gray-700
        textColor: '#FCFCFD',
        height: 56,
        borderRadius: 14,
      },
      accent: {
        backgroundColor: '#4B9CD3', // Paper blue
        gradientColors: ['#4B9CD3', '#4B9CD3'], // flat — no gradients
        borderColor: 'transparent',
        textColor: '#0A0A0C',       // ink on accent, never white
        height: 54,
        borderRadius: 16,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#F4F4F6',
        height: 54,
        borderRadius: 16,
      },
    },

    // Card styles
    card: {
      backgroundColor: '#15151A',
      borderColor: '#26262D',
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },

    // Input styles
    input: {
      backgroundColor: '#15151A',
      borderColor: '#4B9CD3',         // accent border when active
      borderColorIdle: '#26262D',
      borderColorFocus: '#4B9CD3',
      borderWidth: 1,
      textColor: '#F4F4F6',
      placeholderColor: '#6A6A74',
      height: 50,
      borderRadius: 12,
      fontSize: 15,
    },

    // Navigation styles
    navigation: {
      backgroundColor: '#0C0C0F',
      borderColor: '#1C1C22',
      activeColor: '#8ECDF0',
      inactiveColor: '#6A6A74',
      textColor: '#F4F4F6',
    },

    // Progress bar
    progress: {
      backgroundColor: '#26262D',
      fillColor: '#4B9CD3',
      gradientColors: ['#4B9CD3', '#4B9CD3'], // flat
      height: 6,
    },

    // Input OTP (verification code inputs)
    inputOTP: {
      slotWidth: 56,
      slotHeight: 56,
      borderColor: '#4B9CD3',
      borderColorInactive: '#26262D',
      borderWidth: 1,
      borderRadius: 12,
      fontSize: 22,
      textColor: '#F4F4F6',
    },
  },
};

// Kept for LinearGradient call sites — every pair is now flat (design: no
// gradients). Passing these to <LinearGradient> renders a solid fill.
export const MusiStashGradients = {
  landing: ['#4B9CD3', '#4B9CD3', '#4B9CD3'] as const,
  progress: ['#4B9CD3', '#4B9CD3'] as const,
  buttonPrimary: ['#4B9CD3', '#4B9CD3'] as const,
  buttonArtist: ['#4B9CD3', '#4B9CD3'] as const,
  buttonService: ['#4B9CD3', '#4B9CD3'] as const,
  accent: ['#4B9CD3', '#4B9CD3'] as const,
  payment: ['#4B9CD3', '#4B9CD3'] as const,
  profileBorder: ['#4B9CD3', '#8ECDF0', '#4B9CD3'] as const,
  dark: ['#0A0A0C', '#0A0A0C'] as const,
  darkSubtle: ['#0A0A0C', '#15151A'] as const,

  // Overlay gradients
  overlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'] as const,
  overlayStrong: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)'] as const,
  
  // Brand gradients (keys retained for compat; flattened to blue)
  blue: ['#4B9CD3', '#4B9CD3'] as const,
  blueDark: ['#357FB0', '#4B9CD3'] as const,
  violet: ['#4B9CD3', '#4B9CD3'] as const,
  violetDark: ['#357FB0', '#4B9CD3'] as const,
};

/** Manrope family name for a numeric weight (for inline styles). */
export const font = (
  weight: 400 | 500 | 600 | 700 | 800 = 400,
): string =>
  ({
    400: 'Manrope_400Regular',
    500: 'Manrope_500Medium',
    600: 'Manrope_600SemiBold',
    700: 'Manrope_700Bold',
    800: 'Manrope_800ExtraBold',
  }[weight]);

// Helper function to create consistent styles - Updated for Figma Design
export const createMusiStashStyles = (theme = MusiStashTheme) => ({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing[6], // 24px
  },
  
  // Text styles
  title: {
    ...theme.typography.h2,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.h3,
    color: theme.colors.mutedForeground,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  bodySmall: {
    ...theme.typography.bodySmall,
    color: theme.colors.mutedForeground,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.gray500,
  },
  
  // Heading styles
  h1: {
    ...theme.typography.h1,
    color: theme.colors.foreground,
  },
  h2: {
    ...theme.typography.h2,
    color: theme.colors.foreground,
  },
  h3: {
    ...theme.typography.h3,
    color: theme.colors.foreground,
  },
  
  // Button styles
  primaryButton: {
    ...theme.components.button.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
  },
  primaryButtonText: {
    ...theme.typography.button,
    color: theme.components.button.primary.textColor,
  },
  
  accentButton: {
    ...theme.components.button.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
  },
  accentButtonText: {
    ...theme.typography.button,
    color: theme.components.button.accent.textColor,
  },
  
  secondaryButton: {
    ...theme.components.button.secondary,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[6],
  },
  secondaryButtonText: {
    ...theme.typography.button,
    color: theme.components.button.secondary.textColor,
  },
  
  // Card styles
  card: {
    ...theme.components.card,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    borderWidth: 1,
  },
  
  // Input styles
  input: {
    backgroundColor: theme.components.input.backgroundColor,
    borderColor: theme.components.input.borderColorIdle,
    borderWidth: theme.components.input.borderWidth,
    borderRadius: theme.components.input.borderRadius,
    height: theme.components.input.height,
    paddingHorizontal: theme.spacing[4],
    color: theme.components.input.textColor,
    fontSize: theme.components.input.fontSize,
  },
  inputFocused: {
    borderColor: theme.components.input.borderColor,
  },
  inputPlaceholder: {
    color: theme.components.input.placeholderColor,
  },
});

export default MusiStashTheme;
