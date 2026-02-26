import { Theme, ThemeId, ExtendedThemeColors } from '@/app/types/theme';

// Helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    if (!result) return hex;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to create extended colors from base colors
function createExtendedColors(
    primary: string,
    secondary: string,
    tertiary: string,
    textPrimary: string,
    textSecondary: string
): ExtendedThemeColors {
    return {
        primary,
        secondary,
        tertiary,
        textPrimary,
        textSecondary,
        primaryAlpha: (opacity: number) => hexToRgba(primary, opacity),
        secondaryAlpha: (opacity: number) => hexToRgba(secondary, opacity),
        tertiaryAlpha: (opacity: number) => hexToRgba(tertiary, opacity),
        primaryGradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
        secondaryGradient: `linear-gradient(90deg, ${secondary} 0%, ${tertiary} 100%)`,
        surfaceGradient: `radial-gradient(ellipse at center, ${hexToRgba(secondary, 0.8)} 0%, ${hexToRgba(primary, 0.95)} 70%)`,
        surface1: hexToRgba(primary, 0.95),
        surface2: hexToRgba(secondary, 0.8),
        surface3: hexToRgba(tertiary, 0.1),
    };
}

// Theme definitions
const themes: Theme[] = [
    {
        id: 'irons-grotto',
        name: 'Irons Grotto Purple',
        colors: createExtendedColors(
            '#1a0d2e', // primary (deep purple)
            '#e91e63', // secondary (pink)
            '#ce93d8', // tertiary (light purple)
            '#ffffff', // text primary
            '#b39ddb'  // text secondary
        )
    },
    {
        id: 'fire',
        name: 'Infernal Fire',
        colors: createExtendedColors(
            '#1a0f0d', // primary (deep red-black)
            '#ff4444', // secondary (bright red)
            '#ff8a65', // tertiary (orange)
            '#ffffff', // text primary
            '#ffab91'  // text secondary (light orange)
        )
    },
    {
        id: 'ice',
        name: 'Frozen Wastes',
        colors: createExtendedColors(
            '#0d1a2e', // primary (deep blue)
            '#2196f3', // secondary (blue)
            '#81d4fa', // tertiary (light blue)
            '#ffffff', // text primary
            '#b3e5fc'  // text secondary (pale blue)
        )
    },
    {
        id: 'forest',
        name: 'Wilderness Green',
        colors: createExtendedColors(
            '#0d2e1a', // primary (deep green)
            '#4caf50', // secondary (green)
            '#a5d6a7', // tertiary (light green)
            '#ffffff', // text primary
            '#c8e6c9'  // text secondary (pale green)
        )
    },
    {
        id: 'cosmic',
        name: 'Cosmic Void',
        colors: createExtendedColors(
            '#000015', // primary (deep space)
            '#9c27b0', // secondary (cosmic purple)
            '#ffeb3b', // tertiary (star yellow)
            '#ffffff', // text primary
            '#f8bbd9'  // text secondary (pink)
        )
    }
];

export function getThemes(): Theme[] {
    return themes;
}

export function getThemeById(id: ThemeId): Theme {
    return themes.find(theme => theme.id === id) ?? themes[0];
}

export function getDefaultTheme(): Theme {
    return themes[0];
}