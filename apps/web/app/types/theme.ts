export interface ThemeColors {
    primary: string;
    secondary: string;
    tertiary: string;
    textPrimary: string;
    textSecondary: string;
}

export interface ExtendedThemeColors extends ThemeColors {
    // Generated from base colors
    primaryAlpha: (opacity: number) => string;
    secondaryAlpha: (opacity: number) => string;
    tertiaryAlpha: (opacity: number) => string;
    // Common gradients
    primaryGradient: string;
    secondaryGradient: string;
    surfaceGradient: string;
    // Surface colors
    surface1: string;
    surface2: string;
    surface3: string;
}

export type ThemeId = 'irons-grotto' | 'fire' | 'ice' | 'forest' | 'cosmic';

export interface Theme {
    id: ThemeId;
    name: string;
    colors: ExtendedThemeColors;
}

export interface ThemeConfig {
    selectedTheme: ThemeId;
}