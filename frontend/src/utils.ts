/**
 * Small helpers of the user interface.
 *
 * They replace the helpers of the library that was used before - the application does
 * not depend on it any more.
 */

/** The text is copied into the clipboard of the browser. */
export function copyToClipboard(text: string): void {
    if (!text) {
        return;
    }
    // The clipboard of the browser needs a secure context. If it is not there - the page
    // is opened over plain http on a server without a certificate - the old way with a
    // hidden text field is used.
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
            copyWithTextField(text);
        });
    } else {
        copyWithTextField(text);
    }
}

/** The fallback for the browsers without the clipboard. */
function copyWithTextField(text: string): void {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    try {
        document.execCommand('copy');
    } catch {
        /* the browser does not allow it - nothing else can be done */
    }
    document.body.removeChild(field);
}

/**
 * The colour of the text that is written on a background.
 *
 * If the background is bright, the text is black, otherwise it is white.
 */
export function invertColor(background: string, _keepBrightness = false): string {
    const hex = background.replace('#', '');
    if (hex.length !== 6) {
        return '#000000';
    }
    const red = parseInt(hex.substring(0, 2), 16);
    const green = parseInt(hex.substring(2, 4), 16);
    const blue = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.6 ? '#000000' : '#ffffff';
}

/**
 * One style of the styles of a component.
 *
 * A style can be a plain object or a function that gets the colours. The functions are
 * resolved, so that the result can be spread into a style attribute.
 */
export type StyleDefinition = Record<string, unknown> | ((colors: never) => Record<string, unknown>);

/**
 * The styles of a component are put together.
 *
 * A style can be a plain object or a function that gets the colours. The later styles win
 * over the earlier ones, so that a selected row can overwrite the colours of the row.
 */
export function getStyle<T extends StyleDefinition>(
    colors: unknown,
    ...styles: (T | undefined)[]
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const style of styles) {
        if (!style) {
            continue;
        }
        const resolved = typeof style === 'function' ? (style as (c: unknown) => Record<string, unknown>)(colors) : style;
        Object.assign(result, resolved);
    }
    return result;
}
