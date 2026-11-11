import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip } from '@mui/material';
import { IconCopy } from '../icons';
import { copyToClipboard } from '../utils';
import type { DecodedEntry, DecodedValue } from '../formatValue';
import { useTranslation } from '../i18n';
import { api } from '../api';

export interface ValueDialogProps {
    open: boolean;
    value: DecodedValue | null;
    topic: string;
    /** The broker - the full value is fetched from it. */
    brokerId: string | null;
    onClose: () => void;
}

/**
 * The dialog with the whole payload of a topic.
 *
 * The payload is shown twice: as the entries of the object, so that every sub value gets
 * its own line, and as the raw text, so that nothing gets lost.
 */
export function ValueDialog(props: ValueDialogProps): React.JSX.Element {
    const { open, value, topic, brokerId, onClose } = props;
    const { t } = useTranslation();

    // The tree carries the values shortened - the full one is fetched here.
    const [full, setFull] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !brokerId || !topic) {
            setFull(null);
            return;
        }
        let disposed = false;
        api
            .value(brokerId, topic)
            .then(result => {
                if (!disposed) {
                    setFull(result.value);
                }
            })
            .catch(() => {
                /* the shortened value stays */
            });
        return () => {
            disposed = true;
        };
    }, [open, brokerId, topic]);

    const raw = full ?? value?.raw ?? '';

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ wordBreak: 'break-all' }}>{topic}</DialogTitle>
            <DialogContent dividers>
                {value?.entries?.length ? (
                    <Box sx={{ mb: 2 }}>
                        <EntryList entries={value.entries} />
                    </Box>
                ) : null}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <span style={{ opacity: 0.7 }}>{t('mqttc_raw')}</span>
                    <Tooltip title={t('mqttc_copyRaw')}>
                        <span style={{ cursor: 'pointer', display: 'inline-flex' }}>
                            <IconCopy onClick={() => copyToClipboard(raw)} />
                        </span>
                    </Tooltip>
                </Box>
                <Box
                    sx={{
                        fontFamily: 'monospace',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        maxHeight: 300,
                        overflow: 'auto',
                    }}
                >
                    {full ? raw : value?.pretty || value?.raw || ''}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('mqttc_close')}</Button>
            </DialogActions>
        </Dialog>
    );
}

/** The list of the entries of an object or of an array. */
function EntryList(props: { entries: DecodedEntry[] }): React.JSX.Element {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {props.entries.map((entry, index) => (
                <Entry key={`${entry.key}-${index}`} entry={entry} />
            ))}
        </Box>
    );
}

/** One entry of an object or of an array. */
function Entry(props: { entry: DecodedEntry }): React.JSX.Element {
    const { entry } = props;
    const [open, setOpen] = React.useState(false);

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'baseline',
                    px: 1,
                    py: '3px',
                    borderRadius: 1,
                    bgcolor: entry.children?.length ? 'action.hover' : undefined,
                    cursor: entry.children?.length ? 'pointer' : 'default',
                }}
                onClick={() => entry.children?.length && setOpen(!open)}
            >
                <Box
                    sx={{
                        minWidth: 140,
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        opacity: 0.7,
                        fontFamily: 'monospace',
                    }}
                    title={entry.key}
                >
                    {entry.key}
                </Box>
                <Box sx={{ flex: '1 1 auto', fontFamily: 'monospace', wordBreak: 'break-word' }}>{entry.value}</Box>
                <Box sx={{ opacity: 0.5, fontSize: 11 }}>{entry.kind}</Box>
            </Box>
            {open && entry.children?.length ? (
                <Box sx={{ pl: 3, pt: '2px' }}>
                    <EntryList entries={entry.children} />
                </Box>
            ) : null}
        </Box>
    );
}
