import React from 'react';
import { Box, Checkbox, Chip, FormControlLabel, IconButton, Input, Tooltip } from '@mui/material';
import { Clear as IconClear } from '@mui/icons-material';
import { IconFilter } from '../icons';
import { isValidTopicFilter, type Filter, type RootTopic } from '../tree';
import { useTranslation } from '../i18n';

export interface FilterBarProps {
    filter: Filter;
    onChange: (filter: Filter) => void;
    /** The number of the topics that are currently visible. */
    count: number;
    total: number;
    /** The top level topics of the broker - they become the quick filters. */
    roots: RootTopic[];
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

/**
 * The bar above the table.
 *
 * It carries the filter (a free text search, an MQTT topic filter and the switches for
 * the payload) and the two buttons that open or close all branches of the tree.
 *
 * The quick filters are built from the broker itself: every top level topic becomes a
 * button, so that one reaches the part of the tree one is interested in with one click.
 */
export function FilterBar(props: FilterBarProps): React.JSX.Element {
    const { filter, onChange, count, total, roots, onExpandAll, onCollapseAll } = props;
    const { t } = useTranslation();

    const selectRoot = (root: string | undefined): void => {
        onChange({ ...filter, root: filter.root === root ? undefined : root });
    };

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1,
                    px: 1,
                    py: 0.5,
                    minHeight: 38,
                }}
            >
                <Tooltip title="Filter">
                    <IconFilter active={!!filter.search || !!filter.topic} style={{ opacity: 0.6 }} />
                </Tooltip>

                <Input
                    size="small"
                    placeholder={t('mqttc_search')}
                    value={filter.search}
                    onChange={event => onChange({ ...filter, search: event.target.value })}
                    sx={{ minWidth: 200, flex: '0 1 260px' }}
                />

                <Input
                    size="small"
                    placeholder={t('mqttc_topicFilter')}
                    value={filter.topic}
                    onChange={event => onChange({ ...filter, topic: event.target.value })}
                    error={!isValidTopicFilter(filter.topic)}
                    sx={{ minWidth: 160, flex: '0 1 220px' }}
                />

                {!isValidTopicFilter(filter.topic) ? (
                    <Tooltip title={t('mqttc_invalidFilterHelp')}>
                        <span style={{ color: '#ff2222c9', whiteSpace: 'nowrap' }}>
                            {t('mqttc_invalidFilter')}
                        </span>
                    </Tooltip>
                ) : null}

                {filter.search || filter.topic ? (
                    <IconButton size="small" onClick={() => onChange({ ...filter, search: '', topic: '' })}>
                        <IconClear fontSize="small" />
                    </IconButton>
                ) : null}

                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={filter.onlyWithValue}
                            onChange={event => onChange({ ...filter, onlyWithValue: event.target.checked })}
                        />
                    }
                    label={t('mqttc_onlyWithValue')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={filter.onlyRetained}
                            onChange={event => onChange({ ...filter, onlyRetained: event.target.checked })}
                        />
                    }
                    label={t('mqttc_onlyRetained')}
                />

                <Tooltip title={t('mqttc_onlyJsonHelp')}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={filter.onlyJson}
                                onChange={event => onChange({ ...filter, onlyJson: event.target.checked })}
                            />
                        }
                        label={t('mqttc_onlyJson')}
                    />
                </Tooltip>

                <Box sx={{ flexGrow: 1 }} />

                <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>
                    {count === total ? t('mqttc_topics', count) : t('mqttc_topicsOf', count, total)}
                </span>

                <Tooltip title={t('mqttc_expandAll')}>
                    <IconButton size="small" aria-label={t('mqttc_expandAll')} onClick={onExpandAll}>
                        <span style={{ fontSize: 18 }}>⊞</span>
                    </IconButton>
                </Tooltip>

                <Tooltip title={t('mqttc_collapseAll')}>
                    <IconButton size="small" aria-label={t('mqttc_collapseAll')} onClick={onCollapseAll}>
                        <span style={{ fontSize: 18 }}>⊟</span>
                    </IconButton>
                </Tooltip>
            </Box>

            {roots.length > 1 ? (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        px: 1,
                        pb: 0.5,
                    }}
                >
                    <Chip
                        label={t('mqttc_all')}
                        size="small"
                        clickable
                        color={filter.root ? 'default' : 'primary'}
                        variant={filter.root ? 'outlined' : 'filled'}
                        onClick={() => onChange({ ...filter, root: undefined })}
                    />
                    {roots.map(root => (
                        <Chip
                            key={root.path}
                            label={`${root.name} (${root.count})`}
                            size="small"
                            clickable
                            color={filter.root === root.path ? 'primary' : 'default'}
                            variant={filter.root === root.path ? 'filled' : 'outlined'}
                            onClick={() => selectRoot(root.path)}
                            title={t('mqttc_onlyBelow', root.path)}
                        />
                    ))}
                </Box>
            ) : null}
        </Box>
    );
}
