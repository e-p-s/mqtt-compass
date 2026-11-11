import { describe, expect, it } from 'vitest';
import { resizeWidths, type ColumnDef } from '../src/useColumnWidths';

const COLUMNS: ColumnDef[] = [
    { key: 'expand', title: '', width: 24, minWidth: 24 },
    { key: 'name', title: 'Topic', width: 320, minWidth: 120 },
    { key: 'value', title: 'Value', width: 220, minWidth: 80 },
    { key: 'qos', title: 'QoS', width: 50, minWidth: 36 },
    { key: 'retain', title: 'Retain', width: 60, minWidth: 44 },
    { key: 'changed', title: 'Changed', width: 150, minWidth: 90 },
    { key: 'actions', title: '', width: 40, minWidth: 40 },
];

const START = COLUMNS.map(column => column.width);

describe('resizeWidths', () => {
    it('makes the dragged column wider and lets the others move along', () => {
        const next = resizeWidths(START, 1, 100, COLUMNS);
        expect(next[1]).toBe(420);
        // The columns behind it keep their width.
        expect(next[2]).toBe(220);
        expect(next[3]).toBe(50);
        expect(next[6]).toBe(40);
    });

    it('makes the dragged column smaller', () => {
        const next = resizeWidths(START, 1, -100, COLUMNS);
        expect(next[1]).toBe(220);
        expect(next[2]).toBe(220);
    });

    it('keeps the smallest width', () => {
        const next = resizeWidths(START, 1, -1000, COLUMNS);
        expect(next[1]).toBe(COLUMNS[1].minWidth);
    });

    it('does not change the other columns', () => {
        const next = resizeWidths(START, 3, 30, COLUMNS);
        expect(next[3]).toBe(80);
        expect(next[1]).toBe(START[1]);
        expect(next[2]).toBe(START[2]);
    });

    it('does not change the array that was passed in', () => {
        const start = [...START];
        resizeWidths(start, 1, 100, COLUMNS);
        expect(start).toEqual(START);
    });

    it('ignores an index that does not exist', () => {
        expect(resizeWidths(START, 99, 100, COLUMNS)).toEqual(START);
        expect(resizeWidths(START, -1, 100, COLUMNS)).toEqual(START);
    });
});
