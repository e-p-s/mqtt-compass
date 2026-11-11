import { describe, expect, it } from 'vitest';
import { isValidTopicFilter } from '../src/tree';

describe('isValidTopicFilter', () => {
    it('accepts an empty filter', () => {
        expect(isValidTopicFilter('')).toBe(true);
    });

    it.each(['#', '+', 'home/#', 'home/+/temp', 'a/b/c'])('accepts %s', filter => {
        expect(isValidTopicFilter(filter)).toBe(true);
    });

    it.each(['a/#/b', 'sport#', 'sport+', '#/a', 'a/b#'])('rejects %s', filter => {
        expect(isValidTopicFilter(filter)).toBe(false);
    });
});
