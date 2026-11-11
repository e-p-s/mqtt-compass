import React, { useState } from 'react';
import { Box, Divider, Menu, MenuItem, Tooltip } from '@mui/material';
import { IconMoon, IconPalette, IconSun } from '../icons';
import { THEME_FAMILIES } from '../themes';
import { useTranslation } from '../i18n';

export interface ThemeMenuProps {
    /** The id of the chosen family. */
    family: string;
    /** Is the dark or the light variant used? */
    mode: 'dark' | 'light';
    /** Another family is chosen. */
    onFamily: (family: string) => void;
    /** The variant is switched. */
    onToggleMode: () => void;
}

/**
 * The button that changes the colours of the user interface.
 *
 * It opens a menu with the families of the colours. The families are named after the
 * impression they make - the dark one of the blue family is the blue of the old terminal,
 * the light one is the paper of a worksheet.
 */
export function ThemeMenu(props: ThemeMenuProps): React.JSX.Element {
    const { family, mode, onFamily, onToggleMode } = props;
    const { t } = useTranslation();

    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const open = (event: React.MouseEvent<HTMLElement>): void => setAnchor(event.currentTarget);
    const close = (): void => setAnchor(null);

    return (
        <>
            <Tooltip title={t('mqttc_theme')}>
                <Box
                    component="span"
                    role="button"
                    aria-label={t('mqttc_theme')}
                    onClick={open}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderRadius: 1,
                        p: '2px',
                        opacity: 0.8,
                        '&:hover': { opacity: 1, bgcolor: 'action.hover' },
                    }}
                >
                    <IconPalette size={18} />
                </Box>
            </Tooltip>

            <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
                <MenuItem
                    onClick={() => {
                        onToggleMode();
                        close();
                    }}
                    sx={{ gap: '8px', minWidth: 200 }}
                >
                    {mode === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                    {mode === 'dark' ? t('mqttc_lightMode') : t('mqttc_darkMode')}
                </MenuItem>
                <Divider />
                {THEME_FAMILIES.map(item => (
                    <MenuItem
                        key={item.id}
                        selected={item.id === family}
                        onClick={() => {
                            onFamily(item.id);
                            close();
                        }}
                        sx={{ gap: '8px', minWidth: 200 }}
                    >
                        {/* The two colours of the family show what it looks like. */}
                        <Box sx={{ display: 'flex', gap: '2px' }}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: item.dark.accent,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            />
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: item.light.accent,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            />
                        </Box>
                        {item.name}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
