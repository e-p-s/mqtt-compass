import React, { useMemo, useState } from 'react';
import { Box, Checkbox, Divider, List, ListItem, ListItemButton, ListItemText, Menu, TextField } from '@mui/material';
import { ArrowDownward, ArrowUpward, FilterList } from '@mui/icons-material';
import type { ColumnFilters, SortColumn, SortState } from '../tree';
import { useTranslation } from '../i18n';

export interface ColumnHeaderProps {
    column: SortColumn;
    title: string;
    sort: SortState | null;
    filters: ColumnFilters;
    /** The values that can be chosen in the filter. */
    values: string[];
    onSort: (column: SortColumn) => void;
    onFilter: (column: SortColumn, values: Set<string> | undefined) => void;
    /** The handle that changes the width. */
    resizeHandle?: React.ReactNode;
}

/** How many values the filter shows at most. */
const MAX_VALUES = 200;

/**
 * The header of a column.
 *
 * A click on the title sorts the table by this column, the filter button opens a menu with
 * the values of the column. It looks like the column menu of a data grid.
 */
export function ColumnHeader(props: ColumnHeaderProps): React.JSX.Element {
    const { column, title, sort, filters, values, onSort, onFilter, resizeHandle } = props;
    const { t } = useTranslation();

    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [search, setSearch] = useState('');

    const selected = filters[column];
    const isSorted = sort?.column === column;
    const direction = isSorted && sort.direction === 'desc' ? 'desc' : 'asc';

    const shown = useMemo(() => {
        const needle = search.toLowerCase();
        const list = needle
            ? values.filter(value => value.toLowerCase().includes(needle))
            : values;
        return list.slice(0, MAX_VALUES);
    }, [values, search]);

    const toggle = (value: string): void => {
        const next = new Set(selected ?? []);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        onFilter(column, next.size ? next : undefined);
    };

    const close = (): void => setAnchor(null);

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    height: '100%',
                    cursor: 'pointer',
                    userSelect: 'none',
                    overflow: 'hidden',
                }}
                onClick={() => onSort(column)}
                title={title}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                {isSorted ? (
                    direction === 'asc' ? (
                        <ArrowUpward sx={{ fontSize: 13 }} />
                    ) : (
                        <ArrowDownward sx={{ fontSize: 13 }} />
                    )
                ) : null}
                <Box
                    component="span"
                    role="button"
                    aria-label={t('mqttc_filterColumn', title)}
                    onClick={event => {
                        event.stopPropagation();
                        setAnchor(event.currentTarget);
                    }}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        opacity: selected ? 1 : 0.45,
                        '&:hover': { opacity: 1 },
                    }}
                >
                    <FilterList sx={{ fontSize: 14 }} />
                </Box>
            </Box>

            {resizeHandle}

            <Menu
                anchorEl={anchor}
                open={!!anchor}
                onClose={close}
                slotProps={{ paper: { style: { maxHeight: 420 } } }}
            >
                <Box sx={{ px: 1, pt: 0.5, width: 220 }}>
                    <TextField
                        size="small"
                        fullWidth
                        autoFocus
                        placeholder={t('mqttc_search')}
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                    />
                </Box>
                <Divider />
                <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <ListItem disablePadding>
                        <ListItemButton
                            onClick={() => {
                                const next = new Set(values);
                                onFilter(column, next.size ? next : undefined);
                                setSearch('');
                            }}
                        >
                            <Checkbox size="small" checked={!!selected && selected.size === values.length} />
                            <ListItemText primary={t('mqttc_selectAll')} />
                        </ListItemButton>
                    </ListItem>
                    {shown.map(value => (
                        <ListItem key={value} disablePadding>
                            <ListItemButton onClick={() => toggle(value)}>
                                <Checkbox size="small" checked={selected ? selected.has(value) : true} />
                                <ListItemText primary={value} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                    {shown.length ? null : (
                        <ListItem>
                            <ListItemText primary={t('mqttc_noValues')} />
                        </ListItem>
                    )}
                </List>
                <Divider />
                <Box sx={{ display: 'flex', gap: 1, px: 1, py: 0.5 }}>
                    <ButtonLike label={t('mqttc_clearFilter')} onClick={() => onFilter(column, undefined)} />
                    <ButtonLike label={t('mqttc_apply')} onClick={close} primary />
                </Box>
            </Menu>
        </>
    );
}

/** A small button for the menu. */
function ButtonLike(props: { label: string; onClick: () => void; primary?: boolean }): React.JSX.Element {
    return (
        <Box
            component="button"
            onClick={props.onClick}
            sx={{
                px: 1,
                py: 0.3,
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                color: props.primary ? 'primary.main' : 'text.primary',
                border: '1px solid',
                borderColor: props.primary ? 'primary.main' : 'divider',
                borderRadius: 1,
                background: 'transparent',
            }}
        >
            {props.label}
        </Box>
    );
}
