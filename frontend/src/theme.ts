import { useCallback, useEffect, useMemo, useState } from 'react';
import { createTheme, type Theme } from '@mui/material/styles';
import {
    DEFAULT_THEME_SETTINGS,
    THEME_STORAGE_KEY,
    findFamily,
    resolveColors,
    type ThemeColors,
    type ThemeSettings,
} from './themes';

/** The theme of the application. */
export interface CompassTheme {
    /** The MUI theme - it is given to the `ThemeProvider`. */
    theme: Theme;
    /** The colours of the current variant. */
    colors: ThemeColors;
    /** The id of the chosen family. */
    family: string;
    /** The name of the chosen family. */
    familyName: string;
    /** Is the dark or the light variant used? */
    mode: 'dark' | 'light';
    /** All the settings - the changes of the user are part of it. */
    settings: ThemeSettings;
    /** Switch between the dark and the light variant. */
    toggleMode: () => void;
    /** Choose the dark or the light variant. */
    setMode: (mode: 'dark' | 'light') => void;
    /** Choose another family. */
    setFamily: (family: string) => void;
    /** Change one colour of the current variant. */
    setColor: (key: keyof ThemeColors, value: string) => void;
    /** Put the colours of the current variant back to the values of the family. */
    resetColors: () => void;
    /** Put everything back to the start. */
    resetAll: () => void;
}

/** Read the settings from the local storage. */
function loadSettings(): ThemeSettings {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<ThemeSettings>;
            return {
                family: typeof parsed.family === 'string' ? parsed.family : DEFAULT_THEME_SETTINGS.family,
                mode: parsed.mode === 'light' || parsed.mode === 'dark' ? parsed.mode : DEFAULT_THEME_SETTINGS.mode,
                overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
            };
        }
    } catch {
        /* the local storage may not be available */
    }
    return DEFAULT_THEME_SETTINGS;
}

/**
 * The theme of the application.
 *
 * The colours come from a family of the file `themes.ts`. The user can change every single
 * colour - the changes are kept in the local storage.
 */
export function useCompassTheme(): CompassTheme {
    const [settings, setSettings] = useState<ThemeSettings>(loadSettings);

    useEffect(() => {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
        } catch {
            /* the local storage may not be available */
        }
    }, [settings]);

    const colors = useMemo(() => resolveColors(settings), [settings]);
    const family = useMemo(() => findFamily(settings.family), [settings.family]);

    // The colour of the scroll bar is a variable of the page - the style sheet uses it.
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--compass-scrollbar-thumb', `${colors.scrollbar}80`);
        root.style.setProperty('--compass-scrollbar-thumb-hover', colors.scrollbar);
    }, [colors.scrollbar]);

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: settings.mode,
                    primary: { main: colors.accent, contrastText: colors.onAccent },
                    secondary: { main: colors.folder },
                    background: { default: colors.background, paper: colors.surface },
                    text: { primary: colors.text, secondary: colors.textMuted },
                    divider: colors.divider,
                    success: { main: colors.online },
                    warning: { main: colors.offline },
                },
                shape: { borderRadius: 4 },
                typography: {
                    fontFamily: "'Segoe UI', Tahoma, Arial, 'Courier New', monospace",
                    fontSize: 12,
                },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: { backgroundColor: colors.background, color: colors.text },
                        },
                    },
                    MuiTooltip: {
                        styleOverrides: {
                            tooltip: { backgroundColor: colors.header, color: colors.text, fontSize: 12 },
                        },
                    },
                },
            }),
        [colors, settings.mode],
    );

    const toggleMode = useCallback(() => {
        setSettings(current => ({
            ...current,
            mode: current.mode === 'dark' ? 'light' : 'dark',
        }));
    }, []);

    const setFamily = useCallback((id: string) => {
        setSettings(current => ({ ...current, family: id }));
    }, []);

    const setMode = useCallback((next: 'dark' | 'light') => {
        setSettings(current => ({ ...current, mode: next }));
    }, []);

    const setColor = useCallback(
        (key: keyof ThemeColors, value: string) => {
            setSettings(current => {
                const family = findFamily(current.family);
                const slot = `${family.id}:${current.mode}`;
                const changes = { ...(current.overrides[slot] ?? {}) };
                changes[key] = value;
                return { ...current, overrides: { ...current.overrides, [slot]: changes } };
            });
        },
        [],
    );

    const resetColors = useCallback(() => {
        setSettings(current => {
            const family = findFamily(current.family);
            const slot = `${family.id}:${current.mode}`;
            const overrides = { ...current.overrides };
            delete overrides[slot];
            return { ...current, overrides };
        });
    }, []);

    const resetAll = useCallback(() => {
        setSettings(DEFAULT_THEME_SETTINGS);
    }, []);

    return {
        theme,
        colors,
        family: settings.family,
        familyName: family.name,
        mode: settings.mode,
        settings,
        toggleMode,
        setMode,
        setFamily,
        setColor,
        resetColors,
        resetAll,
    };
}
