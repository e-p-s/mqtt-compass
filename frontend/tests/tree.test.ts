import { describe, expect, it } from 'vitest';
import {
    allBranchKeys,
    countNodes,
    emptyFilter,
    filterTree,
    findNode,
    flatten,
    matchesFilter,
    matchesTopicFilter,
    payloadBranchKey,
    removeTopic,
    rootTopics,
    setValue,
    type Filter,
} from '../src/tree';
import type { TreeNode } from '../src/types';
import { info, kindOfPayload } from './helpers';

describe('matchesTopicFilter', () => {
    it('accepts everything without a filter', () => {
        expect(matchesTopicFilter('home/office/temp', '')).toBe(true);
    });

    it('matches an exact topic', () => {
        expect(matchesTopicFilter('home/office/temp', 'home/office/temp')).toBe(true);
        expect(matchesTopicFilter('home/office/temp', 'home/office')).toBe(false);
    });

    it('matches with a single level', () => {
        expect(matchesTopicFilter('home/office/temp', 'home/+/temp')).toBe(true);
        expect(matchesTopicFilter('home/office/inner/temp', 'home/+/temp')).toBe(false);
    });

    it('matches everything below with a hash', () => {
        expect(matchesTopicFilter('home/office/temp', 'home/#')).toBe(true);
        expect(matchesTopicFilter('home', 'home/#')).toBe(true);
        expect(matchesTopicFilter('other/temp', 'home/#')).toBe(false);
    });

    it('does not match a hash in the middle', () => {
        // A filter like 'a/#/b' is invalid - the MQTT specification allows the multi level
        // wildcard only as the last character, and the the MQTT specification refuses it too.
        expect(matchesTopicFilter('home/office/inner/temp', 'home/#/temp')).toBe(false);
        expect(matchesTopicFilter('home/office/inner/temp', 'home/#/other')).toBe(false);
    });
});

describe('rootTopics', () => {
    it('lists the top level topics with their count', () => {
        const tree: TreeNode[] = [
            {
                name: 'home',
                path: 'home',
                children: [
                    { name: 'temp', path: 'home/temp', value: info('21.5') },
                    { name: 'light', path: 'home/light', value: info('on') },
                ],
            },
            { name: 'garden', path: 'garden', children: [{ name: 'soil', path: 'garden/soil', value: info('40') }] },
        ];
        const roots = rootTopics(tree);
        expect(roots).toHaveLength(2);
        expect(roots[0].name).toBe('home');
        // The two entries below 'home'.
        expect(roots[0].count).toBe(2);
        expect(roots[1].count).toBe(1);
    });

    it('counts a root without children', () => {
        const roots = rootTopics([{ name: 'a', path: 'a', value: info('1') }]);
        expect(roots[0].count).toBe(1);
    });
});

describe('filterTree with a root', () => {
    const tree: TreeNode[] = [
        {
            name: 'home',
            path: 'home',
            children: [{ name: 'temp', path: 'home/temp', value: info('21.5') }],
        },
        {
            name: 'garden',
            path: 'garden',
            children: [{ name: 'soil', path: 'garden/soil', value: info('40') }],
        },
    ];

    it('keeps only the chosen root', () => {
        const filtered = filterTree(tree, { ...emptyFilter, root: 'garden' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('garden');
    });

    it('shows everything without a root', () => {
        expect(filterTree(tree, emptyFilter)).toHaveLength(2);
    });

    it('combines the root with the other filters', () => {
        const filtered = filterTree(tree, { ...emptyFilter, root: 'home', search: 'temp' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('home');
        expect(filtered[0].children).toHaveLength(1);
    });
});

describe('filterTree with onlyJson', () => {
    it('keeps only the topics with an object or an array', () => {
        const tree: TreeNode[] = [
            { name: 'json', path: 'json', value: info('{"a":1}') },
            { name: 'array', path: 'array', value: info('[1,2]') },
            { name: 'text', path: 'text', value: info('ON') },
            { name: 'number', path: 'number', value: info('42') },
        ];
        const filtered = filterTree(tree, { ...emptyFilter, onlyJson: true });
        expect(filtered.map(node => node.name)).toEqual(['json', 'array']);
    });
});

describe('matchesFilter', () => {
    const node: TreeNode = { name: 'temp', path: 'home/temp', value: info('21.5') };

    it('matches without a filter', () => {
        expect(matchesFilter(node, emptyFilter)).toBe(true);
    });

    it('searches in the topic', () => {
        const filter: Filter = { ...emptyFilter, search: 'TEMP' };
        expect(matchesFilter(node, filter)).toBe(true);
    });

    it('searches in the value', () => {
        const filter: Filter = { ...emptyFilter, search: '21' };
        expect(matchesFilter(node, filter)).toBe(true);
    });

    it('finds nothing', () => {
        const filter: Filter = { ...emptyFilter, search: 'nothing' };
        expect(matchesFilter(node, filter)).toBe(false);
    });

    it('filters the topics without a value', () => {
        const filter: Filter = { ...emptyFilter, onlyWithValue: true };
        expect(matchesFilter({ name: 'a', path: 'a' }, filter)).toBe(false);
        expect(matchesFilter(node, filter)).toBe(true);
    });

    it('filters the retained topics', () => {
        const filter: Filter = { ...emptyFilter, onlyRetained: true };
        expect(matchesFilter(node, filter)).toBe(false);
        expect(matchesFilter({ ...node, value: info('x', { retain: true }) }, filter)).toBe(true);
    });
});

describe('filterTree', () => {
    const tree: TreeNode[] = [
        {
            name: 'home',
            path: 'home',
            children: [
                { name: 'temp', path: 'home/temp', value: info('21.5') },
                { name: 'light', path: 'home/light', value: info('on') },
            ],
        },
        { name: 'garden', path: 'garden', children: [{ name: 'soil', path: 'garden/soil', value: info('40') }] },
    ];

    it('returns the tree unchanged without a filter', () => {
        expect(filterTree(tree, emptyFilter)).toBe(tree);
    });

    it('keeps the parents of a matching child', () => {
        const filtered = filterTree(tree, { ...emptyFilter, search: 'temp' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('home');
        expect(filtered[0].children).toHaveLength(1);
        expect(filtered[0].children![0].name).toBe('temp');
    });

    it('removes the branches without a match', () => {
        const filtered = filterTree(tree, { ...emptyFilter, search: 'soil' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('garden');
    });
});

describe('flatten', () => {
    const tree: TreeNode[] = [
        {
            name: 'home',
            path: 'home',
            children: [{ name: 'temp', path: 'home/temp', value: info('21.5') }],
        },
    ];

    it('hides the children of a closed folder', () => {
        const rows = flatten(tree, new Set());
        expect(rows).toHaveLength(1);
        expect(rows[0].hasChildren).toBe(true);
        expect(rows[0].expanded).toBe(false);
    });

    it('shows the children of an open folder', () => {
        const rows = flatten(tree, new Set(['home']));
        expect(rows).toHaveLength(2);
        expect(rows[1].level).toBe(1);
        expect(rows[1].name).toBe('temp');
        expect(rows[1].isPayload).toBe(false);
    });
});

describe('flatten with a payload', () => {
    const tree: TreeNode[] = [
        {
            name: 'moisture',
            path: 'garden/soil/moisture',
            value: info('{"value": 24.94, "ts": 1794312843779}'),
        },
    ];

    it('shows the sub values of the payload when the payload branch is open', () => {
        const rows = flatten(tree, new Set([payloadBranchKey('garden/soil/moisture')]));
        expect(rows).toHaveLength(3);
        expect(rows[0].name).toBe('moisture');
        expect(rows[0].isPayload).toBe(false);
        expect(rows[0].hasPayloadChildren).toBe(true);
        expect(rows[0].hasChildren).toBe(false);
        expect(rows[0].payloadExpanded).toBe(true);
        expect(rows[1].name).toBe('value');
        expect(rows[1].valueText).toBe('24.94');
        expect(rows[1].valueKind).toBe('number');
        expect(rows[1].level).toBe(1);
        expect(rows[1].isPayload).toBe(true);
        expect(rows[2].name).toBe('ts');
        expect(rows[2].valueText).toBe('1794312843779');
    });

    it('hides the sub values of the payload when the payload branch is closed', () => {
        const rows = flatten(tree, new Set());
        expect(rows).toHaveLength(1);
    });

    it('opens the topic children independently of the payload', () => {
        const withChildren: TreeNode[] = [
            {
                name: 'soil',
                path: 'garden/soil',
                children: [tree[0]],
            },
        ];
        const rows = flatten(withChildren, new Set(['garden/soil']));
        expect(rows).toHaveLength(2);
        expect(rows[1].name).toBe('moisture');
        expect(rows[1].hasPayloadChildren).toBe(true);
    });

    it('does not open a simple payload', () => {
        const simple: TreeNode[] = [{ name: 'a', path: 'a', value: info('plain') }];
        const rows = flatten(simple, new Set(['a']));
        expect(rows).toHaveLength(1);
        expect(rows[0].hasChildren).toBe(false);
        expect(rows[0].hasPayloadChildren).toBe(false);
    });

    it('opens a nested object of the payload', () => {
        const nested: TreeNode[] = [
            {
                name: 'a',
                path: 'a',
                value: info('{"sensor": {"id": 7, "name": "Wohnzimmer"}}'),
            },
        ];
        const rows = flatten(nested, new Set([payloadBranchKey('a')]));
        expect(rows).toHaveLength(2);
        expect(rows[1].name).toBe('sensor');
        expect(rows[1].hasChildren).toBe(true);
        expect(rows[1].isPayload).toBe(true);
    });

    it('shows the children of an opened nested object', () => {
        const nested: TreeNode[] = [
            {
                name: 'a',
                path: 'a',
                value: info('{"sensor": {"id": 7, "name": "Wohnzimmer"}}'),
            },
        ];
        const rows = flatten(nested, new Set([payloadBranchKey('a'), payloadBranchKey('a', 'sensor')]));
        expect(rows).toHaveLength(4);
        expect(rows[2].name).toBe('id');
        expect(rows[2].valueText).toBe('7');
        expect(rows[3].name).toBe('name');
        expect(rows[3].valueText).toBe('Wohnzimmer');
    });
});

describe('the kind of a payload', () => {
    it('finds out that a payload is an object', () => {
        expect(kindOfPayload('{"x":1}')).toBe('object');
    });

    it('finds out that a payload is an array', () => {
        expect(kindOfPayload('[1,2]')).toBe('array');
    });

    it('finds out that a payload is a number', () => {
        expect(kindOfPayload('42')).toBe('number');
    });

    it('finds out that a payload is a boolean', () => {
        expect(kindOfPayload('true')).toBe('boolean');
    });

    it('finds out that a payload is a text', () => {
        expect(kindOfPayload('ON')).toBe('string');
    });
});
describe('allBranchKeys', () => {
    it('finds the topics with children', () => {
        const tree: TreeNode[] = [
            {
                name: 'home',
                path: 'home',
                children: [{ name: 'temp', path: 'home/temp', value: info('21.5') }],
            },
        ];
        expect(allBranchKeys(tree)).toEqual(['home']);
    });

    it('does not open the sub values of the payloads', () => {
        const tree: TreeNode[] = [{ name: 'a', path: 'a', value: info('{"x":1}') }];
        expect(allBranchKeys(tree)).toEqual([]);
    });

    it('finds nothing in a flat tree', () => {
        const tree: TreeNode[] = [{ name: 'a', path: 'a', value: info('text') }];
        expect(allBranchKeys(tree)).toEqual([]);
    });
});

describe('setValue', () => {
    it('creates the missing nodes', () => {
        const tree = setValue([], 'home/office/temp', info('21.5'));
        expect(tree).toHaveLength(1);
        expect(tree[0].name).toBe('home');
        expect(tree[0].children![0].name).toBe('office');
        expect(tree[0].children![0].children![0].value!.value).toBe('21.5');
    });

    it('updates an existing topic', () => {
        const tree = setValue([], 'home/temp', info('21.5'));
        const updated = setValue(tree, 'home/temp', info('22.5'));
        expect(updated[0].children![0].value!.value).toBe('22.5');
    });

    it('does not change the other branches', () => {
        const tree = setValue([], 'home/temp', info('21.5'));
        const other = setValue(tree, 'garden/soil', info('40'));
        expect(other[0]).toBe(tree[0]);
        expect(other).toHaveLength(2);
    });
});

describe('removeTopic', () => {
    it('removes a topic', () => {
        const tree = setValue([], 'home/temp', info('21.5'));
        expect(removeTopic(tree, 'home/temp')).toHaveLength(1);
        expect(removeTopic(tree, 'home/temp')[0].children).toBeUndefined();
    });

    it('removes a whole branch', () => {
        const tree = setValue([], 'home/temp', info('21.5'));
        expect(removeTopic(tree, 'home')).toHaveLength(0);
    });

    it('keeps the tree if the topic does not exist', () => {
        const tree = setValue([], 'home/temp', info('21.5'));
        expect(removeTopic(tree, 'nothing')).toHaveLength(1);
    });
});

describe('findNode and countNodes', () => {
    const tree = setValue([], 'home/office/temp', info('21.5'));

    it('finds a node', () => {
        expect(findNode(tree, 'home/office/temp')?.value?.value).toBe('21.5');
        expect(findNode(tree, 'home/nothing')).toBeUndefined();
    });

    it('counts the nodes', () => {
        expect(countNodes(tree)).toEqual({ topics: 1, folders: 2 });
    });
});
