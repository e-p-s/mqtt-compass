import React, { useEffect, useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    TextField,
} from '@mui/material';
import { useTranslation } from '../i18n';

export interface PublishDialogProps {
    open: boolean;
    /** The topic that is filled in. */
    topic: string;
    onClose: () => void;
    onPublish: (topic: string, payload: string | null, qos: number, retain: boolean) => Promise<void>;
}

/** The dialog that publishes a message to the broker. */
export function PublishDialog(props: PublishDialogProps): React.JSX.Element {
    const { open, topic: initialTopic, onClose, onPublish } = props;
    const { t } = useTranslation();

    const [topic, setTopic] = useState(initialTopic);
    const [payload, setPayload] = useState('');
    const [qos, setQos] = useState(0);
    const [retain, setRetain] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setTopic(initialTopic);
            setError(null);
        }
    }, [open, initialTopic]);

    const publish = async (): Promise<void> => {
        if (!topic) {
            setError(t('mqttc_wildcardsNotAllowed'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onPublish(topic, payload === '' ? null : payload, qos, retain);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t('mqttc_publishDialog')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label={t('mqttc_topic')}
                    value={topic}
                    onChange={event => setTopic(event.target.value)}
                    helperText={t('mqttc_wildcardsNotAllowed')}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    label={t('mqttc_payload')}
                    value={payload}
                    onChange={event => setPayload(event.target.value)}
                    multiline
                    minRows={3}
                    helperText={t('mqttc_emptyPayload')}
                />
                <TextField
                    select
                    margin="dense"
                    label={t('mqttc_qos')}
                    value={qos}
                    onChange={event => setQos(Number(event.target.value))}
                    style={{ width: 200 }}
                >
                    <MenuItem value={0}>{t('mqttc_qos0')}</MenuItem>
                    <MenuItem value={1}>{t('mqttc_qos1')}</MenuItem>
                    <MenuItem value={2}>{t('mqttc_qos2')}</MenuItem>
                </TextField>
                <FormControlLabel
                    control={<Checkbox checked={retain} onChange={event => setRetain(event.target.checked)} />}
                    label={t('mqttc_retain')}
                />
                {error ? (
                    <div style={{ color: '#ff2222c9', marginTop: 8 }}>{error}</div>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('mqttc_cancel')}</Button>
                <Button onClick={publish} disabled={busy} variant="contained">
                    {t('mqttc_publish')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
