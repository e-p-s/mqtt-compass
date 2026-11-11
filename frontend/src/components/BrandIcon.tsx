import React, { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { brandIconUrl, brandOfTopic, brandPageUrl } from '../brands';

export interface BrandIconProps {
    /** The topic of the row. */
    topic: string;
    /** The colour of the symbol. */
    color: string;
}

/**
 * The symbol of the brand that a topic belongs to.
 *
 * The symbol comes from the picture service of simpleicons.org and it links to the page
 * of the brand there. It is only shown for the first level of a topic - below that the
 * brand is already clear from the topic above.
 *
 * If the picture cannot be loaded - the computer has no internet or the brand is unknown -
 * nothing is shown, so that the tree stays clean.
 */
export function BrandIcon(props: BrandIconProps): React.JSX.Element | null {
    const { topic, color } = props;
    const brand = brandOfTopic(topic);
    const [failed, setFailed] = useState(false);

    // Only the first level gets a symbol - the deeper ones would repeat it.
    const isRoot = !topic.includes('/');
    if (!brand || failed || !isRoot) {
        return null;
    }

    return (
        <Tooltip title={`${brand.title} - simpleicons.org`}>
            <Box
                component="a"
                href={brandPageUrl(brand.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginRight: '4px',
                    opacity: 0.85,
                    '&:hover': { opacity: 1 },
                }}
            >
                <Box
                    component="img"
                    src={brandIconUrl(brand.id, color)}
                    alt={brand.title}
                    title={brand.title}
                    onError={() => setFailed(true)}
                    sx={{ width: 14, height: 14, display: 'block' }}
                />
            </Box>
        </Tooltip>
    );
}
