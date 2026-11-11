import React from 'react';
import { Box, Button, Divider, MenuItem, TextField } from '@mui/material';
import { THEME_FAMILIES, type ThemeColors } from '../themes';
import { useTranslation } from '../i18n';

export interface ThemeEditorProps {
    /** The colours of the current variant. */
    colors: ThemeColors;
    /** The id of the chosen family. */
    family: string;
    /** Is the dark or the light variant used? */
    mode: 'dark' | 'light';
    /** One colour is changed. */
    onColor: (key: keyof ThemeColors, value: string) => void;
    /** Another family is chosen. */
    onFamily: (family: string) => void;
    /** The variant is switched. */
    onMode: (mode: 'dark' | 'light') => void;
    /** The colours of the current variant are put back. */
    onReset: () => void;
    /** Everything is put back to the start. */
    onResetAll: () => void;
}

/** The colours that can be changed - the key is the name of the colour. */
const EDITABLE: { key: keyof ThemeColors; label: string }[] = [
    { key: 'background', label: 'background' },
    { key: 'surface', label: 'surface' },
    { key: 'header', label: 'header' },
    { key: 'text', label: 'text' },
    { key: 'textMuted', label: 'mutedText' },
    { key: 'accent', label: 'accent' },
    { key: 'onAccent', label: 'onAccent' },
    { key: 'divider', label: 'divider' },
    { key: 'guide', label: 'guide' },
    { key: 'hover', label: 'hover' },
    { key: 'folder', label: 'folder' },
    { key: 'state', label: 'state' },
    { key: 'number', label: 'number' },
    { key: 'boolean', label: 'boolean' },
    { key: 'nullValue', label: 'nullValue' },
    { key: 'scrollbar', label: 'scrollbar' },
    { key: 'online', label: 'online' },
    { key: 'offline', label: 'offline' },
];

/**
 * The part of the settings that changes the colours of the user interface.
 *
 * The family of the colours and the variant are chosen here, and every single colour can
 * be changed. The changes are kept in the browser, so that they survive a restart.
 */
export function ThemeEditor(props: ThemeEditorProps): React.JSX.Element {
    const { colors, family, mode, onColor, onFamily, onMode, onReset, onResetAll } = props;
    const { t } = useTranslation();

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <TextField
                    select
                    size="small"
                    label={t('mqttc_themeFamily')}
                    value={family}
                    onChange={event => onFamily(event.target.value)}
                    sx={{ minWidth: 160 }}
                >
                    {THEME_FAMILIES.map(item => (
                        <MenuItem key={item.id} value={item.id}>
                            {item.name}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    size="small"
                    label={t('mqttc_themeVariant')}
                    value={mode}
                    onChange={event => onMode(event.target.value as 'dark' | 'light')}
                    sx={{ minWidth: 130 }}
                >
                    <MenuItem value="dark">{t('mqttc_darkMode')}</MenuItem>
                    <MenuItem value="light">{t('mqttc_lightMode')}</MenuItem>
                </TextField>

                <Box sx={{ flexGrow: 1 }} />

                <Button size="small" onClick={onReset}>
                    {t('mqttc_resetColors')}
                </Button>
                <Button size="small" color="warning" onClick={onResetAll}>
                    {t('mqttc_resetAll')}
                </Button>
            </Box>

            <Divider sx={{ mb: 1 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 1 }}>
                {EDITABLE.map(item => (
                    <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            component="input"
                            type="color"
                            value={colors[item.key]}
                            onChange={event => onColor(item.key, event.target.value)}
                            sx={{
                                width: 32,
                                height: 26,
                                padding: 0,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                background: 'none',
                                cursor: 'pointer',
                            }}
                        />
                        <TextField
                            size="small"
                            label={t(`mqttc_color_${item.label}`)}
                            value={colors[item.key]}
                            onChange={event => onColor(item.key, event.target.value)}
                            sx={{ flex: 1 }}
                        />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
