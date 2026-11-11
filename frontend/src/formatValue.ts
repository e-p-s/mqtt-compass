/**
 * Decoding of the payload of a topic.
 *
 * The payload of an MQTT message is always text. Some tools know the type of the value -
 * they show it in the way that fits to the type. An explorer only sees the raw text, so
 * it has to find out itself what the payload is.
 *
 * The rules are the ones of a classic admin:
 * - a number is rounded to eight decimal places and is shown as it is,
 * - a boolean is shown as `true` or `false`,
 * - an object is shown with its entries, so that the sub values become visible.
 */

import type { ThemeColors } from './themes';

/** What a payload is. */
export type ValueKind = 'empty' | 'object' | 'array' | 'number' | 'boolean' | 'null' | 'string';

/** One entry of an object or of an array. */
export interface DecodedEntry {
    key: string;
    value: string;
    kind: ValueKind;
    /** The raw value of this entry - for the tooltip and the copy button. */
    full: string;
    /** The entries of a nested object or array. */
    children?: DecodedEntry[];
}

/** The decoded payload. */
export interface DecodedValue {
    kind: ValueKind;
    /** The short text for the cell. */
    text: string;
    /** The raw payload. */
    raw: string;
    /** The payload formatted for the tooltip and for the dialog. */
    pretty: string;
    /** The entries of an object or of an array. */
    entries: DecodedEntry[];
}

/** How long a single value may become in the cell. */
const MAX_VALUE_LENGTH = 28;

/**
 * Round a number to eight decimal places, like a classic admin does.
 *
 * The value is not formatted with the locale of the browser - `1794312843177` must not
 * become `1.794.312.843.177`.
 */
export function roundNumber(value: number): string {
    if (!Number.isFinite(value)) {
        return String(value);
    }
    if (Number.isInteger(value)) {
        return String(value);
    }
    return String(Math.round(value * 100_000_000) / 100_000_000);
}

function isNumeric(text: string): boolean {
    return text !== '' && !Number.isNaN(Number(text));
}

/** The kind of a parsed JSON value. */
export function kindOf(value: unknown): ValueKind {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    switch (typeof value) {
        case 'object':
            return 'object';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'string':
            return 'string';
        default:
            return 'string';
    }
}

/** A short description of a value - used for the entries of an object. */
export function describe(value: unknown): string {
    switch (kindOf(value)) {
        case 'null':
            return 'null';
        case 'boolean':
            return value ? 'true' : 'false';
        case 'number':
            return roundNumber(value as number);
        case 'string':
            return shorten(value as string);
        case 'array':
            return shorten(JSON.stringify(value));
        case 'object': {
            const entries = Object.entries(value as Record<string, unknown>);
            if (!entries.length) {
                return '{}';
            }
            // The braces make it visible that the value is an object and not a list of
            // the entries of the payload.
            const text = entries.map(([key, val]) => `${key}: ${describe(val)}`).join(', ');
            return shorten(`{${text}}`, 40);
        }
        default:
            return '';
    }
}

/** Cut a text to the given length. */
export function shorten(text: string, maxLength = MAX_VALUE_LENGTH): string {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.substring(0, maxLength - 1)}…`;
}

/** The entries of an object or of an array. */
function decodeEntries(value: unknown): DecodedEntry[] {
    if (Array.isArray(value)) {
        return value.map((item, index) => ({
            key: String(index),
            value: describe(item),
            kind: kindOf(item),
            full: typeof item === 'string' ? item : JSON.stringify(item),
            children: isStructured(item) ? decodeEntries(item) : undefined,
        }));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
            key,
            value: describe(item),
            kind: kindOf(item),
            full: typeof item === 'string' ? item : JSON.stringify(item),
            children: isStructured(item) ? decodeEntries(item) : undefined,
        }));
    }
    return [];
}

/** Is the value an object or an array? */
export function isStructured(value: unknown): boolean {
    const kind = kindOf(value);
    return kind === 'object' || kind === 'array';
}

/**
 * Decode the payload of a topic.
 *
 * The text is only read as JSON when it looks like JSON. Everything else stays a string -
 * a topic with the payload `on` must not become a boolean.
 */
export function decodeValue(raw: string | null | undefined): DecodedValue {
    if (raw === null || raw === undefined || raw === '') {
        return { kind: 'empty', text: '', raw: raw ?? '', pretty: '', entries: [] };
    }

    // The payload of a topic is always text. If something else arrives - a number from
    // the JSON of the server - it is turned into a text first.
    const text = typeof raw === 'string' ? raw : String(raw);
    const trimmed = text.trim();

    if (looksLikeJson(trimmed)) {
        try {
            const parsed = JSON.parse(trimmed);
            return fromParsed(parsed, text);
        } catch {
            /* it is not JSON after all */
        }
    }

    if (isNumeric(trimmed)) {
        const number = Number(trimmed);
        return {
            kind: 'number',
            text: roundNumber(number),
            raw: text,
            pretty: roundNumber(number),
            entries: [],
        };
    }

    if (trimmed === 'true' || trimmed === 'false') {
        return { kind: 'boolean', text: trimmed, raw: text, pretty: trimmed, entries: [] };
    }

    return { kind: 'string', text, raw: text, pretty: text, entries: [] };
}

/** Does the text look like JSON? */
function looksLikeJson(text: string): boolean {
    if (!text) {
        return false;
    }
    const first = text[0];
    return first === '{' || first === '[' || text === 'null';
}

/** Build the result from a parsed JSON value. */
function fromParsed(parsed: unknown, raw: string): DecodedValue {
    const kind = kindOf(parsed);

    if (kind === 'object' || kind === 'array') {
        const entries = decodeEntries(parsed);
        const text =
            kind === 'array'
                ? `[${entries.map(entry => entry.value).join(', ')}]`
                : entries.map(entry => `${entry.key}: ${entry.value}`).join(', ');
        return {
            kind,
            text,
            raw,
            pretty: JSON.stringify(parsed, null, 2),
            entries,
        };
    }

    if (kind === 'number') {
        const text = roundNumber(parsed as number);
        return { kind, text, raw, pretty: text, entries: [] };
    }

    if (kind === 'boolean') {
        return { kind, text: String(parsed), raw, pretty: String(parsed), entries: [] };
    }

    if (kind === 'null') {
        return { kind, text: 'null', raw, pretty: 'null', entries: [] };
    }

    return { kind: 'string', text: raw, raw, pretty: raw, entries: [] };
}

/**
 * Replace one value in a JSON payload.
 *
 * MQTT knows no "set a single key of a JSON payload" - the whole payload has to be
 * published again. The function returns the new payload, or `null` when that is not
 * possible (the payload is not JSON, or the key does not exist).
 *
 * The new value keeps the type of the old one: a number stays a number, a boolean stays a
 * boolean, everything else becomes a text.
 */
export function replaceInPayload(raw: string, keyPath: string, newValue: string): string | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    const segments = keyPath.split('/');
    let parent: any = parsed;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (Array.isArray(parent)) {
            parent = parent[Number(segment)];
        } else if (parent && typeof parent === 'object') {
            parent = parent[segment];
        } else {
            return null;
        }
        if (parent === null || parent === undefined) {
            return null;
        }
    }

    const last = segments[segments.length - 1];
    const original = Array.isArray(parent) ? parent[Number(last)] : parent?.[last];
    if (original === undefined) {
        return null;
    }

    const value = convertLike(original, newValue);
    if (Array.isArray(parent)) {
        parent[Number(last)] = value;
    } else {
        parent[last] = value;
    }

    return JSON.stringify(parsed);
}

/** Convert the new text so that it fits to the type of the old value. */
function convertLike(original: unknown, text: string): unknown {
    if (typeof original === 'number' && text.trim() !== '' && !Number.isNaN(Number(text))) {
        return Number(text);
    }
    if (typeof original === 'boolean') {
        const trimmed = text.trim().toLowerCase();
        if (trimmed === 'true') {
            return true;
        }
        if (trimmed === 'false') {
            return false;
        }
    }
    return text;
}

/**
 * The cache of the decoded payloads.
 *
 * The same payload comes back with every message of a topic, and the tree is rebuilt
 * often. Decoding it again every time would be a waste.
 */
const cache = new Map<string, DecodedValue>();

/** How many payloads are kept in the cache. */
const CACHE_SIZE = 5000;

/** Decode the payload and remember the result. */
export function decodeValueCached(raw: string | null | undefined): DecodedValue {
    // The key is the text of the payload. If something else arrives, it is made a text
    // first - so that the cache does not mix a number with the text "42".
    const key = typeof raw === 'string' ? raw : raw === null || raw === undefined ? '' : String(raw);
    const cached = cache.get(key);
    if (cached) {
        return cached;
    }
    const decoded = decodeValue(raw);
    if (cache.size >= CACHE_SIZE) {
        // The oldest entry is dropped - the map remembers the order of the insertions.
        const oldest = cache.keys().next();
        if (!oldest.done) {
            cache.delete(oldest.value);
        }
    }
    cache.set(key, decoded);
    return decoded;
}

/**
 * The text of the cell.
 *
 * For an object the entries are shown as `key: value`, so that the sub values of the
 * payload become visible without opening it.
 */
export function cellText(value: DecodedValue): string {
    if (value.kind === 'object' || value.kind === 'array') {
        return value.text;
    }
    return value.text;
}

/** The color of the value - it comes from the theme. */
export function valueColor(value: DecodedValue, colors: ThemeColors): string | undefined {
    return valueColorForKind(value.kind, colors);
}

/** The color of a value of the given kind. */
export function valueColorForKind(kind: ValueKind | undefined, colors: ThemeColors): string | undefined {
    switch (kind) {
        case 'boolean':
            return colors.boolean;
        case 'number':
            return colors.number;
        case 'null':
            return colors.nullValue;
        default:
            return undefined;
    }
}
