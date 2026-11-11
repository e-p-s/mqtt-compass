/**
 * The colour families of the user interface.
 *
 * Every family has a dark and a light variant. The families are not named after the
 * products they borrow their colours from - they are named after the impression they
 * make, so that the list of the themes reads like a list of moods.
 *
 * The colours are stored as hex values. The web UI builds its own MUI theme from them, so
 * that nothing of the appearance is hard coded in the components.
 */

/** The colours of one variant of a theme. */
export interface ThemeColors {
    /** The background of the window. */
    background: string;
    /** The background of the panels and of the table. */
    surface: string;
    /** The background of the line above the table. */
    header: string;
    /** The colour of the text. */
    text: string;
    /** The colour of a text that is not important. */
    textMuted: string;
    /** The accent colour - the buttons and the selected row. */
    accent: string;
    /** The text on the accent colour. */
    onAccent: string;
    /** The colour of the lines between the rows. */
    divider: string;
    /** The colour of the line that shows the level of a row in the tree. */
    guide: string;
    /** The background of the row under the mouse. */
    hover: string;
    /** The colour of the icon of a folder. */
    folder: string;
    /** The colour of the icon of a value. */
    state: string;
    /** The colour of a value that is a number. */
    number: string;
    /** The colour of a value that is true or false. */
    boolean: string;
    /** The colour of the value null. */
    nullValue: string;
    /** The colour of the scroll bar. */
    scrollbar: string;
    /** The colour of the lamp that shows that the broker is connected. */
    online: string;
    /** The colour of the lamp that shows that the broker is not connected. */
    offline: string;
}

/** One family of colours with a dark and a light variant. */
export interface ThemeFamily {
    /** The id of the family - it is also the name of the theme. */
    id: string;
    /** The name that is shown in the user interface. */
    name: string;
    /** The colours of the dark variant. */
    dark: ThemeColors;
    /** The colours of the light variant. */
    light: ThemeColors;
}

/** The dark variant of the family "Graphite" - it is the default. */
const GRAPHITE_DARK: ThemeColors = {
    background: '#1e1e1e',
    surface: '#252526',
    header: '#2d2d30',
    text: '#d4d4d4',
    textMuted: '#9d9d9d',
    accent: '#0e639c',
    onAccent: '#ffffff',
    divider: '#3c3c3c',
    guide: '#4a4a4a',
    hover: '#2a2d2e',
    folder: '#c586c0',
    state: '#d4d4d4',
    number: '#b5cea8',
    boolean: '#569cd6',
    nullValue: '#ce9178',
    scrollbar: '#424242',
    online: '#6a9955',
    offline: '#cca700',
};

/** The light variant of the family "Graphite". */
const GRAPHITE_LIGHT: ThemeColors = {
    background: '#f5f5f5',
    surface: '#ffffff',
    header: '#ececec',
    text: '#333333',
    textMuted: '#6b6b6b',
    accent: '#0067c0',
    onAccent: '#ffffff',
    divider: '#dedede',
    guide: '#c8c8c8',
    hover: '#e8f1fb',
    folder: '#881391',
    state: '#333333',
    number: '#098658',
    boolean: '#001080',
    nullValue: '#a31515',
    scrollbar: '#c8c8c8',
    online: '#0a7c2f',
    offline: '#b8860b',
};

/** The dark variant of the family "Marine" - it is the classic blue of the terminal. */
const MARINE_DARK: ThemeColors = {
    background: '#0000a8',
    surface: '#000080',
    header: '#00005c',
    text: '#ffffff',
    textMuted: '#b8b8d8',
    accent: '#00ffff',
    onAccent: '#000000',
    divider: '#0000c0',
    guide: '#4040d8',
    hover: '#0000d8',
    folder: '#ffff55',
    state: '#ffffff',
    number: '#55ff55',
    boolean: '#ffff55',
    nullValue: '#ff5555',
    scrollbar: '#4040d8',
    online: '#55ff55',
    offline: '#ffff55',
};

/** The light variant of the family "Marine". */
const MARINE_LIGHT: ThemeColors = {
    background: '#d8d8f0',
    surface: '#ffffff',
    header: '#c4c4e8',
    text: '#000060',
    textMuted: '#404080',
    accent: '#0000c0',
    onAccent: '#ffffff',
    divider: '#b0b0d8',
    guide: '#9090c0',
    hover: '#e4e4ff',
    folder: '#a06000',
    state: '#000060',
    number: '#006000',
    boolean: '#0000c0',
    nullValue: '#c00000',
    scrollbar: '#a0a0c8',
    online: '#008000',
    offline: '#a06000',
};

/** The dark variant of the family "Sand" - it is warm and quiet. */
const SAND_DARK: ThemeColors = {
    background: '#2b2620',
    surface: '#332d26',
    header: '#3b342b',
    text: '#e8ddc9',
    textMuted: '#a89b83',
    accent: '#c98a3c',
    onAccent: '#1a1611',
    divider: '#4a4136',
    guide: '#5c5143',
    hover: '#3d362d',
    folder: '#d9a441',
    state: '#e8ddc9',
    number: '#a8c98a',
    boolean: '#7fb5d9',
    nullValue: '#d98a7f',
    scrollbar: '#5c5143',
    online: '#8fbf6a',
    offline: '#d9a441',
};

/** The light variant of the family "Sand". */
const SAND_LIGHT: ThemeColors = {
    background: '#f4efe6',
    surface: '#fbf8f1',
    header: '#e9e2d4',
    text: '#3b342b',
    textMuted: '#7a6f5c',
    accent: '#b5761f',
    onAccent: '#ffffff',
    divider: '#ddd4c2',
    guide: '#c9bda6',
    hover: '#eee7d9',
    folder: '#a8730f',
    state: '#3b342b',
    number: '#4f7a28',
    boolean: '#2a6a94',
    nullValue: '#a8443a',
    scrollbar: '#c9bda6',
    online: '#5a8f3a',
    offline: '#a8730f',
};

/** The dark variant of the family "Mint" - it is fresh and calm. */
const MINT_DARK: ThemeColors = {
    background: '#14201d',
    surface: '#1a2825',
    header: '#213330',
    text: '#d5e8e2',
    textMuted: '#8fa8a0',
    accent: '#3fb98f',
    onAccent: '#0d1614',
    divider: '#2b3d39',
    guide: '#3a504b',
    hover: '#213330',
    folder: '#6fd3b4',
    state: '#d5e8e2',
    number: '#8fd9b0',
    boolean: '#7cc4e8',
    nullValue: '#e0a08f',
    scrollbar: '#3a504b',
    online: '#5fd6a0',
    offline: '#d9b45f',
};

/** The light variant of the family "Mint". */
const MINT_LIGHT: ThemeColors = {
    background: '#eef5f2',
    surface: '#ffffff',
    header: '#e2ece8',
    text: '#1f2e2a',
    textMuted: '#667b75',
    accent: '#1e8a68',
    onAccent: '#ffffff',
    divider: '#d3e2dd',
    guide: '#bccfc9',
    hover: '#e4f2ed',
    folder: '#157a5c',
    state: '#1f2e2a',
    number: '#1e7a4e',
    boolean: '#1a6f96',
    nullValue: '#a8463a',
    scrollbar: '#bccfc9',
    online: '#1e8a68',
    offline: '#a8801f',
};

/** All the colour families. */
export const THEME_FAMILIES: ThemeFamily[] = [
    { id: 'graphite', name: 'Graphite', dark: GRAPHITE_DARK, light: GRAPHITE_LIGHT },
    { id: 'marine', name: 'Marine', dark: MARINE_DARK, light: MARINE_LIGHT },
    { id: 'sand', name: 'Sand', dark: SAND_DARK, light: SAND_LIGHT },
    { id: 'mint', name: 'Mint', dark: MINT_DARK, light: MINT_LIGHT },
];

/** The family that is used when nothing was chosen yet. */
export const DEFAULT_FAMILY = 'graphite';

/** The id of the key in the local storage. */
export const THEME_STORAGE_KEY = 'Compass.theme';

/**
 * The colours of a family - with the changes of the user.
 *
 * The user can change every single colour. The changes are stored in the local storage,
 * so that the own theme survives a restart of the browser.
 */
export interface ThemeSettings {
    /** The id of the chosen family. */
    family: string;
    /** Is the dark or the light variant used? */
    mode: 'dark' | 'light';
    /** The colours that the user has changed - the key is the id of the family. */
    overrides: Record<string, Partial<ThemeColors>>;
}

/** The settings that are used when nothing was stored yet. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    family: DEFAULT_FAMILY,
    mode: 'dark',
    overrides: {},
};

/**
 * The colours of a family with the changes of the user.
 *
 * The function is pure - the changes are merged in, so that the result can be tested
 * without a browser.
 */
export function resolveColors(settings: ThemeSettings): ThemeColors {
    const family = THEME_FAMILIES.find(item => item.id === settings.family) ?? THEME_FAMILIES[0];
    const base = settings.mode === 'light' ? family.light : family.dark;
    const changes = settings.overrides[`${family.id}:${settings.mode}`] ?? {};
    return { ...base, ...changes };
}

/** The family with the given id - the default family is returned if it does not exist. */
export function findFamily(id: string): ThemeFamily {
    return THEME_FAMILIES.find(item => item.id === id) ?? THEME_FAMILIES[0];
}

/**
 * A colour that can be read on the given background.
 *
 * The relative brightness of a colour decides whether the text on it is black or white.
 */
export function readableOn(background: string): string {
    const hex = background.replace('#', '');
    if (hex.length !== 6) {
        return '#000000';
    }
    const red = parseInt(hex.substring(0, 2), 16);
    const green = parseInt(hex.substring(2, 4), 16);
    const blue = parseInt(hex.substring(4, 6), 16);
    // The formula of the WCAG for the relative brightness.
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
}
