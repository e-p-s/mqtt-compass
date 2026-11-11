import { useCallback, useEffect, useRef, useState } from 'react';

/** The description of one column of the table. */
export interface ColumnDef {
    key: string;
    title: string;
    /** The width in pixels. */
    width: number;
    /** The smallest width in pixels. */
    minWidth: number;
}

/** The widths of the columns, as they are stored in the local storage. */
export type ColumnWidths = number[];

/**
 * The widths of the columns after a drag of the handle.
 *
 * The handle at the right edge of a column changes the width of *this* column. The columns
 * behind it keep their width and move along - the total width of the table grows or
 * shrinks. That is how a table behaves when one drags the border of a column.
 *
 * The function is pure, so that the rule can be tested without a browser.
 */
export function resizeWidths(
    startWidths: number[],
    index: number,
    delta: number,
    columns: ColumnDef[],
): number[] {
    const next = [...startWidths];
    if (index < 0 || index >= next.length) {
        return next;
    }
    const min = columns[index]?.minWidth ?? 40;
    const width = startWidths[index] + delta;
    next[index] = Math.max(min, Math.round(width));
    return next;
}

/**
 * The widths of the columns of the table.
 *
 * A handle between two columns changes the width of the column before it, the columns
 * behind it move along. A double click on the handle sets the widths back. The widths are
 * kept in the local storage.
 */
export function useColumnWidths(columns: ColumnDef[], storageKey: string) {
    const [widths, setWidths] = useState<ColumnWidths>(() => load(columns, storageKey));

    // The state of the drag.
    const drag = useRef<{ index: number; startX: number; startWidths: ColumnWidths } | null>(null);

    const persist = useCallback(
        (next: ColumnWidths) => {
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                /* the local storage may not be available */
            }
        },
        [storageKey],
    );

    const startResize = useCallback(
        (index: number, event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            drag.current = { index, startX: event.clientX, startWidths: [...widths] };
        },
        [widths],
    );

    useEffect(() => {
        const onMove = (event: MouseEvent): void => {
            const current = drag.current;
            if (!current) {
                return;
            }
            const delta = event.clientX - current.startX;
            setWidths(resizeWidths(current.startWidths, current.index, delta, columns));
        };

        const onUp = (): void => {
            if (!drag.current) {
                return;
            }
            drag.current = null;
            setWidths(current => {
                persist(current);
                return current;
            });
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [columns, persist]);

    const reset = useCallback(() => {
        const next = columns.map(column => column.width);
        setWidths(next);
        persist(next);
    }, [columns, persist]);

    /** The template of the grid - all rows share it, so that the columns line up. */
    const template = columns
        .map((column, index) => {
            const width = widths[index] ?? column.width;
            return `${width}px`;
        })
        .join(' ');

    return { widths, template, startResize, reset };
}

/** Read the widths from the local storage. */
function load(columns: ColumnDef[], storageKey: string): ColumnWidths {
    const defaults = columns.map(column => column.width);
    try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) {
            return defaults;
        }
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed) || parsed.length !== defaults.length) {
            return defaults;
        }
        return parsed.map((width, index) => {
            const value = Number(width);
            if (!Number.isFinite(value) || value < (columns[index]?.minWidth ?? 40)) {
                return defaults[index];
            }
            return Math.round(value);
        });
    } catch {
        return defaults;
    }
}
