import { describe, expect, it } from 'vitest';
import {
    DEFAULT_FAMILY,
    DEFAULT_THEME_SETTINGS,
    THEME_FAMILIES,
    findFamily,
    readableOn,
    resolveColors,
    type ThemeColors,
    type ThemeSettings,
} from '../src/themes';

describe('the colour families', () => {
    it('has four families', () => {
        expect(THEME_FAMILIES).toHaveLength(4);
    });

    it('gives every family a dark and a light variant', () => {
        for (const family of THEME_FAMILIES) {
            expect(family.dark).toBeTruthy();
            expect(family.light).toBeTruthy();
            expect(family.dark.background).not.toBe(family.light.background);
        }
    });

    it('gives every family a name and an id', () => {
        for (const family of THEME_FAMILIES) {
            expect(family.id).toMatch(/^[a-z]+$/);
            expect(family.name.length).toBeGreaterThan(0);
        }
    });

    it('has the default family', () => {
        expect(THEME_FAMILIES.some(family => family.id === DEFAULT_FAMILY)).toBe(true);
    });
});

describe('resolveColors', () => {
    const base: ThemeSettings = {
        family: 'graphite',
        mode: 'dark',
        overrides: {},
    };

    it('takes the dark variant of the family', () => {
        const colors = resolveColors(base);
        expect(colors).toEqual(findFamily('graphite').dark);
    });

    it('takes the light variant of the family', () => {
        const colors = resolveColors({ ...base, mode: 'light' });
        expect(colors).toEqual(findFamily('graphite').light);
    });

    it('takes another family', () => {
        const colors = resolveColors({ ...base, family: 'marine' });
        expect(colors).toEqual(findFamily('marine').dark);
    });

    it('uses the default family when the name is unknown', () => {
        const colors = resolveColors({ ...base, family: 'gibtsnicht' });
        expect(colors).toEqual(findFamily(DEFAULT_FAMILY).dark);
    });

    it('merges the changes of the user in', () => {
        const settings: ThemeSettings = {
            ...base,
            overrides: { 'graphite:dark': { accent: '#ff0000' } },
        };
        const colors = resolveColors(settings);
        expect(colors.accent).toBe('#ff0000');
        // The other colours stay as they are.
        expect(colors.background).toBe(findFamily('graphite').dark.background);
    });

    it('does not change the other variant', () => {
        const settings: ThemeSettings = {
            ...base,
            mode: 'light',
            overrides: { 'graphite:dark': { accent: '#ff0000' } },
        };
        const colors = resolveColors(settings);
        expect(colors.accent).toBe(findFamily('graphite').light.accent);
    });

    it('does not change the family itself', () => {
        const settings: ThemeSettings = {
            ...base,
            overrides: { 'graphite:dark': { accent: '#ff0000' } },
        };
        resolveColors(settings);
        expect(findFamily('graphite').dark.accent).not.toBe('#ff0000');
    });
});

describe('readableOn', () => {
    it('uses black on a bright background', () => {
        expect(readableOn('#ffffff')).toBe('#000000');
        expect(readableOn('#ffff00')).toBe('#000000');
    });

    it('uses white on a dark background', () => {
        expect(readableOn('#000000')).toBe('#ffffff');
        expect(readableOn('#1e1e1e')).toBe('#ffffff');
    });

    it('survives a broken colour', () => {
        expect(readableOn('keine Farbe')).toBe('#000000');
        expect(readableOn('#123')).toBe('#000000');
    });
});

describe('the default settings', () => {
    it('uses the default family in the dark variant', () => {
        expect(DEFAULT_THEME_SETTINGS.family).toBe(DEFAULT_FAMILY);
        expect(DEFAULT_THEME_SETTINGS.mode).toBe('dark');
        expect(DEFAULT_THEME_SETTINGS.overrides).toEqual({});
    });

    it('has the same colours as the family', () => {
        const colors = resolveColors(DEFAULT_THEME_SETTINGS);
        expect(colors).toEqual(findFamily(DEFAULT_FAMILY).dark);
    });
});

describe('the colours of a family', () => {
    it('has every colour that the interface needs', () => {
        const needed: (keyof ThemeColors)[] = [
            'background',
            'surface',
            'header',
            'text',
            'textMuted',
            'accent',
            'onAccent',
            'divider',
            'guide',
            'hover',
            'folder',
            'state',
            'number',
            'boolean',
            'nullValue',
            'scrollbar',
            'online',
            'offline',
        ];
        for (const family of THEME_FAMILIES) {
            for (const key of needed) {
                expect(family.dark[key]).toMatch(/^#[0-9a-f]{6}$/i);
                expect(family.light[key]).toMatch(/^#[0-9a-f]{6}$/i);
            }
        }
    });

    it('has a light and a dark background in every family', () => {
        for (const family of THEME_FAMILIES) {
            const dark = parseInt(family.dark.background.substring(1), 16);
            const light = parseInt(family.light.background.substring(1), 16);
            // The sum of the three colours tells whether the background is dark.
            const darkSum = (dark >> 16) + ((dark >> 8) & 0xff) + (dark & 0xff);
            const lightSum = (light >> 16) + ((light >> 8) & 0xff) + (light & 0xff);
            expect(darkSum).toBeLessThan(lightSum);
        }
    });
});
