import type { TreeNode, ValueInfo } from './types';
import { decodeValueCached, type DecodedEntry, type ValueKind } from './formatValue';

/**
 * The separator between the topic and the key of a payload.
 *
 * A topic may contain any character - even a space. The null character cannot occur in a
 * topic, so it cannot make two different branches look the same.
 */
const PAYLOAD_SEPARATOR = '\u0000';

/** The key of the branch with the sub values of a payload. */
export function payloadBranchKey(topic: string, keyPath = ''): string {
    return `${PAYLOAD_SEPARATOR}${topic}${PAYLOAD_SEPARATOR}${keyPath}`;
}

/** The filter that is applied to the tree. */
export interface Filter {
    /** Free text search over the topic and over the value. */
    search: string;
    /** An MQTT topic filter, e.g. `home/#`. */
    topic: string;
    /** Only show topics that have a value. */
    onlyWithValue: boolean;
    /** Only show topics whose last message was sent with the retain flag. */
    onlyRetained: boolean;
    /** Only show the topics whose payload is an object or an array. */
    onlyJson: boolean;
    /** Only show the topics below this root - it comes from the quick filters. */
    root?: string;
    /** The values that are shown per column - they come from the column menus. */
    columns?: ColumnFilters;
}

export const emptyFilter: Filter = {
    search: '',
    topic: '',
    onlyWithValue: false,
    onlyRetained: false,
    onlyJson: false,
    root: undefined,
    columns: undefined,
};

/** One of the roots of the tree - the top level topics of the broker. */
export interface RootTopic {
    name: string;
    path: string;
    /** How many entries are below this root - topics and folders. */
    count: number;
}

/**
 * The roots of the tree.
 *
 * The list is built from the broker itself, so it always shows what is really there -
 * `homeassistant` for the discovery topics, `tele` and `stat` for Tasmota and so on.
 */
export function rootTopics(nodes: TreeNode[]): RootTopic[] {
    return nodes.map(node => {
        const counts = countNodes(node.children?.length ? node.children : [node]);
        return {
            name: node.name,
            path: node.path,
            count: counts.topics + counts.folders,
        };
    });
}

/** One visible row of the tree. */
export interface Row {
    /** The topic the row belongs to. */
    topic: string;
    /** The name in the name column - the topic name or the key of the payload. */
    name: string;
    /** The full path - it is shown in the tooltip. */
    path: string;
    /** The text of the value column. */
    valueText?: string;
    /** The kind of the value - it decides the color. */
    valueKind?: ValueKind;
    /** The raw payload of the topic - for the tooltip and the copy button. */
    raw?: string;
    /** The raw value of this entry - only for a row that is a sub value of a payload. */
    entryRaw?: string;
    qos?: number;
    retain?: boolean;
    timestamp?: number;
    level: number;
    /** The row has topic children - the next topics of the broker. */
    hasChildren: boolean;
    /** The row has sub values in its payload. */
    hasPayloadChildren: boolean;
    /** The topic children are open. */
    expanded: boolean;
    /** The sub values of the payload are open. */
    payloadExpanded: boolean;
    /** The key of the branch with the topic children. */
    branchKey: string;
    /** The key of the branch with the sub values of the payload. */
    payloadBranchKey?: string;
    /** The path to the value inside the payload - it is empty for a topic row. */
    payloadKeyPath?: string;
    /** The row is a sub value of a payload and not a topic of its own. */
    isPayload: boolean;
}

/** The column the table is sorted by. */
export type SortColumn = 'topic' | 'value' | 'qos' | 'retain' | 'changed';

/** The direction of the sorting. */
export type SortDirection = 'asc' | 'desc';

/** The sorting of the table. */
export interface SortState {
    column: SortColumn;
    direction: SortDirection;
}

/** The filter of the columns: the values that are shown. */
export type ColumnFilters = Partial<Record<SortColumn, Set<string>>>;

/**
 * Is the name of a row shown?
 *
 * Some devices send a topic whose name is only dots. Such a row shows nothing and cannot
 * be addressed, so it is left out.
 */
export function isVisibleName(name: string): boolean {
    if (!name || typeof name !== 'string') {
        return false;
    }
    if (/^\.+$/.test(name.trim())) {
        return false;
    }
    return true;
}

/** The text of a column of a row - it is used for the sorting and for the filter. */
export function columnValue(row: Row, column: SortColumn): string {
    switch (column) {
        case 'topic':
            return row.name;
        case 'value':
            return row.valueText ?? '';
        case 'qos':
            return row.qos === undefined ? '' : String(row.qos);
        case 'retain':
            return row.retain === undefined ? '' : row.retain ? 'yes' : 'no';
        case 'changed':
            return row.timestamp === undefined ? '' : String(row.timestamp);
        default:
            return '';
    }
}

/** The text of a column of a topic - for the sorting and for the filter. */
function nodeColumnValue(node: TreeNode, column: SortColumn): string {
    switch (column) {
        case 'value':
            return node.value?.value ?? '';
        case 'qos':
            return node.value?.qos === undefined ? '' : String(node.value.qos);
        case 'retain':
            return node.value?.retain === undefined ? '' : node.value.retain ? 'yes' : 'no';
        case 'changed':
            return node.value?.timestamp === undefined ? '' : String(node.value.timestamp);
        default:
            return node.name;
    }
}

/** Sort the children of a node. */
function sortNodes(nodes: TreeNode[], sort: SortState | null): TreeNode[] {
    if (!sort) {
        return nodes;
    }
    const direction = sort.direction === 'desc' ? -1 : 1;
    return [...nodes].sort((a, b) => {
        const first = nodeColumnValue(a, sort.column);
        const second = nodeColumnValue(b, sort.column);
        if (first === second) {
            return a.name.localeCompare(b.name);
        }
        // Numbers are compared as numbers, everything else as text.
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        if (first !== '' && second !== '' && !Number.isNaN(firstNumber) && !Number.isNaN(secondNumber)) {
            return (firstNumber - secondNumber) * direction;
        }
        return first.localeCompare(second, undefined, { numeric: true }) * direction;
    });
}

/**
 * Keep only the nodes whose value is in the filter of the column.
 *
 * A node has to pass **all** the filters that are set - the filters of the columns work
 * together, they do not replace each other.
 */
function passesFilters(node: TreeNode, filters: ColumnFilters | undefined): boolean {
    if (!filters) {
        return true;
    }
    if (filters.topic && !filters.topic.has(node.name)) {
        return false;
    }
    if (filters.value && !filters.value.has(node.value?.value ?? '')) {
        return false;
    }
    if (filters.qos && !filters.qos.has(node.value?.qos === undefined ? '' : String(node.value.qos))) {
        return false;
    }
    if (filters.retain) {
        const retain = node.value?.retain === undefined ? '' : node.value.retain ? 'yes' : 'no';
        if (!filters.retain.has(retain)) {
            return false;
        }
    }
    return true;
}

/**
 * Is the topic filter a valid MQTT filter?
 *
 * The rules are the ones of the MQTT specification and of the the MQTT specification: `+`
 * must occupy a whole level, and `#` is only allowed as the last level.
 */
export function isValidTopicFilter(topicFilter: string): boolean {
    if (!topicFilter) {
        return true;
    }
    const parts = topicFilter.split('/');
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index];
        if (part.includes('#') && part !== '#') {
            return false;
        }
        if (part.includes('#') && index !== parts.length - 1) {
            return false;
        }
        if (part.includes('+') && part !== '+') {
            return false;
        }
    }
    return true;
}

/** Does the topic match the MQTT topic filter? Supports `+` and `#`. */
export function matchesTopicFilter(topic: string, filter: string): boolean {
    if (!filter) {
        return true;
    }
    const topicParts = topic.split('/');
    const filterParts = filter.split('/');

    let topicIndex = 0;
    for (let filterIndex = 0; filterIndex < filterParts.length; filterIndex++) {
        const part = filterParts[filterIndex];

        if (part === '#') {
            // '#' matches the rest of the topic - but only as the last segment of the
            // filter. A filter like 'a/#/b' is invalid, so it matches nothing.
            return filterIndex === filterParts.length - 1;
        }
        if (topicIndex >= topicParts.length) {
            return false;
        }
        if (part !== '+' && part !== topicParts[topicIndex]) {
            return false;
        }
        topicIndex++;
    }

    return topicIndex === topicParts.length;
}

/** Does the node match the filter? The children are not looked at. */
export function matchesFilter(node: TreeNode, filter: Filter): boolean {
    if (filter.root && node.path !== filter.root && !node.path.startsWith(`${filter.root}/`)) {
        return false;
    }
    if (filter.topic && !matchesTopicFilter(node.path, filter.topic)) {
        return false;
    }
    if (filter.onlyWithValue && !node.value) {
        return false;
    }
    if (filter.onlyRetained && !node.value?.retain) {
        return false;
    }
    if (filter.onlyJson && node.value?.kind !== 'object' && node.value?.kind !== 'array') {
        return false;
    }
    if (filter.search) {
        const needle = filter.search.toLowerCase();
        const inPath = node.path.toLowerCase().includes(needle);
        const inValue = node.value?.value?.toLowerCase().includes(needle) ?? false;
        if (!inPath && !inValue) {
            return false;
        }
    }
    return true;
}

/**
 * Filter the tree.
 *
 * A node is kept when it matches itself or when one of its children matches, so that the
 * path to a matching topic stays visible. The filters of the columns work the same way -
 * a folder stays visible as long as one of its children is in the filter.
 */
export function filterTree(nodes: TreeNode[], filter: Filter): TreeNode[] {
    // The quick filter picks one root - the other ones are not shown at all.
    const list = filter.root
        ? nodes.filter(node => node.path === filter.root || node.path.startsWith(`${filter.root}/`))
        : nodes;

    const columnFilters = filter.columns;
    const hasColumnFilter =
        !!columnFilters &&
        Object.values(columnFilters).some(values => values !== undefined && values.size > 0);

    if (
        !filter.search &&
        !filter.topic &&
        !filter.onlyWithValue &&
        !filter.onlyRetained &&
        !filter.onlyJson &&
        !filter.root &&
        !hasColumnFilter
    ) {
        return list;
    }

    const result: TreeNode[] = [];
    for (const node of list) {
        const children = node.children ? filterTree(node.children, filter) : undefined;
        const selfMatches = matchesFilter(node, filter) && passesFilters(node, columnFilters);
        if (selfMatches || (children && children.length > 0)) {
            result.push({ ...node, children: children?.length ? children : undefined });
        }
    }
    return result;
}

/**
 * Flatten the tree into the list of the rows that are visible.
 *
 * A topic whose payload is an object or an array has the sub values of the payload as
 * children of its own. They are shown below the topic, with the key in the name column -
 * the way a classic admin shows the members of an enum.
 *
 * The two levels have their own branch: the topic children and the sub values of the
 * payload are opened independently, so that opening everything does not explode into
 * thousands of rows.
 */
/**
 * Flatten the tree into the list of the rows that are visible.
 *
 * A topic whose payload is an object or an array has the sub values of the payload as
 * children of its own. They are shown below the topic, with the key in the name column -
 * the way a classic admin shows the members of an enum.
 *
 * The two levels have their own branch: the topic children and the sub values of the
 * payload are opened independently, so that opening everything does not explode into
 * thousands of rows.
 *
 * @param sort The column the siblings are sorted by.
 * @param filters The values that are shown per column.
 */
export function flatten(
    nodes: TreeNode[],
    expanded: Set<string>,
    level = 0,
    sort: SortState | null = null,
    filters: ColumnFilters = {},
): Row[] {
    const rows: Row[] = [];
    for (const node of sortNodes(nodes, sort)) {
        if (!isVisibleName(node.name)) {
            // A row without a name shows nothing - it is left out.
            continue;
        }
        // The kind of the payload is known - the server determined it when the message
        // arrived. So the payload does not have to be decoded here.
        const kind = node.value?.kind;
        const hasTopicChildren = !!node.children && node.children.length > 0;
        const hasPayloadChildren = kind === 'object' || kind === 'array';
        const isExpanded = expanded.has(node.path);
        const payloadKey = payloadBranchKey(node.path);
        const isPayloadExpanded = hasPayloadChildren && expanded.has(payloadKey);

        rows.push({
            topic: node.path,
            name: node.name,
            path: node.path,
            valueText: node.value?.value ?? undefined,
            valueKind: kind,
            raw: node.value?.value ?? undefined,
            qos: node.value?.qos,
            retain: node.value?.retain,
            timestamp: node.value?.timestamp,
            level,
            hasChildren: hasTopicChildren,
            hasPayloadChildren,
            expanded: isExpanded,
            payloadExpanded: isPayloadExpanded,
            branchKey: node.path,
            payloadBranchKey: hasPayloadChildren ? payloadKey : undefined,
            isPayload: false,
        });

        if (hasTopicChildren && isExpanded) {
            rows.push(...flatten(node.children!, expanded, level + 1, sort, filters));
        }
        if (isPayloadExpanded) {
            // Only the topics with an opened payload are decoded - that is rarely more than
            // a handful of them.
            const decoded = decodeValueCached(node.value?.value);
            rows.push(
                ...flattenPayload(
                    node.path,
                    node.value?.value ?? '',
                    decoded.entries,
                    expanded,
                    level + 1,
                    '',
                    node.value?.qos ?? 0,
                    node.value?.retain ?? false,
                    sort,
                    filters,
                ),
            );
        }
    }
    return rows;
}

/** Flatten the sub values of a payload into rows. */
function flattenPayload(
    topic: string,
    raw: string,
    entries: DecodedEntry[],
    expanded: Set<string>,
    level: number,
    prefix: string,
    qos: number,
    retain: boolean,
    sort: SortState | null = null,
    filters: ColumnFilters = {},
): Row[] {
    const rows: Row[] = [];

    // The sub values keep the order of the payload - like a classic admin shows the
    // members of an object. They are only sorted when the user asks for it.
    const sorted =
        sort?.column === 'topic'
            ? [...entries].sort((a, b) => {
                  const direction = sort.direction === 'desc' ? -1 : 1;
                  return a.key.localeCompare(b.key, undefined, { numeric: true }) * direction;
              })
            : entries;

    for (const entry of sorted) {
        if (!isVisibleName(entry.key)) {
            continue;
        }
        const allowed = filters.topic;
        if (allowed && !allowed.has(entry.key)) {
            continue;
        }
        const key = prefix ? `${prefix}/${entry.key}` : entry.key;
        const branchKey = payloadBranchKey(topic, key);
        const hasChildren = !!entry.children && entry.children.length > 0;
        const isExpanded = expanded.has(branchKey);

        rows.push({
            topic,
            name: entry.key,
            // The path of a sub value is the topic and the key - that is what is copied
            // with the context menu.
            path: `${topic}/${key}`,
            valueText: entry.value,
            valueKind: entry.kind,
            // The raw payload of the topic - it is needed to publish the changed payload.
            raw,
            // The raw value of this entry.
            entryRaw: entry.full,
            // The QoS and the retain flag belong to the topic, not to the entry.
            qos,
            retain,
            level,
            hasChildren,
            hasPayloadChildren: false,
            expanded: isExpanded,
            payloadExpanded: false,
            branchKey,
            payloadBranchKey: undefined,
            payloadKeyPath: key,
            isPayload: true,
        });

        if (hasChildren && isExpanded) {
            rows.push(
                ...flattenPayload(topic, raw, entry.children!, expanded, level + 1, key, qos, retain, sort, filters),
            );
        }
    }
    return rows;
}

/**
 * All the topics of the tree that have children.
 *
 * The function returns the keys of the branches that can be opened. The sub values of the
 * payloads are not included - they are opened on demand, otherwise the tree would explode
 * into thousands of rows.
 */
export function allBranchKeys(nodes: TreeNode[]): string[] {
    const keys: string[] = [];
    const walk = (list: TreeNode[]): void => {
        for (const node of list) {
            if (node.children?.length) {
                keys.push(node.path);
                walk(node.children);
            }
        }
    };
    walk(nodes);
    return keys;
}

/** Find a node by its path. */
export function findNode(nodes: TreeNode[], path: string): TreeNode | undefined {
    for (const node of nodes) {
        if (node.path === path) {
            return node;
        }
        if (node.children) {
            const found = findNode(node.children, path);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

/**
 * Set the value of a topic and create the missing nodes on the way.
 *
 * The tree is immutable: the changed branches are copied, everything else keeps its
 * identity, so that React only re-renders the rows that really changed.
 */
export function setValue(nodes: TreeNode[], topic: string, info: ValueInfo): TreeNode[] {
    const segments = topic.split('/');
    return setValueRecursive(nodes, segments, info, 0);
}

function setValueRecursive(nodes: TreeNode[], segments: string[], info: ValueInfo, index: number): TreeNode[] {
    const name = segments[index];
    const path = segments.slice(0, index + 1).join('/');
    const position = nodes.findIndex(node => node.name === name);

    const copy: TreeNode =
        position >= 0
            ? { ...nodes[position] }
            : { name, path, children: [] };

    if (index === segments.length - 1) {
        copy.value = info;
        return position >= 0
            ? [...nodes.slice(0, position), copy, ...nodes.slice(position + 1)]
            : [...nodes, copy];
    }

    const children = copy.children ?? [];
    copy.children = setValueRecursive(children, segments, info, index + 1);
    return position >= 0
        ? [...nodes.slice(0, position), copy, ...nodes.slice(position + 1)]
        : [...nodes, copy];
}

/** Remove a topic (and its subtree) from the tree. */
export function removeTopic(nodes: TreeNode[], topic: string): TreeNode[] {
    const position = nodes.findIndex(node => node.path === topic);
    if (position >= 0) {
        return [...nodes.slice(0, position), ...nodes.slice(position + 1)];
    }
    return nodes.map(node => {
        if (!node.children) {
            return node;
        }
        const children = removeTopic(node.children, topic);
        // A node without children is a leaf - the empty array would show a folder icon.
        return { ...node, children: children.length ? children : undefined };
    });
}

/** Count the topics and the folders of a tree. */
export function countNodes(nodes: TreeNode[]): { topics: number; folders: number } {
    let topics = 0;
    let folders = 0;
    for (const node of nodes) {
        if (node.value) {
            topics++;
        }
        if (node.children?.length) {
            folders++;
            const childCounts = countNodes(node.children);
            topics += childCounts.topics;
            folders += childCounts.folders;
        }
    }
    return { topics, folders };
}
