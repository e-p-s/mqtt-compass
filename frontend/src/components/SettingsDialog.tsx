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
    MenuItem,
    Tab,
    Tabs,
    TextField,
} from '@mui/material';
import type { BrokerSettings } from '../types';
import type { ThemeColors } from '../themes';
import { useTranslation } from '../i18n';
import { ThemeEditor } from './ThemeEditor';

export interface SettingsDialogProps {
    open: boolean;
    settings: BrokerSettings | null;
    onClose: () => void;
    onSave: (settings: BrokerSettings) => Promise<void>;
    /** The colours of the current theme. */
    colors: ThemeColors;
    /** The id of the chosen family of the colours. */
    family: string;
    /** Is the dark or the light variant used? */
    mode: 'dark' | 'light';
    /** One colour of the theme is changed. */
    onColor: (key: keyof ThemeColors, value: string) => void;
    /** Another family of the colours is chosen. */
    onFamily: (family: string) => void;
    /** The variant of the colours is switched. */
    onMode: (mode: 'dark' | 'light') => void;
    /** The colours of the current variant are put back. */
    onResetColors: () => void;
    /** Everything is put back to the start. */
    onResetAll: () => void;
    /** Are the symbols of the brands shown in the tree? */
    showBrands: boolean;
    /** The symbols of the brands are turned on or off. */
    onShowBrands: (show: boolean) => void;
}

/**
 * The dialog with the settings.
 *
 * The first tab carries the settings of the broker connection, the second one the
 * appearance - the colours of the user interface and the symbols of the brands.
 */
export function SettingsDialog(props: SettingsDialogProps): React.JSX.Element {
    const {
        open,
        settings,
        onClose,
        onSave,
        colors,
        family,
        mode,
        onColor,
        onFamily,
        onMode,
        onResetColors,
        onResetAll,
        showBrands,
        onShowBrands,
    } = props;
    const { t } = useTranslation();

    const [form, setForm] = useState<BrokerSettings | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    /** Which tab is open - the broker or the appearance. */
    const [tab, setTab] = useState(0);

    useEffect(() => {
        if (open && settings) {
            setForm({ ...settings });
            setPassword('');
            setError(null);
        }
    }, [open, settings]);

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

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ pb: 1 }}>{t('mqttc_settings')}</DialogTitle>
            <Tabs value={tab} onChange={(_event, value: number) => setTab(value)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label={t('mqttc_brokerSettings')} />
                <Tab label={t('mqttc_appearance')} />
            </Tabs>

            <DialogContent>
                {tab === 0 ? (
                    <>
                        <TextField
                            autoFocus
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
                        <TextField
                            margin="dense"
                            label={t('mqttc_clientId')}
                            value={form.client_id ?? ''}
                            onChange={event => set('client_id', event.target.value || '')}
                            style={{ width: 240 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox checked={form.tls} onChange={event => set('tls', event.target.checked)} />
                            }
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
                        {error ? <div style={{ color: '#ff2222c9', marginTop: 8 }}>{error}</div> : null}
                    </>
                ) : (
                    <Box sx={{ pt: 1 }}>
                        <ThemeEditor
                            colors={colors}
                            family={family}
                            mode={mode}
                            onColor={onColor}
                            onFamily={onFamily}
                            onMode={onMode}
                            onReset={onResetColors}
                            onResetAll={onResetAll}
                        />
                        <FormControlLabel
                            sx={{ mt: 2 }}
                            control={
                                <Checkbox
                                    checked={showBrands}
                                    onChange={event => onShowBrands(event.target.checked)}
                                />
                            }
                            label={t('mqttc_showBrands')}
                        />
                        <div style={{ opacity: 0.6, fontSize: 12, marginTop: -6 }}>{t('mqttc_showBrandsHelp')}</div>
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                {tab === 0 ? (
                    <>
                        <Button onClick={onClose}>{t('mqttc_cancel')}</Button>
                        <Button onClick={save} disabled={busy} variant="contained">
                            {t('mqttc_saveAndReconnect')}
                        </Button>
                    </>
                ) : (
                    <Button onClick={onClose} variant="contained">
                        {t('mqttc_close')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
