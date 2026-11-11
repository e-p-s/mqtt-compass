import { describe, expect, it } from 'vitest';
import { replaceInPayload } from '../src/formatValue';

describe('replaceInPayload', () => {
    it('replaces a value in an object', () => {
        const result = replaceInPayload('{"ip":"10.0.0.23","port":1883}', 'ip', '10.0.0.1');
        expect(result).toBe('{"ip":"10.0.0.1","port":1883}');
    });

    it('keeps the type of a number', () => {
        const result = replaceInPayload('{"port":1883}', 'port', '8883');
        expect(result).toBe('{"port":8883}');
    });

    it('keeps the type of a boolean', () => {
        expect(replaceInPayload('{"ok":true}', 'ok', 'false')).toBe('{"ok":false}');
    });

    it('turns a text into a number when the old value was a number', () => {
        // The text is not a number - it stays a text.
        expect(replaceInPayload('{"port":1883}', 'port', 'abc')).toBe('{"port":"abc"}');
    });

    it('replaces a value in a nested object', () => {
        const result = replaceInPayload('{"sensor":{"id":7,"name":"Wohnzimmer"}}', 'sensor/name', 'Küche');
        expect(result).toBe('{"sensor":{"id":7,"name":"Küche"}}');
    });

    it('replaces a value in an array', () => {
        const result = replaceInPayload('["a","b"]', '1', 'c');
        expect(result).toBe('["a","c"]');
    });

    it('does not change the other values', () => {
        const result = replaceInPayload('{"a":1,"b":2,"c":3}', 'b', '9');
        expect(result).toBe('{"a":1,"b":9,"c":3}');
    });

    it('returns null when the payload is not JSON', () => {
        expect(replaceInPayload('not json', 'ip', '1')).toBeNull();
    });

    it('returns null when the key does not exist', () => {
        expect(replaceInPayload('{"ip":"1"}', 'mac', '2')).toBeNull();
    });

    it('returns null when the payload is a simple value', () => {
        expect(replaceInPayload('42', 'ip', '1')).toBeNull();
    });

    it('returns null when the way to the key does not exist', () => {
        expect(replaceInPayload('{"a":{"b":1}}', 'x/y', '2')).toBeNull();
    });

    it('accepts an empty text', () => {
        expect(replaceInPayload('{"ip":"1"}', 'ip', '')).toBe('{"ip":""}');
    });
});
