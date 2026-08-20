// V2 Design Direction A — premium dark violet
// MusiStash Brand Theme Configuration - Adapted from Figma Design
export const MusiStashTheme = {
  colors: {
    // Experience screens (artist profile / project detail)
    background: '#080A0D',
    surface: '#101318',
    surfaceElevated: '#151920',
    borderSubtle: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.16)',
    textPrimary: '#F5F3EF',
    textSecondary: '#AAA8AE',
    textMuted: '#73717A',
    accentPressed: '#7847E8',
    accentSoft: 'rgba(139,92,246,0.15)',
    positive: '#62D892',
    overlay: 'rgba(0,0,0,0.44)',
    divider: 'rgba(255,255,255,0.08)',
    progressTrack: 'rgba(255,255,255,0.12)',

    // Core brand colors - From Figma Dark Theme
    foreground: '#FCFCFD',     // oklch(.985 0 0) - Almost white text
    card: '#101318',           // surface
    cardForeground: '#F5F3EF',
    
    // Primary colors
    primary: '#FCFCFD',        // White primary (oklch(.985 0 0))
    primaryForeground: '#353638', // Dark text on primary (oklch(.205 0 0))
    
    // Secondary colors
    secondary: '#454648',      // oklch(.269 0 0) - Dark gray
    secondaryForeground: '#FCFCFD', // White text on secondary
    
    // Muted colors
    muted: '#454648',          // oklch(.269 0 0)
    mutedForeground: '#B5B5BA', // oklch(.708 0 0) - Medium gray
    
    // Accent colors (MusiStash Violet)
    accent: '#8B5CF6',         // Violet-500 for primary actions
    accentLight: '#A78BFA',    // Violet-400 for highlights
    accentDark: '#7C3AED',     // Violet-600 for hover states
    accentForeground: '#FCFCFD', // White text on accent
    
    // Success/Payment color (Green - only for payment-related UI)
    success: '#10B981',        // Emerald-500 for success/payment states
    payment: '#10B981',        // Emerald-500 for payment-related UI
    
    // Destructive colors
    destructive: '#DC2626',    // Red for errors
    destructiveForeground: '#F87171', // Lighter red for text
    
    // Border colors
    border: '#454648',         // oklch(.269 0 0) - Dark border
    borderLight: '#6B7280',    // Slightly lighter for focus
    input: '#454648',          // Input border color
    inputBackground: '#1F2937', // Input background
    
    // Ring/Focus colors
    ring: '#71717A',           // oklch(.439 0 0) - Focus ring
    
    // Gradients (keys retained; values are violet brand equivalents)
    gradientBlue: '#8B5CF6',      // Violet-500 (primary brand)
    gradientBlueLight: '#A78BFA', // Violet-400
    gradientBlueDark: '#7C3AED',  // Violet-600
    gradientViolet: '#8B5CF6',
    gradientVioletLight: '#A78BFA',
    gradientVioletDark: '#7C3AED',
    
    // Grays from Figma palette
    gray100: '#F7F7F8',        // Very light gray
    gray200: '#EBEBED',        // Light gray
    gray300: '#DCDCE0',        // Medium light gray
    gray400: '#B5B5BA',        // Medium gray
    gray500: '#8C8C93',        // Dark gray
    gray600: '#717178',        // Darker gray
    gray700: '#5F5F66',        // Very dark gray
    gray800: '#474750',        // Almost black
    gray900: '#353638',        // Near black
    
    // Chart colors (violet scale)
    chart1: '#8B5CF6',         // Violet-500
    chart2: '#A78BFA',         // Violet-400
    chart3: '#7C3AED',         // Violet-600
    chart4: '#C4B5FD',         // Violet-300
    chart5: '#6D28D9',         // Violet-700
    
    // Special UI colors
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    
    // MusiStash brand blue keys (kept for compat; values map to violet)
    blue500: '#8B5CF6',
    blue400: '#A78BFA',
    blue600: '#7C3AED',
    
    // Brand violet aliases
    purple500: '#8B5CF6',
    purple400: '#A78BFA',
  },
  
  // Typography scale - From Figma Design System (index.css)
  typography: {
    // Headings (from Figma globals.css)
    h1: {
      fontSize: 48,         // text-5xl (3rem) - Landing page rotating words
      fontWeight: '500' as const, // --font-weight-medium
      letterSpacing: 0,     // No letter spacing for large text in Figma
      lineHeight: 48,       // 1:1 ratio for h1 (line-height: 1)
    },
    h2: {
      fontSize: 36,         // text-4xl (2.25rem) - "Musi$tash" logo
      fontWeight: '600' as const,
      letterSpacing: 0,
      lineHeight: 40,       // ~1.11 ratio
    },
    h3: {
      fontSize: 24,         // text-2xl (1.5rem) - Section titles
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 32,       // 1.33 ratio (var(--text-2xl--line-height))
    },
    h4: {
      fontSize: 20,         // text-xl (1.25rem) - Profile names
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 28,       // calc(1.75 / 1.25) from Figma
    },
    
    // Body text
    body: {
      fontSize: 16,         // text-base (1rem) - Primary body text
      fontWeight: '400' as const, // --font-weight-normal
      letterSpacing: 0,
      lineHeight: 24,       // 1.5 ratio (var(--text-base--line-height))
    },
    bodySmall: {
      fontSize: 14,         // text-sm (.875rem) - Labels, secondary text
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 20,       // calc(1.25 / .875) from Figma
    },
    bodyXSmall: {
      fontSize: 12,         // text-xs (.75rem) - Captions, helper text
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 16,       // calc(1 / .75) from Figma
    },
    
    // UI text
    button: {
      fontSize: 16,         // text-base - Button text
      fontWeight: '500' as const, // Medium weight for buttons
      letterSpacing: 0,
      lineHeight: 24,       // 1.5 ratio
    },
    caption: {
      fontSize: 12,         // text-xs
      fontWeight: '400' as const,
      letterSpacing: 0,
      lineHeight: 16,
    },
    label: {
      fontSize: 14,         // text-sm
      fontWeight: '500' as const,
      letterSpacing: 0,
      lineHeight: 20,
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
  
  // Border radius scale - From Figma (--radius: 0.625rem = 10px)
  borderRadius: {
    none: 0,
    sm: 6,         // rounded-md: calc(var(--radius) - 2px) ≈ 8px (BUT Figma uses 6)
    md: 8,         // rounded-lg: var(--radius) = 10px (BUT Figma shows 8)
    lg: 10,        // var(--radius) base = 10px
    xl: 14,        // rounded-xl: calc(var(--radius) + 4px) = 14px (Figma h-14 inputs)
    xxl: 24,
    full: 9999,    // rounded-full for circular elements
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
        // Violet brand gradient
        backgroundColor: '#8B5CF6',  // Violet-500 (gradient start)
        gradientColors: ['#8B5CF6', '#7C3AED'], // violet-500 to violet-600
        borderColor: 'transparent',
        textColor: '#FFFFFF',
        height: 56,
        borderRadius: 9999,          // rounded-full for gradient buttons
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#FCFCFD',
        height: 56,
        borderRadius: 14,
      },
    },
    
    // Card styles
    card: {
      backgroundColor: '#121216',    // Elevated dark card
      borderColor: '#454648',        // Muted border
      borderRadius: 10,              // rounded-lg
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    
    // Input styles (MusiStash brand)
    input: {
      backgroundColor: 'transparent', // Transparent in Figma
      borderColor: '#8B5CF6',         // Violet border when active
      borderColorIdle: '#6B7280',     // Gray border when idle
      borderColorFocus: '#A78BFA',    // Brighter violet on focus
      borderWidth: 2,                 // border-2 in Figma
      textColor: '#FFFFFF',
      placeholderColor: '#6B7280',    // gray-500
      height: 56,                     // h-14
      borderRadius: 14,               // rounded-xl
      fontSize: 16,
    },
    
    // Navigation styles
    navigation: {
      backgroundColor: '#070709',
      borderColor: '#454648',         // Muted border
      activeColor: '#FCFCFD',         // White for active
      inactiveColor: '#6B7280',       // Gray for inactive
      textColor: '#FCFCFD',
    },
    
    // Progress bar (MusiStash brand)
    progress: {
      backgroundColor: '#454648',     // gray-800
      fillColor: '#8B5CF6',           // Violet fill
      gradientColors: ['#A78BFA', '#8B5CF6'], // violet-400 to violet-500
      height: 4,                      // h-1
    },
    
    // Input OTP (verification code inputs)
    inputOTP: {
      slotWidth: 64,                  // w-16
      slotHeight: 64,                 // h-16
      borderColor: '#8B5CF6',         // Violet for first input
      borderColorInactive: '#6B7280', // Gray for others
      borderWidth: 2,
      borderRadius: 14,               // rounded-xl
      fontSize: 24,                   // text-2xl
      textColor: '#FFFFFF',
    },
  },
};

// Gradient definitions for use with LinearGradient - MusiStash Brand (violet)
export const MusiStashGradients = {
  // Landing page gradient (MusiStash violet)
  landing: ['#8B5CF6', '#7C3AED', '#A78BFA'] as const,
  
  // Progress bar gradient (violet-500 → violet-400)
  progress: ['#8B5CF6', '#A78BFA'] as const,
  
  // Button gradients (MusiStash brand)
  buttonPrimary: ['#8B5CF6', '#7C3AED'] as const,
  buttonArtist: ['#8B5CF6', '#A78BFA'] as const,
  buttonService: ['#8B5CF6', '#7C3AED'] as const,
  
  // Accent gradient (violet for active states)
  accent: ['#A78BFA', '#8B5CF6'] as const,
  
  // Payment gradient (green - only for payment-related UI)
  payment: ['#34D399', '#10B981'] as const, // from-emerald-400 to-emerald-500
  
  // Profile gradient border
  profileBorder: ['#8B5CF6', '#A78BFA', '#8B5CF6'] as const,
  
  // Dark background gradients
  dark: ['#070709', '#070709'] as const,
  darkSubtle: ['#070709', '#121216'] as const,
  
  // Overlay gradients
  overlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)'] as const,
  overlayStrong: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)'] as const,
  
  // Brand gradients (keys retained for compat; values are violet)
  blue: ['#8B5CF6', '#A78BFA'] as const,
  blueDark: ['#7C3AED', '#8B5CF6'] as const,
  violet: ['#8B5CF6', '#A78BFA'] as const,
  violetDark: ['#7C3AED', '#8B5CF6'] as const,
};

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
