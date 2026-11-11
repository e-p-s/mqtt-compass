import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { IconCopy } from '../icons';
import { copyToClipboard } from '../utils';
import { decodeValueCached, valueColor, type DecodedValue } from '../formatValue';
import type { ThemeColors } from '../themes';
import { useTranslation } from '../i18n';

export interface ValueCellProps {
    /** The raw payload. */
    payload: string | null | undefined;
    /** The colours of the current theme. */
    colors: ThemeColors;
    /** The click opens the dialog with the whole payload. */
    onOpen?: (value: DecodedValue) => void;
    /** The value can be changed - the button to change it appears. */
    onEdit?: () => void;
}

/**
 * The cell with the value of a topic.
 *
 * The payload is decoded first: a JSON object is shown with its entries, so that the sub
 * values become visible. The tooltip shows the whole payload, formatted. On hover two
 * buttons appear: one copies the payload, the other changes it.
 */
export function ValueCell(props: ValueCellProps): React.JSX.Element {
    const { payload, colors, onOpen, onEdit } = props;
    const { t } = useTranslation();

    const value = useMemo(() => decodeValueCached(payload), [payload]);

    if (value.kind === 'empty') {
        return <span style={{ opacity: 0.4 }}>-</span>;
    }

    const isStructured = value.kind === 'object' || value.kind === 'array';
    const color = valueColor(value, colors);

    const content = isStructured ? (
        <Box sx={{ display: 'flex', gap: '6px', overflow: 'hidden', alignItems: 'center' }}>
            {value.entries.slice(0, 4).map((entry, index) => (
                <Box
                    key={`${entry.key}-${index}`}
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '3px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    <span style={{ opacity: 0.6, fontSize: 12 }}>{entry.key}:</span>
                    <span style={{ fontSize: 13 }}>{entry.value}</span>
                </Box>
            ))}
            {value.entries.length > 4 ? (
                <span style={{ opacity: 0.5, fontSize: 12 }}>+{value.entries.length - 4}</span>
            ) : null}
        </Box>
    ) : (
        <span style={{ color }}>{value.text}</span>
    );

    const tooltip = (
        <Box
            sx={{
                maxWidth: 520,
                maxHeight: 320,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'transparent',
            }}
        >
            {value.pretty || value.raw}
        </Box>
    );

    return (
        <Tooltip title={tooltip} enterDelay={400} placement="bottom-start" disableInteractive={false}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    cursor: onOpen ? 'pointer' : 'default',
                    '&:hover .copyButton, &:hover .editButton': { display: 'block' },
                }}
                onClick={event => {
                    if (onOpen) {
                        event.stopPropagation();
                        onOpen(value);
                    }
                }}
            >
                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>
                    {content}
                </Box>
                {onEdit ? (
                    <Tooltip title={t('mqttc_changeValue')}>
                        <Box
                            className="editButton"
                            sx={{ display: 'none', flexShrink: 0, opacity: 0.7, '&:hover': { opacity: 1 } }}
                            onClick={event => {
                                event.stopPropagation();
                                onEdit();
                            }}
                        >
                            ✎
                        </Box>
                    </Tooltip>
                ) : null}
                <Box
                    className="copyButton"
                    sx={{ display: 'none', flexShrink: 0, opacity: 0.7, '&:hover': { opacity: 1 } }}
                    title={t('mqttc_copyValue')}
                >
                    <IconCopy
                        onClick={event => {
                            event.stopPropagation();
                            copyToClipboard(value.raw);
                        }}
                    />
                </Box>
            </Box>
        </Tooltip>
    );
}

/**
 * The input that replaces the value while it is changed.
 *
 * The editor keeps the text on its own and hands it over when the user is done - the
 * value is never taken from a state that could be one update old.
 */
export function ValueEditor(props: {
    value: string;
    /** The user is done - the text is the new value. */
    onCommit: (value: string) => void;
    onCancel: () => void;
}): React.JSX.Element {
    const { value, onCommit, onCancel } = props;
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const done = useRef(false);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const finish = (text: string): void => {
        if (done.current) {
            return;
        }
        done.current = true;
        onCommit(text);
    };

    return (
        <input
            ref={inputRef}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onClick={event => event.stopPropagation()}
            onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                    finish(draft);
                } else if (event.key === 'Escape') {
                    done.current = true;
                    onCancel();
                }
            }}
            onBlur={() => finish(draft)}
            style={{
                width: '100%',
                fontSize: 14,
                fontFamily: 'inherit',
                padding: '1px 4px',
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 2,
                background: 'transparent',
                color: 'inherit',
                outline: 'none',
            }}
        />
    );
}
