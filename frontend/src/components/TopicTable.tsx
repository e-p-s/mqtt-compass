import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Divider, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { ContentCopy as IconContentCopy, Publish as IconPublish } from '@mui/icons-material';
import { IconClosed, IconOpen, IconState } from '../icons';
import { copyToClipboard, getStyle, invertColor } from '../utils';
import type { Row } from '../tree';
import type { ColumnFilters, SortColumn, SortState } from '../tree';
import type { DecodedValue } from '../formatValue';
import { replaceInPayload, valueColorForKind } from '../formatValue';
import { useColumnWidths, type ColumnDef } from '../useColumnWidths';
import type { ThemeColors } from '../themes';
import { useTranslation } from '../i18n';
import { BrandIcon } from './BrandIcon';
import { ColumnHeader } from './ColumnHeader';
import { ValueCell, ValueEditor } from './ValueCell';

/** The height of one row - the same value that Compass uses for its object tree. */
const ROW_HEIGHT = 32;
/**
 * The indent of one level in pixels.
 *
 * It has to be bigger than the icon (24 pixels), otherwise the levels overlap and it
 * cannot be told which level a row belongs to.
 */
const ITEM_LEVEL = 26;
/** The size of the icon in the name cell. */
const ICON_SIZE = 24;
/**
 * The extra indent of the sub values of a payload.
 *
 * They are not topics, they belong to the value of a topic - so they lie between the two
 * topic levels.
 */
const PAYLOAD_INDENT = 10;
/** How many rows are rendered above and below the visible area. */
const OVERSCAN = 10;
/** Where the widths of the columns are stored. */
const STORAGE_KEY = 'App.mqttExplorer.columnsWidths';

/** The columns of the table. */
const COLUMNS: ColumnDef[] = [
    { key: 'expand', title: '', width: 24, minWidth: 24 },
    { key: 'name', title: 'Topic', width: 320, minWidth: 120 },
    { key: 'value', title: 'Value', width: 220, minWidth: 80 },
    { key: 'qos', title: 'QoS', width: 50, minWidth: 36 },
    { key: 'retain', title: 'Retain', width: 60, minWidth: 44 },
    { key: 'changed', title: 'Changed', width: 150, minWidth: 90 },
    { key: 'actions', title: '', width: 40, minWidth: 40 },
];

/** The styles of the table. They follow the look of a classic object browser. */
const styles: Record<string, any> = {
    tableDiv: {
        paddingTop: 0,
        paddingLeft: 0,
        width: 'calc(100% - 8px)',
        overflow: 'auto',
        position: 'relative',
        flex: '1 1 0%',
        minHeight: 0,
    },
    headerRow: (colors: ThemeColors) => ({
        paddingLeft: 0,
        height: 38,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        display: 'grid',
        gridTemplateColumns: 'var(--mqtt-cols)',
        width: 'fit-content',
        minWidth: '100%',
        boxSizing: 'border-box',
        backgroundColor: colors.header,
        alignItems: 'center',
    }),
    headerCell: {
        display: 'inline-block',
        verticalAlign: 'top',
        flexShrink: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        position: 'relative',
        padding: '0 8px',
        // The cells of a grid must be allowed to become smaller than their content,
        // otherwise the text would push the column wider.
        minWidth: 0,
    },
    tableRow: (colors: ThemeColors) => ({
        height: ROW_HEIGHT,
        lineHeight: `${ROW_HEIGHT}px`,
        verticalAlign: 'top',
        userSelect: 'none',
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'var(--mqtt-cols)',
        width: 'fit-content',
        minWidth: '100%',
        boxSizing: 'border-box',
        '& > *': {
            flexShrink: 0,
            boxSizing: 'border-box',
            minWidth: 0,
        },
        '&:hover': {
            background: `${colors.hover} !important`,
            color: invertColor(colors.hover, true),
        },
        whiteSpace: 'nowrap',
        flexWrap: 'nowrap',
    }),
    tableRowLines: (colors: ThemeColors) => ({
        borderBottom: `1px solid ${colors.divider}`,
        '& > div': {
            borderRight: `1px solid ${colors.divider}`,
        },
    }),
    itemSelected: (colors: ThemeColors) => ({
        background: `${colors.accent} !important`,
        color: `${colors.onAccent} !important`,
    }),
    cellIdIconFolder: (colors: ThemeColors) => ({
        marginRight: 8,
        width: ROW_HEIGHT - 4,
        height: ROW_HEIGHT - 4,
        cursor: 'pointer',
        color: colors.folder,
        verticalAlign: 'top',
    }),
    /** The expander for the sub values of the payload. */
    cellIdIconPayload: (colors: ThemeColors) => ({
        marginRight: 6,
        width: 16,
        height: 16,
        cursor: 'pointer',
        opacity: 0.7,
        color: colors.textMuted,
        verticalAlign: 'middle',
        display: 'inline-block',
        '&:hover': { opacity: 1 },
    }),
    cellIdIcon: {
        marginRight: 8,
        width: ICON_SIZE,
        height: ICON_SIZE,
        verticalAlign: 'middle',
        display: 'inline-block',
    },
    cellText: {
        display: 'inline-block',
        verticalAlign: 'top',
        fontSize: 14,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    cellSmall: {
        display: 'inline-block',
        verticalAlign: 'top',
        fontSize: 12,
        opacity: 0.8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    spacer: {
        width: 'fit-content',
        minWidth: '100%',
    },
    /** The handle between two columns - the same one as in a classic admin. */
    resizeHandle: {
        display: 'block',
        position: 'absolute',
        cursor: 'col-resize',
        width: 7,
        top: 2,
        bottom: 2,
        right: 0,
        zIndex: 1,
        borderRight: '2px dotted #888',
        '&:hover': {
            borderColor: '#ccc',
            borderRightStyle: 'solid',
        },
    },
};

export interface TopicTableProps {
    rows: Row[];
    /** The colours of the current theme. */
    colors: ThemeColors;
    /** Are the symbols of the brands shown in the tree? */
    showBrands: boolean;
    selected: string | null;
    onSelect: (path: string) => void;
    onToggle: (path: string) => void;
    onPublish: (path: string) => void;
    /** Topics that received a value in the last seconds - they flash. */
    updated: Set<string>;
    /** The click on a value opens the dialog with the whole payload. */
    onOpenValue: (topic: string, value: DecodedValue) => void;
    /** A value was changed and has to be published. */
    onSaveValue: (topic: string, payload: string | null, qos: number, retain: boolean) => Promise<void>;
    /** The message could not be published. */
    onError: (message: string) => void;
    /** The column the table is sorted by. */
    sort: SortState | null;
    onSort: (sort: SortState | null) => void;
    /** The values that are shown per column. */
    filters: ColumnFilters;
    onFilter: (filters: ColumnFilters) => void;
}

/**
 * The table with the topics.
 *
 * The layout follows a classic object tree: a sticky header and rows that
 * are built as a grid. The columns can be resized like in the admin - a handle between
 * two columns changes the width of both of them, a double click sets the widths back.
 *
 * Only the rows that are visible are rendered. The rows above and below are replaced by two
 * spacers, so that the scroll bar keeps its size and the whole tree stays responsive even
 * with thousands of topics.
 */
export function TopicTable(props: TopicTableProps): React.JSX.Element {
    const {
        rows,
        colors,
        showBrands,
        selected,
        onSelect,
        onToggle,
        onPublish,
        updated,
        onOpenValue,
        onSaveValue,
        onError,
        sort,
        onSort,
        filters,
        onFilter,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600);
    /** The row whose value is being changed. */
    const [editing, setEditing] = useState<string | null>(null);
    /** The context menu of a row. */
    const [context, setContext] = useState<{ row: Row; x: number; y: number } | null>(null);

    const { template, startResize, reset } = useColumnWidths(COLUMNS, STORAGE_KEY);
    const { t } = useTranslation();

    /** The values that can be chosen in the filter of a column. */
    const filterValues = useMemo(() => {
        const map: Record<SortColumn, Set<string>> = {
            topic: new Set(),
            value: new Set(),
            qos: new Set(),
            retain: new Set(),
            changed: new Set(),
        };
        for (const row of rows) {
            map.topic.add(row.name);
            map.value.add(row.valueText ?? '');
            map.qos.add(row.qos === undefined ? '' : String(row.qos));
            map.retain.add(row.retain === undefined ? '' : row.retain ? 'yes' : 'no');
        }
        return {
            topic: [...map.topic].sort(),
            value: [...map.value].sort(),
            qos: [...map.qos].sort(),
            retain: [...map.retain].sort(),
            changed: [],
        };
    }, [rows]);

    const sortBy = (column: SortColumn): void => {
        if (sort?.column === column) {
            onSort({ column, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            onSort({ column, direction: 'asc' });
        }
    };

    const setFilter = (column: SortColumn, values: Set<string> | undefined): void => {
        onFilter({ ...filters, [column]: values });
    };

    const copy = (text: string): void => {
        copyToClipboard(text);
        setContext(null);
    };

    /** Publish the changed value. */
    const saveValue = useCallback(
        async (row: Row, text: string) => {
            setEditing(null);
            try {
                if (row.isPayload && row.payloadKeyPath) {
                    // The payload is a JSON object - the key is changed and the whole
                    // payload is published again.
                    const payload = replaceInPayload(row.raw ?? '', row.payloadKeyPath, text);
                    if (payload === null) {
                        onError(
                            `The payload of ${row.topic} is not a JSON object - the value could not be changed.`,
                        );
                        return;
                    }
                    await onSaveValue(row.topic, payload, row.qos ?? 1, row.retain ?? false);
                } else {
                    await onSaveValue(row.topic, text === '' ? null : text, row.qos ?? 1, row.retain ?? false);
                }
            } catch (err) {
                onError(err instanceof Error ? err.message : String(err));
            }
        },
        [onSaveValue, onError],
    );

    // Keep the height of the visible area up to date.
    React.useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const observer = new ResizeObserver(() => setViewportHeight(container.clientHeight));
        observer.observe(container);
        setViewportHeight(container.clientHeight);
        return () => observer.disconnect();
    }, []);

    // The scroll position is only read while scrolling - a re-render of the whole table for
    // every pixel would be too much.
    const frame = useRef<number | null>(null);
    const onScroll = useCallback(() => {
        if (frame.current !== null) {
            return;
        }
        frame.current = window.requestAnimationFrame(() => {
            frame.current = null;
            setScrollTop(containerRef.current?.scrollTop ?? 0);
        });
    }, []);

    React.useEffect(
        () => () => {
            if (frame.current !== null) {
                window.cancelAnimationFrame(frame.current);
            }
        },
        [],
    );

    const headerHeight = 38;
    const first = Math.max(0, Math.floor((scrollTop - headerHeight) / ROW_HEIGHT) - OVERSCAN);
    const last = Math.min(
        rows.length,
        Math.ceil((scrollTop + viewportHeight - headerHeight) / ROW_HEIGHT) + OVERSCAN,
    );

    const topSpacer = first * ROW_HEIGHT;
    const bottomSpacer = Math.max(0, (rows.length - last) * ROW_HEIGHT);

    const headerCells = useMemo(
        () => [
            { key: 'expand', content: '', column: null as SortColumn | null },
            { key: 'name', content: t('mqttc_columnTopic'), column: 'topic' as SortColumn },
            { key: 'value', content: t('mqttc_columnValue'), column: 'value' as SortColumn },
            { key: 'qos', content: t('mqttc_columnQos'), column: 'qos' as SortColumn },
            { key: 'retain', content: t('mqttc_columnRetain'), column: 'retain' as SortColumn },
            { key: 'changed', content: t('mqttc_columnChanged'), column: 'changed' as SortColumn },
            { key: 'actions', content: '', column: null as SortColumn | null },
        ],
        [t],
    );

    return (
        <div style={styles.tableDiv} ref={containerRef} onScroll={onScroll}>
            <div
                style={
                    {
                        ...getStyle(colors, styles.headerRow),
                        '--mqtt-cols': template,
                    } as React.CSSProperties
                }
            >
                {headerCells.map((column, index) => (
                    <div key={column.key} style={styles.headerCell}>
                        {column.column ? (
                            <ColumnHeader
                                column={column.column}
                                title={column.content}
                                sort={sort}
                                filters={filters}
                                values={filterValues[column.column]}
                                onSort={sortBy}
                                onFilter={setFilter}
                                resizeHandle={
                                    /* The first column is the expander - it has no handle. */
                                    index > 0 && index < headerCells.length - 1 ? (
                                        <Tooltip title={t('mqttc_resizeHint')}>
                                            <Box
                                                style={styles.resizeHandle}
                                                onMouseDown={event => startResize(index, event)}
                                                onDoubleClick={event => {
                                                    event.stopPropagation();
                                                    reset();
                                                }}
                                            />
                                        </Tooltip>
                                    ) : null
                                }
                            />
                        ) : (
                            column.content
                        )}
                    </div>
                ))}
            </div>

            {topSpacer > 0 ? <div style={{ ...styles.spacer, height: topSpacer }} /> : null}

            {rows.slice(first, last).map(row => {
                const isSelected = selected === row.topic;
                const isUpdated = updated.has(row.topic);

                return (
                    <div
                        key={row.branchKey}
                        style={
                            {
                                ...getStyle(
                                    colors,
                                    styles.tableRow,
                                    styles.tableRowLines,
                                    isSelected ? styles.itemSelected : undefined,
                                ),
                                '--mqtt-cols': template,
                            } as React.CSSProperties
                        }
                        onClick={() => onSelect(row.topic)}
                        onContextMenu={event => {
                            // The right click opens the menu with the path and the value.
                            event.preventDefault();
                            setContext({ row, x: event.clientX, y: event.clientY });
                        }}
                    >
                        <div style={{ ...styles.headerCell, paddingLeft: 0 }}>
                            {row.hasChildren ? (
                                <Box
                                    component="span"
                                    onClick={event => {
                                        event.stopPropagation();
                                        onToggle(row.branchKey);
                                    }}
                                    sx={getStyle(colors, styles.cellIdIconFolder)}
                                >
                                    {row.expanded ? <IconOpen /> : <IconClosed />}
                                </Box>
                            ) : null}
                        </div>

                        <div
                            style={{
                                ...styles.headerCell,
                                paddingLeft: 8 + row.level * ITEM_LEVEL + (row.isPayload ? PAYLOAD_INDENT : 0),
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                // A line for every level above - like in a file manager. That
                                // makes it visible at a glance in which level a row is.
                                backgroundImage:
                                    row.level > 0
                                        ? `linear-gradient(to right, ${colors.guide} 1px, transparent 1px)`
                                        : undefined,
                                backgroundSize: `${row.level * ITEM_LEVEL}px 100%`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: '8px 0',
                            }}
                        >
                            {/* The symbol of the row: the state icon for a value. */}
                            {row.raw ? (
                                <Box
                                    component="span"
                                    sx={{
                                        ...styles.cellIdIcon,
                                        width: ICON_SIZE,
                                        height: ICON_SIZE,
                                        marginRight: 8,
                                        color: row.isPayload ? colors.textMuted : colors.state,
                                        opacity: row.isPayload ? 0.7 : undefined,
                                    }}
                                >
                                    <IconState />
                                </Box>
                            ) : null}
                            {/* The expander for the sub values of the payload. */}
                            {row.payloadBranchKey ? (
                                <Box
                                    component="span"
                                    role="button"
                                    aria-label={t('mqttc_showValues', row.topic)}
                                    onClick={event => {
                                        event.stopPropagation();
                                        onToggle(row.payloadBranchKey!);
                                    }}
                                    sx={getStyle(colors, styles.cellIdIconPayload)}
                                >
                                    {row.payloadExpanded ? <IconOpen /> : <IconClosed />}
                                </Box>
                            ) : null}
                            <span style={styles.cellText} title={row.path}>
                                {showBrands && !row.isPayload ? (
                                    <BrandIcon topic={row.path} color={colors.textMuted} />
                                ) : null}
                                {row.name === '' ? '(empty)' : row.name}
                            </span>
                            {isUpdated ? (
                                <span className="valueUpdated" style={{ display: 'inline-block', width: 8 }} />
                            ) : null}
                        </div>

                        <div style={{ ...styles.headerCell, padding: '0 8px' }}>
                            {editing === row.branchKey ? (
                                <ValueEditor
                                    value={row.isPayload ? (row.valueText ?? '') : (row.raw ?? '')}
                                    onCommit={text => void saveValue(row, text)}
                                    onCancel={() => setEditing(null)}
                                />
                            ) : row.isPayload ? (
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        width: '100%',
                                        height: '100%',
                                        overflow: 'hidden',
                                        '&:hover .editButton': { display: 'block' },
                                    }}
                                >
                                    <span
                                        style={{
                                            color: valueColorForKind(row.valueKind, colors),
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            flex: '1 1 auto',
                                        }}
                                        title={row.path}
                                        onDoubleClick={event => {
                                            event.stopPropagation();
                                            setEditing(row.branchKey);
                                        }}
                                    >
                                        {row.valueText}
                                    </span>
                                    <Tooltip title={t('mqttc_changeValue')}>
                                        <Box
                                            className="editButton"
                                            sx={{
                                                display: 'none',
                                                flexShrink: 0,
                                                opacity: 0.7,
                                                cursor: 'pointer',
                                                '&:hover': { opacity: 1 },
                                            }}
                                            onClick={event => {
                                                event.stopPropagation();
                                                setEditing(row.branchKey);

                                            }}
                                        >
                                            ✎
                                        </Box>
                                    </Tooltip>
                                </Box>
                            ) : (
                                <ValueCell
                                    payload={row.raw}
                                    colors={colors}
                                    onOpen={value => onOpenValue(row.topic, value)}
                                    onEdit={() => {
                                        setEditing(row.branchKey);

                                    }}
                                />
                            )}
                        </div>

                        <div style={styles.headerCell}>
                            <span style={styles.cellSmall}>{row.isPayload ? '' : (row.qos ?? '')}</span>
                        </div>

                        <div style={styles.headerCell}>
                            <span style={styles.cellSmall}>{row.isPayload ? '' : row.retain ? 'yes' : ''}</span>
                        </div>

                        <div style={styles.headerCell}>
                            <span style={styles.cellSmall}>
                                {row.isPayload || !row.timestamp
                                    ? ''
                                    : new Date(row.timestamp * 1000).toLocaleString()}
                            </span>
                        </div>

                        <div style={{ ...styles.headerCell, padding: '0 8px' }}>
                            {row.isPayload ? null : (
                                <Tooltip title={t('mqttc_publishMessage')}>
                                    <Box
                                        component="span"
                                        role="button"
                                        aria-label={t('mqttc_publishTo', row.topic)}
                                        onClick={event => {
                                            event.stopPropagation();
                                            onPublish(row.topic);
                                        }}
                                        sx={{ cursor: 'pointer', opacity: 0.6, '&:hover': { opacity: 1 } }}
                                    >
                                        ✎
                                    </Box>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                );
            })}

            {bottomSpacer > 0 ? <div style={{ ...styles.spacer, height: bottomSpacer }} /> : null}

            {context ? (
                <Menu
                    open
                    onClose={() => setContext(null)}
                    anchorPosition={{ top: context.y, left: context.x }}
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                >
                    <MenuItem onClick={() => copy(context.row.path)}>
                        <ListItemIcon>
                            <IconContentCopy fontSize="small" />
                        </ListItemIcon>
                        {t('mqttc_copyPath')}
                    </MenuItem>
                    <MenuItem
                        onClick={() => copy(context.row.isPayload ? (context.row.entryRaw ?? '') : (context.row.raw ?? ''))}
                    >
                        <ListItemIcon>
                            <IconContentCopy fontSize="small" />
                        </ListItemIcon>
                        {t('mqttc_copyValue')}
                    </MenuItem>
                    <Divider />
                    <MenuItem
                        onClick={() => {
                            onPublish(context.row.topic);
                            setContext(null);
                        }}
                    >
                        <ListItemIcon>
                            <IconPublish fontSize="small" />
                        </ListItemIcon>
                        {t('mqttc_publishTo', context.row.topic)}
                    </MenuItem>
                </Menu>
            ) : null}
        </div>
    );
}
