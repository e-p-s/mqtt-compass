import { describe, expect, it } from 'vitest';
import { decodeValue, describe as describeValue, kindOf, roundNumber, shorten } from '../src/formatValue';

describe('decodeValue', () => {
    it('handles an empty payload', () => {
        expect(decodeValue('').kind).toBe('empty');
        expect(decodeValue(null).kind).toBe('empty');
        expect(decodeValue(undefined).kind).toBe('empty');
    });

    it('reads a number', () => {
        const value = decodeValue('21.5');
        expect(value.kind).toBe('number');
        expect(value.text).toBe('21.5');
    });

    it('rounds a number to eight decimal places', () => {
        expect(roundNumber(1.123456789012)).toBe('1.12345679');
        expect(roundNumber(42)).toBe('42');
    });

    it('does not format a big number with separators', () => {
        expect(decodeValue('1794312843177').text).toBe('1794312843177');
    });

    it('reads a boolean', () => {
        expect(decodeValue('true').kind).toBe('boolean');
        expect(decodeValue('false').text).toBe('false');
    });

    it('keeps a text as a text', () => {
        const value = decodeValue('ON');
        expect(value.kind).toBe('string');
        expect(value.text).toBe('ON');
    });

    it('reads the literal null as a null value', () => {
        expect(decodeValue('null').kind).toBe('null');
        expect(decodeValue('null').text).toBe('null');
    });

    it('breaks an object down into its entries', () => {
        const value = decodeValue('{"value": 28.92, "ts": 1794312843177}');
        expect(value.kind).toBe('object');
        expect(value.entries).toHaveLength(2);
        expect(value.entries[0]).toMatchObject({
            key: 'value',
            value: '28.92',
            kind: 'number',
            full: '28.92',
        });
        expect(value.entries[1].key).toBe('ts');
        expect(value.entries[1].full).toBe('1794312843177');
        expect(value.text).toBe('value: 28.92, ts: 1794312843177');
    });

    it('formats an object for the tooltip', () => {
        const value = decodeValue('{"a":1}');
        expect(value.pretty).toContain('\n');
        expect(value.pretty).toContain('"a": 1');
    });

    it('reads an array', () => {
        const value = decodeValue('[1, "two", true]');
        expect(value.kind).toBe('array');
        expect(value.entries.map(entry => entry.key)).toEqual(['0', '1', '2']);
        expect(value.entries[1].value).toBe('two');
    });

    it('reads a nested object', () => {
        const value = decodeValue('{"outer": {"inner": 1}}');
        expect(value.entries[0].kind).toBe('object');
        expect(value.entries[0].children).toHaveLength(1);
        expect(value.entries[0].children![0].key).toBe('inner');
    });

    it('keeps a broken JSON as a text', () => {
        const value = decodeValue('{"a":');
        expect(value.kind).toBe('string');
        expect(value.text).toBe('{"a":');
    });

    it('does not read a text that only starts with a brace as JSON', () => {
        expect(decodeValue('{not json}').kind).toBe('string');
    });
});

describe('describeValue', () => {
    it('describes the simple values', () => {
        expect(describeValue(null)).toBe('null');
        expect(describeValue(true)).toBe('true');
        expect(describeValue(1.5)).toBe('1.5');
        expect(describeValue('text')).toBe('text');
    });

    it('describes an empty object', () => {
        expect(describeValue({})).toBe('{}');
    });

    it('puts braces around a nested object', () => {
        expect(describeValue({ id: 7, name: 'Wohnzimmer' })).toBe('{id: 7, name: Wohnzimmer}');
    });
});

describe('kindOf', () => {
    it('finds the kind of every value', () => {
        expect(kindOf(null)).toBe('null');
        expect(kindOf({})).toBe('object');
        expect(kindOf([])).toBe('array');
        expect(kindOf(1)).toBe('number');
        expect(kindOf(true)).toBe('boolean');
        expect(kindOf('a')).toBe('string');
    });
});

describe('shorten', () => {
    it('cuts a long text', () => {
        expect(shorten('abc', 2)).toBe('a…');
        expect(shorten('abc', 5)).toBe('abc');
    });
});
