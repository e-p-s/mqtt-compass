import type { ValueInfo } from '../src/types';

/** The kind of a payload, like the server determines it. */
export function kindOfPayload(value: string): ValueInfo['kind'] {
    const text = value.trim();
    if (text.startsWith('{')) {
        return 'object';
    }
    if (text.startsWith('[')) {
        return 'array';
    }
    if (text === 'true' || text === 'false') {
        return 'boolean';
    }
    if (text !== '' && !Number.isNaN(Number(text))) {
        return 'number';
    }
    if (text === 'null') {
        return 'null';
    }
    return 'string';
}

/** A value info for the tests. */
export function info(value: string, extra: Partial<ValueInfo> = {}): ValueInfo {
    return {
        value,
        // The server determines the kind when the message arrives.
        kind: kindOfPayload(value),
        qos: 0,
        retain: false,
        timestamp: 1000,
        firstSeen: 1000,
        size: value.length,
        ...extra,
    };
}
