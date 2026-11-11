import { describe, expect, it } from 'vitest';
import {
    columnValue,
    emptyFilter,
    filterTree,
    flatten,
    isVisibleName,
    type SortState,
    type TreeNode,
} from '../src/tree';
import { info } from './helpers';

describe('isVisibleName', () => {
    it('accepts a normal name', () => {
        expect(isVisibleName('temperature')).toBe(true);
        expect(isVisibleName('$state')).toBe(true);
    });

    it('rejects an empty name', () => {
        expect(isVisibleName('')).toBe(false);
    });

    it('rejects a name that is only dots', () => {
        expect(isVisibleName('...')).toBe(false);
        expect(isVisibleName('..')).toBe(false);
    });
});

describe('the sorting', () => {
    const tree: TreeNode[] = [
        {
            name: 'a',
            path: 'a',
            children: [
                { name: 'charlie', path: 'a/charlie', value: info('3') },
                { name: 'alpha', path: 'a/alpha', value: info('1') },
                { name: 'bravo', path: 'a/bravo', value: info('2') },
            ],
        },
    ];

    it('sorts the siblings by the name', () => {
        const sort: SortState = { column: 'topic', direction: 'asc' };
        const rows = flatten(tree, new Set(['a']), 0, sort);
        expect(rows.map(row => row.name)).toEqual(['a', 'alpha', 'bravo', 'charlie']);
    });

    it('sorts the siblings descending', () => {
        const sort: SortState = { column: 'topic', direction: 'desc' };
        const rows = flatten(tree, new Set(['a']), 0, sort);
        expect(rows.map(row => row.name)).toEqual(['a', 'charlie', 'bravo', 'alpha']);
    });

    it('sorts by the value', () => {
        const sort: SortState = { column: 'value', direction: 'asc' };
        const rows = flatten(tree, new Set(['a']), 0, sort);
        // The folder itself has no value.
        expect(rows.map(row => row.valueText)).toEqual([undefined, '1', '2', '3']);
    });

    it('keeps the order of the broker without a sorting', () => {
        const rows = flatten(tree, new Set(['a']));
        expect(rows.map(row => row.name)).toEqual(['a', 'charlie', 'alpha', 'bravo']);
    });
});

describe('the filter of the columns', () => {
    const tree: TreeNode[] = [
        {
            name: 'a',
            path: 'a',
            children: [
                { name: 'one', path: 'a/one', value: info('x') },
                { name: 'two', path: 'a/two', value: info('y') },
                { name: 'three', path: 'a/three', value: info('z') },
            ],
        },
    ];

    it('shows only the allowed values', () => {
        const filter = { ...emptyFilter, columns: { topic: new Set(['one', 'three']) } };
        const filtered = filterTree(tree, filter);
        const rows = flatten(filtered, new Set(['a']));
        expect(rows.map(row => row.name)).toEqual(['a', 'one', 'three']);
    });

    it('shows everything without a filter', () => {
        const rows = flatten(filterTree(tree, emptyFilter), new Set(['a']));
        expect(rows).toHaveLength(4);
    });

    it('filters by the value as well', () => {
        const filter = { ...emptyFilter, columns: { value: new Set(['y']) } };
        const filtered = filterTree(tree, filter);
        const rows = flatten(filtered, new Set(['a']));
        expect(rows.map(row => row.name)).toEqual(['a', 'two']);
    });

    it('keeps the folder when a child is in the filter', () => {
        const filter = { ...emptyFilter, columns: { topic: new Set(['two']) } };
        const filtered = filterTree(tree, filter);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('a');
        expect(filtered[0].children).toHaveLength(1);
    });

    it('combines the filters of the columns', () => {
        const filter = {
            ...emptyFilter,
            columns: { topic: new Set(['one', 'two']), value: new Set(['y']) },
        };
        const filtered = filterTree(tree, filter);
        const rows = flatten(filtered, new Set(['a']));
        expect(rows.map(row => row.name)).toEqual(['a', 'two']);
    });
});

describe('columnValue', () => {
    it('reads the value of a column', () => {
        const tree: TreeNode[] = [{ name: 'a', path: 'a', value: info('7', { qos: 1, retain: true }) }];
        const rows = flatten(tree, new Set());
        const row = rows[0];
        expect(columnValue(row, 'topic')).toBe('a');
        expect(columnValue(row, 'value')).toBe('7');
        expect(columnValue(row, 'qos')).toBe('1');
        expect(columnValue(row, 'retain')).toBe('yes');
    });
});

describe('the path of a sub value', () => {
    it('is the topic and the key', () => {
        const tree: TreeNode[] = [{ name: 'a', path: 'a/b/c', value: info('{"x":1}') }];
        const rows = flatten(tree, new Set(), 0, null, {});
        expect(rows[0].path).toBe('a/b/c');

        const withChild = flatten(
            [{ name: 'a', path: 'a/b/c', value: info('{"x":1}') }],
            new Set(['\u0000a/b/c\u0000']),
            0,
            null,
            {},
        );
        expect(withChild[1].path).toBe('a/b/c/x');
    });
});
