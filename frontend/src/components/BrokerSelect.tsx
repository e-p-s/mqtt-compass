import React from 'react';
import { Box, Chip, Menu, MenuItem, Tooltip } from '@mui/material';
import { IconFolder } from '../icons';
import type { BrokerSummary } from '../types';
import { useTranslation } from '../i18n';

export interface BrokerSelectProps {
    brokers: BrokerSummary[];
    /** The id of the broker that is shown. */
    activeId: string | null;
    onSelect: (brokerId: string) => void;
    /** The dialog with the list of the brokers is opened. */
    onManage: () => void;
}

/**
 * The button that switches between the brokers.
 *
 * It stands in the header next to the status LED. The brokers are the ones that the
 * explorer watches - each of them has its own tree.
 */
export function BrokerSelect(props: BrokerSelectProps): React.JSX.Element {
    const { brokers, activeId, onSelect, onManage } = props;
    const { t } = useTranslation();

    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    const active = brokers.find(broker => broker.id === activeId);

    const open = (event: React.MouseEvent<HTMLElement>): void => setAnchor(event.currentTarget);
    const close = (): void => setAnchor(null);

    return (
        <>
            <Tooltip title={t('mqttc_brokers')}>
                <Chip
                    size="small"
                    clickable
                    icon={<IconFolder open={false} />}
                    label={active ? active.name : t('mqttc_noBrokers')}
                    onClick={open}
                    sx={{ mr: 1, maxWidth: 220 }}
                />
            </Tooltip>

            <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
                {brokers.map(broker => (
                    <MenuItem
                        key={broker.id}
                        selected={broker.id === activeId}
                        onClick={() => {
                            onSelect(broker.id);
                            close();
                        }}
                        sx={{ gap: '8px', minWidth: 240 }}
                    >
                        <Box
                            style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: broker.connected ? '#57ff45' : '#f3ad11',
                            }}
                        />
                        <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {broker.name}
                        </span>
                        <span style={{ opacity: 0.6, fontSize: 12 }}>
                            {broker.host}:{broker.port}
                        </span>
                    </MenuItem>
                ))}
                <MenuItem
                    onClick={() => {
                        onManage();
                        close();
                    }}
                    sx={{ gap: '8px' }}
                >
                    <span style={{ opacity: 0.7 }}>⚙</span>
                    {t('mqttc_manageBrokers')}
                </MenuItem>
            </Menu>
        </>
    );
}
