import React from 'react';
import { Box, Menu, MenuItem, Tooltip } from '@mui/material';
import { LANGUAGES, useTranslation, type Language } from '../i18n';

export interface LanguageSelectProps {
    className?: string;
    size?: 'small' | 'medium';
}

/**
 * The flag of a language.
 *
 * The flags are drawn as SVG - an emoji would depend on the font of the system and would
 * look different everywhere.
 */
export function FlagIcon(props: { lang: Language; size?: number }): React.JSX.Element {
    const { lang, size = 18 } = props;

    if (lang === 'de') {
        // Black, red, gold.
        return (
            <svg width={size} height={size} viewBox="0 0 3 2" role="img" aria-label="Deutsch">
                <rect width="3" height="2" fill="#DD0000" />
                <rect width="3" height="0.667" fill="#000000" />
                <rect y="1.333" width="3" height="0.667" fill="#FFCE00" />
            </svg>
        );
    }

    // The Union Jack.
    return (
        <svg width={size} height={size} viewBox="0 0 3 2" role="img" aria-label="English">
            <rect width="3" height="2" fill="#012169" />
            <path d="M0 0 L3 2 M3 0 L0 2" stroke="#FFFFFF" strokeWidth="0.6" />
            <path d="M0 0 L3 2 M3 0 L0 2" stroke="#C8102E" strokeWidth="0.3" />
            <path d="M1.5 0 V2 M0 1 H3" stroke="#FFFFFF" strokeWidth="0.8" />
            <path d="M1.5 0 V2 M0 1 H3" stroke="#C8102E" strokeWidth="0.4" />
        </svg>
    );
}

/**
 * The button that switches the language.
 *
 * It stands next to the theme switch in the header.
 */
export function LanguageSelect(props: LanguageSelectProps): React.JSX.Element {
    const { className, size = 'small' } = props;
    const { lang, setLanguage, t } = useTranslation();

    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

    const open = (event: React.MouseEvent<HTMLElement>): void => setAnchor(event.currentTarget);
    const close = (): void => setAnchor(null);

    return (
        <>
            <Tooltip title={t('mqttc_language')}>
                <Box
                    component="span"
                    className={className}
                    onClick={open}
                    role="button"
                    aria-label={t('mqttc_language')}
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
                    <FlagIcon lang={lang} size={size === 'small' ? 18 : 24} />
                </Box>
            </Tooltip>

            <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
                {LANGUAGES.map(item => (
                    <MenuItem
                        key={item.lang}
                        selected={item.lang === lang}
                        onClick={() => {
                            setLanguage(item.lang);
                            close();
                        }}
                        sx={{ gap: '8px', minWidth: 140 }}
                    >
                        <FlagIcon lang={item.lang} size={20} />
                        {item.title}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
