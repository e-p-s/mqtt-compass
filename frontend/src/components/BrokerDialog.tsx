import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    MenuItem,
    TextField,
} from '@mui/material';
import { Delete as IconDelete } from '@mui/icons-material';
import type { BrokerSettings, BrokerSummary } from '../types';
import { useTranslation } from '../i18n';

export interface BrokerDialogProps {
    open: boolean;
    brokers: BrokerSummary[];
    /** The broker that is edited. `null` means a new one is created. */
    editing: BrokerSettings | null;
    onClose: () => void;
    onSave: (settings: BrokerSettings) => Promise<void>;
    onDelete: (brokerId: string) => Promise<void>;
}

/**
 * The dialog with the list of the brokers.
 *
 * A broker can be created, changed and removed. The list shows the state of the connection.
 */
export function BrokerDialog(props: BrokerDialogProps): React.JSX.Element {
    const { open, brokers, editing, onClose, onSave, onDelete } = props;
    const { t } = useTranslation();

    const [form, setForm] = useState<BrokerSettings | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setForm(
                editing
                    ? { ...editing }
                    : {
                          id: null,
                          name: null,
                          host: 'localhost',
                          port: 1883,
                          username: null,
                          password: null,
                          tls: false,
                          tls_insecure: false,
                          ca_certs: null,
                          client_cert: null,
                          client_key: null,
                          client_id: null,
                          keepalive: 60,
                          protocol: '3.1.1',
                          subscribe: '#',
                          qos: 0,
                          connect_timeout: 10,
                      },
            );
            setPassword('');
            setError(null);
            setConfirmDelete(null);
        }
    }, [open, editing]);

    if (!form) {
        return <></>;
    }

    const set = <K extends keyof BrokerSettings>(key: K, value: BrokerSettings[K]): void =>
        setForm({ ...form, [key]: value });

    const save = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            await onSave({ ...form, password: password === '' ? null : password });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const remove = async (brokerId: string): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            await onDelete(brokerId);
            setConfirmDelete(null);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{editing ? t('mqttc_editBroker') : t('mqttc_addBroker')}</DialogTitle>
            <DialogContent>
                {!editing ? (
                    <List dense sx={{ mb: 1, maxHeight: 180, overflow: 'auto' }}>
                        {brokers.map(broker => (
                            <ListItem key={broker.id} disablePadding>
                                <ListItemButton
                                    onClick={() => setForm({ ...form, id: broker.id, name: broker.name })}
                                >
                                    <ListItemText
                                        primary={broker.name}
                                        secondary={`${broker.host}:${broker.port}`}
                                        slotProps={{ primary: { variant: 'body2' } }}
                                    />
                                    <Box
                                        style={{
                                            width: 9,
                                            height: 9,
                                            borderRadius: '50%',
                                            background: broker.connected ? '#57ff45' : '#f3ad11',
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        {brokers.length ? null : (
                            <ListItem>
                                <ListItemText primary={t('mqttc_noBrokers')} />
                            </ListItem>
                        )}
                    </List>
                ) : null}

                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label={t('mqttc_brokerName')}
                    value={form.name ?? ''}
                    onChange={event => set('name', event.target.value || null)}
                    helperText={t('mqttc_brokerNameHelp')}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    label={t('mqttc_host')}
                    value={form.host}
                    onChange={event => set('host', event.target.value)}
                />
                <TextField
                    margin="dense"
                    label={t('mqttc_port')}
                    type="number"
                    value={form.port}
                    onChange={event => set('port', Number(event.target.value))}
                    style={{ width: 120 }}
                />
                <TextField
                    select
                    margin="dense"
                    label={t('mqttc_protocol')}
                    value={form.protocol}
                    onChange={event => set('protocol', event.target.value)}
                    style={{ width: 180 }}
                >
                    <MenuItem value="3.1.1">MQTT 3.1.1</MenuItem>
                    <MenuItem value="5">MQTT 5</MenuItem>
                    <MenuItem value="3.1">MQTT 3.1</MenuItem>
                </TextField>
                <TextField
                    fullWidth
                    margin="dense"
                    label={t('mqttc_userName')}
                    value={form.username ?? ''}
                    onChange={event => set('username', event.target.value || null)}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    label={t('mqttc_password')}
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    helperText={t('mqttc_passwordKeep')}
                />
                <TextField
                    fullWidth
                    margin="dense"
                    label={t('mqttc_topicFilter')}
                    value={form.subscribe}
                    onChange={event => set('subscribe', event.target.value)}
                    helperText={t('mqttc_topicFilterHelp')}
                />
                <TextField
                    select
                    margin="dense"
                    label={t('mqttc_qos')}
                    value={form.qos}
                    onChange={event => set('qos', Number(event.target.value))}
                    style={{ width: 120 }}
                >
                    <MenuItem value={0}>0</MenuItem>
                    <MenuItem value={1}>1</MenuItem>
                    <MenuItem value={2}>2</MenuItem>
                </TextField>
                <FormControlLabel
                    control={<Checkbox checked={form.tls} onChange={event => set('tls', event.target.checked)} />}
                    label={t('mqttc_tls')}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={form.tls_insecure}
                            onChange={event => set('tls_insecure', event.target.checked)}
                        />
                    }
                    label={t('mqttc_tlsInsecure')}
                />

                {confirmDelete ? (
                    <div style={{ marginTop: 12, padding: 8, border: '1px solid', borderColor: 'error.main' }}>
                        <div style={{ marginBottom: 8 }}>{t('mqttc_deleteBrokerConfirm', confirmDelete)}</div>
                        <Button color="error" onClick={() => void remove(confirmDelete)}>
                            {t('mqttc_delete')}
                        </Button>
                        <Button onClick={() => setConfirmDelete(null)}>{t('mqttc_cancel')}</Button>
                    </div>
                ) : editing?.id ? (
                    <IconButton
                        color="error"
                        onClick={() => setConfirmDelete(editing.id!)}
                        sx={{ mt: 1 }}
                        title={t('mqttc_deleteBroker')}
                    >
                        <IconDelete />
                    </IconButton>
                ) : null}

                {error ? <div style={{ color: '#ff2222c9', marginTop: 8 }}>{error}</div> : null}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('mqttc_cancel')}</Button>
                <Button onClick={save} disabled={busy} variant="contained">
                    {t('mqttc_saveAndReconnect')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
