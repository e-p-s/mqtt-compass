import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import de from './de.json';
import en from './en.json';

/** The languages the user interface knows. */
export type Language = 'de' | 'en';

/** German is the default. */
export const DEFAULT_LANGUAGE: Language = 'de';

/** Where the chosen language is remembered. */
const STORAGE_KEY = 'Compass.language';

/** The languages with their title. */
export const LANGUAGES: { lang: Language; title: string }[] = [
    { lang: 'de', title: 'Deutsch' },
    { lang: 'en', title: 'English' },
];

/** The words of the application - one dictionary per language. */
const DICTIONARIES: Record<Language, Record<string, string>> = { de, en };

export interface I18nState {
    lang: Language;
    setLanguage: (lang: Language) => void;
    /** Translate a key. `%s` in the text is replaced by the arguments. */
    t: (key: string, ...args: unknown[]) => string;
}

const I18nContext = createContext<I18nState>({
    lang: DEFAULT_LANGUAGE,
    setLanguage: () => undefined,
    t: key => key,
});

/** Read the language that was chosen the last time. */
function readLanguage(): Language {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'de' || stored === 'en') {
            return stored;
        }
    } catch {
        /* the local storage may not be available */
    }
    return DEFAULT_LANGUAGE;
}

/**
 * Replace the placeholders of a text with the given values.
 *
 * The first `%s` becomes the first value, the second one the second value and so on.
 */
export function fill(text: string, args: unknown[]): string {
    let index = 0;
    return text.replace(/%s/g, () => {
        const value = args[index];
        index += 1;
        return value === undefined ? '%s' : String(value);
    });
}

/** Provides the translations to the whole application. */
export function I18nProvider(props: { children: React.ReactNode }): React.JSX.Element {
    const [lang, setLang] = useState<Language>(readLanguage);

    const setLanguage = useCallback((next: Language) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* the local storage may not be available */
        }
        setLang(next);
    }, []);

    const t = useCallback(
        (key: string, ...args: unknown[]): string => {
            const dictionary = DICTIONARIES[lang];
            const text = dictionary[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
            return fill(text, args);
        },
        [lang],
    );

    const value = useMemo<I18nState>(() => ({ lang, setLanguage, t }), [lang, setLanguage, t]);

    return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

/** The translations of the application. */
export function useTranslation(): I18nState {
    return useContext(I18nContext);
}
