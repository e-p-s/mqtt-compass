import React from 'react';

/**
 * The symbols of the user interface.
 *
 * They are drawn the way the material symbols are drawn: a simple shape, no frame, and
 * the size is set by the caller. The arrows of the tree are the ones of a file manager -
 * a right angle for the closed branches, a downwards angle for the open ones.
 */

export interface IconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    /** The click on the symbol. */
    onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
    /** The symbol can be reached with the keyboard. */
    role?: string;
    /** The name of the symbol for the screen reader. */
    title?: string;
}

/** The parts of a symbol that every symbol has. */
interface Drawing extends IconProps {
    children: React.ReactNode;
    /** The shape is filled with the colour instead of being drawn. */
    filled?: boolean;
}

/** Draws one symbol. */
function Draw(props: Drawing): React.JSX.Element {
    const { size = 20, className, style, onClick, role, title, children, filled } = props;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={className}
            style={style}
            onClick={onClick}
            role={role}
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={filled ? 0 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={title ? undefined : 'true'}
            aria-label={title}
        >
            {title ? <title>{title}</title> : null}
            {children}
        </svg>
    );
}

/** The arrow of a closed branch - it points to the right. */
export function IconClosed(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <polyline points="9 18 15 12 9 6" />
        </Draw>
    );
}

/** The arrow of an open branch - it points down. */
export function IconOpen(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <polyline points="6 9 12 15 18 9" />
        </Draw>
    );
}

/** The symbol of a value - a filled circle. */
export function IconState(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props} filled>
            <circle cx="12" cy="12" r="6" />
        </Draw>
    );
}

/** The symbol of a folder. */
export function IconFolder(props: IconProps & { open?: boolean }): React.JSX.Element {
    const { open, ...rest } = props;
    return (
        <Draw {...rest}>
            {open ? (
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H6.5L4 19.2A1 1 0 0 1 3 18.3z" />
            ) : (
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            )}
        </Draw>
    );
}

/** The symbol of the filter - a funnel. */
export function IconFilter(props: IconProps & { active?: boolean }): React.JSX.Element {
    const { active, ...rest } = props;
    return (
        <Draw {...rest} filled={active}>
            <polygon points="3 4 21 4 14 12.5 14 20 10 18 10 12.5" />
        </Draw>
    );
}

/** The symbol of the clipboard - two sheets of paper. */
export function IconCopy(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </Draw>
    );
}

/** The symbol of the light - a sun. */
export function IconSun(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Draw>
    );
}

/** The symbol of the darkness - a moon. */
export function IconMoon(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
        </Draw>
    );
}

/** The symbol of the colours - a painter's palette. */
export function IconPalette(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.6-1.3-.3-.4-.4-.8-.4-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7z" />
            <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="8.5" r="1" fill="currentColor" stroke="none" />
        </Draw>
    );
}

/** The symbol of a link to a page. */
export function IconLink(props: IconProps): React.JSX.Element {
    return (
        <Draw {...props}>
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </Draw>
    );
}
