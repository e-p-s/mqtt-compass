import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    IconButton,
    Paper,
    Snackbar,
    Toolbar,
    Tooltip,
    Typography,
} from '@mui/material';
import { StyledEngineProvider, ThemeProvider, type Theme } from '@mui/material/styles';
import { Settings as IconSettings } from '@mui/icons-material';

import { api, LiveConnection } from './api';
import { useCompassTheme } from './theme';
import { countNodes, emptyFilter, filterTree, flatten, removeTopic, setValue, allBranchKeys, rootTopics, type ColumnFilters, type Filter, type SortState } from './tree';
import { useTranslation } from './i18n';
import { decodeValueCached, type DecodedValue } from './formatValue';
import { getStyle } from './utils';
import type { BrokerSettings, BrokerSummary, Status, TreeNode } from './types';
import { BrokerDialog } from './components/BrokerDialog';
import { BrokerSelect } from './components/BrokerSelect';
import { FilterBar } from './components/FilterBar';
import { LanguageSelect } from './components/LanguageSelect';
import { PublishDialog } from './components/PublishDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { ThemeMenu } from './components/ThemeMenu';
import { TopicTable } from './components/TopicTable';
import { ValueDialog } from './components/ValueDialog';

/** How long a changed row flashes. */
const FLASH_TIME = 1500;

const styles: Record<string, any> = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    appBar: (theme: Theme) => ({
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    }),
    /** The space that the fixed app bar occupies. */
    appBarSpacer: {
        flexShrink: 0,
    },
    content: {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        padding: 1,
        paddingTop: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    title: {
        fontSize: 16,
        marginRight: 16,
        whiteSpace: 'nowrap',
    },
    statusLed: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        marginRight: 6,
        display: 'inline-block',
    },
    tableBox: {
        flexGrow: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
    },
};

export function App(): React.JSX.Element {
    const {
        theme,
        colors,
        family,
        mode,
        toggleMode,
        setMode,
        setFamily,
        setColor,
        resetColors,
        resetAll,
    } = useCompassTheme();
    const { t } = useTranslation();

    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [status, setStatus] = useState<Status | null>(null);
    const [brokers, setBrokers] = useState<BrokerSummary[]>([]);
    const [activeBroker, setActiveBroker] = useState<string | null>(null);
    const [brokerSettings, setBrokerSettings] = useState<BrokerSettings | null>(null);
    const [brokerDialog, setBrokerDialog] = useState<{ open: boolean; editing: BrokerSettings | null }>({
        open: false,
        editing: null,
    });
    const [selected, setSelected] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<Filter>(emptyFilter);
    /** The column the table is sorted by. */
    const [sort, setSort] = useState<SortState | null>(null);
    /** The values that are shown per column. */
    const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
    const [updated, setUpdated] = useState<Set<string>>(new Set());
    const [publishTopic, setPublishTopic] = useState<string | null>(null);
    const [valueDialog, setValueDialog] = useState<{ topic: string; value: DecodedValue } | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    /** Are the symbols of the brands shown in the tree? */
    const [showBrands, setShowBrands] = useState<boolean>(() => {
        try {
            return window.localStorage.getItem('Compass.showBrands') === 'true';
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('Compass.showBrands', String(showBrands));
        } catch {
            /* the local storage may not be available */
        }
    }, [showBrands]);

    const flashTimer = useRef<number | null>(null);

    // -- the connection to the backend ------------------------------------------------

    /** The list of the brokers - it is refreshed now and then. */
    const loadBrokers = useCallback(async (): Promise<void> => {
        try {
            const result = await api.brokers();
            setBrokers(result.brokers);
            setActiveBroker(current => {
                if (current && result.brokers.some(broker => broker.id === current)) {
                    return current;
                }
                return result.brokers[0]?.id ?? null;
            });
        } catch {
            setMessage('The backend is not reachable.');
        }
    }, []);

    useEffect(() => {
        void loadBrokers();
        const timer = window.setInterval(() => void loadBrokers(), 5000);
        return () => window.clearInterval(timer);
    }, [loadBrokers]);

    // The WebSocket belongs to the active broker - it is rebuilt when the broker changes.
    useEffect(() => {
        if (!activeBroker) {
            return;
        }

        // A new broker starts with an empty tree.
        setNodes([]);
        setStatus(null);
        setExpanded(new Set());
        setSelected(null);

        let disposed = false;

        // The tree is fetched over REST. A browser throttles the messages of a background
        // tab, and the tree of a big broker is several megabytes. The WebSocket carries
        // only the small changes.
        const start = async (): Promise<void> => {
            let sequence = 0;
            try {
                // The payloads are shortened - the tree of a broker with many topics is
                // several megabytes, and a browser delays a big answer in a background tab.
                const tree = await api.tree(activeBroker, 120);
                if (disposed) {
                    return;
                }
                sequence = tree.sequence;
                setNodes(tree.children);
                const status = await api.status(activeBroker);
                if (!disposed) {
                    setStatus(status);
                }
            } catch (err) {
                // The polling below will fetch the tree.
                console.error('The tree could not be fetched:', err);
            }

            // The WebSocket is opened with the sequence number that the client already
            // knows, so that the changes that happened in between are not lost.
            const connection = new LiveConnection(
                activeBroker,
                message => {
                    if (message.type === 'status') {
                        setStatus(message.status);
                    } else if (message.type === 'value') {
                        setNodes(current =>
                            setValue(current, message.topic, {
                                value: message.value,
                                kind: decodeValueCached(message.value).kind,
                                qos: message.qos,
                                retain: message.retain,
                                timestamp: message.timestamp,
                                firstSeen: message.timestamp,
                                size: message.size,
                            }),
                        );
                        setUpdated(current => new Set(current).add(message.topic));
                    } else if (message.type === 'remove') {
                        setNodes(current => removeTopic(current, message.topic));
                    } else if (message.type === 'tree') {
                        setNodes(message.tree.children);
                        setStatus(message.status);
                    }
                },
                sequence,
                undefined,
                () => setStatus(current => (current ? { ...current, connected: false } : current)),
            );
            connection.open();
            cleanup = () => connection.close();
        };

        let cleanup: (() => void) | null = null;
        void start();

        return () => {
            disposed = true;
            cleanup?.();
        };
    }, [activeBroker]);

    // Remove the flash markers after a while.
    useEffect(() => {
        if (!updated.size) {
            return;
        }
        if (flashTimer.current !== null) {
            window.clearTimeout(flashTimer.current);
        }
        flashTimer.current = window.setTimeout(() => setUpdated(new Set()), FLASH_TIME);
        return () => {
            if (flashTimer.current !== null) {
                window.clearTimeout(flashTimer.current);
                flashTimer.current = null;
            }
        };
    }, [updated]);

    // -- the tree ---------------------------------------------------------------------

    const visibleNodes = useMemo(
        () => filterTree(nodes, { ...filter, columns: columnFilters }),
        [nodes, filter, columnFilters],
    );

    const rows = useMemo(
        () => flatten(visibleNodes, expanded, 0, sort, columnFilters),
        [visibleNodes, expanded, sort, columnFilters],
    );
    const counts = useMemo(() => countNodes(nodes), [nodes]);
    const visibleCounts = useMemo(() => countNodes(visibleNodes), [visibleNodes]);
    /** The top level topics of the broker - they become the quick filters. */
    const roots = useMemo(() => rootTopics(nodes), [nodes]);

    // Open the first level, so that the tree is not a closed box after the start.
    useEffect(() => {
        if (!nodes.length || expanded.size) {
            return;
        }
        setExpanded(new Set(nodes.map(node => node.path)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.length]);
    const toggle = useCallback((path: string) => {
        setExpanded(current => {
            const next = new Set(current);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        setExpanded(new Set(allBranchKeys(visibleNodes)));
    }, [visibleNodes]);

    const collapseAll = useCallback(() => setExpanded(new Set()), []);

    // -- the actions ------------------------------------------------------------------

    const publish = useCallback(
        async (topic: string, payload: string | null, qos: number, retain: boolean): Promise<void> => {
            if (!activeBroker) {
                return;
            }
            const result = await api.publish(activeBroker, topic, payload, qos, retain);
            setMessage(result.message ?? t('mqttc_published', ''));
        },
        [activeBroker, t],
    );

    /** Publish a value that was changed in the tree. */
    const publishValue = useCallback(
        async (topic: string, payload: string | null, qos: number, retain: boolean): Promise<void> => {
            if (!activeBroker) {
                return;
            }
            const result = await api.publish(activeBroker, topic, payload, qos, retain);
            setMessage(result.message ?? t('mqttc_publishedTo', topic));
        },
        [activeBroker, t],
    );

    /** Change the settings of the active broker. */
    const saveSettings = useCallback(
        async (settings: BrokerSettings): Promise<void> => {
            if (!activeBroker) {
                return;
            }
            const result = await api.saveConfig(activeBroker, settings);
            setMessage(result.message ?? t('mqttc_saveAndReconnect'));
            await loadBrokers();
        },
        [activeBroker, loadBrokers, t],
    );

    /** Create or change a broker. */
    const saveBroker = useCallback(
        async (settings: BrokerSettings): Promise<void> => {
            if (settings.id) {
                await api.updateBroker(settings.id, settings);
            } else {
                const result = await api.createBroker(settings);
                setActiveBroker(result.broker.id);
            }
            await loadBrokers();
        },
        [loadBrokers],
    );

    /** Remove a broker. */
    const deleteBroker = useCallback(
        async (brokerId: string): Promise<void> => {
            await api.deleteBroker(brokerId);
            if (activeBroker === brokerId) {
                setActiveBroker(null);
            }
            await loadBrokers();
        },
        [activeBroker, loadBrokers],
    );

    useEffect(() => {
        if (!activeBroker) {
            setBrokerSettings(null);
            return;
        }
        api
            .config(activeBroker)
            .then(config => setBrokerSettings(config.broker))
            .catch(() => setBrokerSettings(null));
    }, [activeBroker]);

    // -- the rendering ----------------------------------------------------------------

    const connected = status?.connected ?? false;

    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Paper elevation={0} style={{ ...styles.root, background: colors.background }}>
                    <AppBar
                        color="default"
                        position="fixed"
                        sx={{
                            ...getStyle(theme, styles.appBar),
                            background: colors.header,
                            color: colors.text,
                        }}
                    >
                        <Toolbar variant="dense" style={{ minHeight: 48 }}>
                            <Typography variant="h6" style={styles.title}>
                                MQTT Compass
                            </Typography>

                            <Tooltip title={connected ? t('mqttc_connected') : t('mqttc_notConnected')}>
                                <Box
                                    style={{
                                        ...styles.statusLed,
                                        background: connected ? colors.online : colors.offline,
                                    }}
                                />
                            </Tooltip>
                            <Typography variant="body2" style={{ opacity: 0.7 }}>
                                {status
                                    ? `${status.broker.host}:${status.broker.port} - ${t('mqttc_topics', counts.topics)}`
                                    : t('mqttc_connecting')}
                            </Typography>

                            <Box sx={{ flexGrow: 1 }} />

                            <BrokerSelect
                                brokers={brokers}
                                activeId={activeBroker}
                                onSelect={setActiveBroker}
                                onManage={() => setBrokerDialog({ open: true, editing: null })}
                            />

                            <LanguageSelect />

                            <ThemeMenu
                                family={family}
                                mode={mode}
                                onFamily={setFamily}
                                onToggleMode={toggleMode}
                            />

                            <Tooltip title={t('mqttc_settings')}>
                                <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                                    <IconSettings fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Toolbar>
                    </AppBar>

                    {/* The app bar is fixed, so it needs a placeholder in the flow. */}
                    <Box style={{ ...styles.appBarSpacer, height: 48 }} />

                    <Box style={styles.content}>
                        <Box style={styles.tableBox}>
                            <FilterBar
                                filter={filter}
                                onChange={setFilter}
                                count={visibleCounts.topics}
                                total={counts.topics}
                                roots={roots}
                                onExpandAll={expandAll}
                                onCollapseAll={collapseAll}
                            />
                            <TopicTable
                                rows={rows}
                                colors={colors}
                                showBrands={showBrands}
                                selected={selected}
                                onSelect={setSelected}
                                onToggle={toggle}
                                onPublish={setPublishTopic}
                                updated={updated}
                                onOpenValue={(topic, value) => setValueDialog({ topic, value })}
                                onSaveValue={publishValue}
                                onError={setMessage}
                                sort={sort}
                                onSort={setSort}
                                filters={columnFilters}
                                onFilter={setColumnFilters}
                            />
                        </Box>
                    </Box>

                    <ValueDialog
                        open={valueDialog !== null}
                        topic={valueDialog?.topic ?? ''}
                        value={valueDialog?.value ?? null}
                        brokerId={activeBroker}
                        onClose={() => setValueDialog(null)}
                    />

                    <PublishDialog
                        open={publishTopic !== null}
                        topic={publishTopic ?? ''}
                        onClose={() => setPublishTopic(null)}
                        onPublish={publish}
                    />

                    <SettingsDialog
                        open={settingsOpen}
                        settings={brokerSettings}
                        onClose={() => setSettingsOpen(false)}
                        onSave={saveSettings}
                        colors={colors}
                        family={family}
                        mode={mode}
                        onColor={setColor}
                        onFamily={setFamily}
                        onMode={setMode}
                        onResetColors={resetColors}
                        onResetAll={resetAll}
                        showBrands={showBrands}
                        onShowBrands={setShowBrands}
                    />

                    <BrokerDialog
                        open={brokerDialog.open}
                        brokers={brokers}
                        editing={brokerDialog.editing}
                        onClose={() => setBrokerDialog({ open: false, editing: null })}
                        onSave={saveBroker}
                        onDelete={deleteBroker}
                    />

                    <Snackbar
                        open={message !== null}
                        autoHideDuration={4000}
                        onClose={() => setMessage(null)}
                        message={message ?? ''}
                    />
                </Paper>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
