import type { BrokerSettings, BrokerSummary, ServerMessage, Status, TreeSnapshot } from './types';

/**
 * The prefix of the API.
 *
 * The standalone server serves the API under `/api`. The Home Assistant integration serves
 * the same API under `/api/mqtt_compass` - the panel sets the prefix before the bundle is
 * loaded, so that the same build works in both places.
 */
function apiPrefix(): string {
    const configured = (window as unknown as { MQTT_COMPASS_API?: string }).MQTT_COMPASS_API;
    if (configured) {
        return configured.replace(/\/$/, '');
    }
    return (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');
}

/**
 * The token for the API.
 *
 * The standalone server uses a token from the query string. Inside Home Assistant the UI
 * runs in an iframe, but it has the same origin as the frontend of Home Assistant - so it
 * can read the token of the parent window from the local storage.
 */
function token(): string | null {
    const fromUrl = new URLSearchParams(window.location.search).get('token');
    if (fromUrl) {
        return fromUrl;
    }
    try {
        if (window.parent && window.parent !== window) {
            const raw = window.parent.localStorage.getItem('hassTokens');
            if (raw) {
                const parsed = JSON.parse(raw) as { access_token?: string };
                if (parsed.access_token) {
                    return parsed.access_token;
                }
            }
        }
    } catch {
        /* the parent window is not reachable - no token then */
    }
    return null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type') && init?.body) {
        headers.set('Content-Type', 'application/json');
    }
    const jwt = token();
    if (jwt) {
        headers.set('Authorization', `Bearer ${jwt}`);
    }

    const response = await fetch(`${apiPrefix()}${path}`, { ...init, headers });
    if (!response.ok) {
        let detail = `${response.status} ${response.statusText}`;
        try {
            const body = await response.json();
            if (body?.detail) {
                detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
            }
        } catch {
            /* the answer is not JSON - keep the status text */
        }
        throw new Error(detail);
    }
    // `response.json()` reads the answer as a stream, and a browser delays that in a
    // background tab - with a tree of several megabytes the answer would never arrive.
    // Reading the text first and parsing it afterwards is much faster there.
    const text = await response.text();
    return JSON.parse(text) as T;
}

export const api = {
    /** All the brokers with their status. */
    brokers: () => request<{ brokers: BrokerSummary[] }>('/brokers'),

    /** The settings of one broker. */
    broker: (brokerId: string) => request<{ broker: BrokerSettings }>(`/brokers/${encodeURIComponent(brokerId)}`),

    /** Create a new broker. */
    createBroker: (broker: BrokerSettings) =>
        request<{ ok: boolean; broker: { id: string; name: string } }>('/brokers', {
            method: 'POST',
            body: JSON.stringify(broker),
        }),

    /** Change the settings of a broker. */
    updateBroker: (brokerId: string, broker: BrokerSettings) =>
        request<{ ok: boolean }>(`/brokers/${encodeURIComponent(brokerId)}`, {
            method: 'PUT',
            body: JSON.stringify(broker),
        }),

    /** Remove a broker. */
    deleteBroker: (brokerId: string) =>
        request<{ ok: boolean }>(`/brokers/${encodeURIComponent(brokerId)}`, {
            method: 'DELETE',
        }),

    status: (brokerId: string) => request<Status>(`/brokers/${encodeURIComponent(brokerId)}/status`),

    tree: (brokerId: string, maxValueLength?: number) =>
        request<TreeSnapshot>(
            `/brokers/${encodeURIComponent(brokerId)}/tree${maxValueLength ? `?maxValueLength=${maxValueLength}` : ''}`,
        ),

    /** The complete value of one topic - the tree carries them shortened. */
    value: (brokerId: string, topic: string) =>
        request<{ value: string | null; qos: number; retain: boolean; timestamp: number; size: number }>(
            `/brokers/${encodeURIComponent(brokerId)}/value?topic=${encodeURIComponent(topic)}`,
        ),

    config: (brokerId: string) => request<{ broker: BrokerSettings }>(`/brokers/${encodeURIComponent(brokerId)}`),

    saveConfig: (brokerId: string, broker: BrokerSettings) =>
        request<{ ok: boolean; message: string }>(`/brokers/${encodeURIComponent(brokerId)}`, {
            method: 'PUT',
            body: JSON.stringify(broker),
        }),

    publish: (brokerId: string, topic: string, payload: string | null, qos: number, retain: boolean) =>
        request<{ ok: boolean; message: string }>(`/brokers/${encodeURIComponent(brokerId)}/publish`, {
            method: 'POST',
            body: JSON.stringify({ topic, payload, qos, retain }),
        }),

    /** All changes since the given sequence number - the fallback for the WebSocket. */
    updates: (brokerId: string, since: number) =>
        request<{ sequence: number; changes: any[] }>(
            `/brokers/${encodeURIComponent(brokerId)}/updates?since=${since}`,
        ),
};

/**
 * The WebSocket that pushes the updates of the tree.
 *
 * It reconnects automatically and replays the complete tree after a reconnect, so that the
 * client is never out of sync.
 *
 * If the WebSocket cannot be established - which is the case inside Home Assistant, where
 * the panel runs in an iframe - the connection falls back to polling the REST API. The
 * updates arrive a little later, but the behaviour is the same.
 */
export class LiveConnection {
    private socket: WebSocket | null = null;
    /** The timer for the next reconnect attempt. */
    private reconnectTimer: number | null = null;
    /** The timer that gives the WebSocket a chance to come up. */
    private socketTimer: number | null = null;
    private pollTimer: number | null = null;
    private closed = false;
    private socketOpened = false;
    private sequence = 0;
    /** Set when the WebSocket did not work - then only the polling is used. */
    private polling = false;

    constructor(
        private readonly brokerId: string,
        private readonly onMessage: (message: ServerMessage) => void,
        /** The sequence number that the client already knows. */
        private readonly since = 0,
        private readonly onOpen?: () => void,
        private readonly onClose?: () => void,
    ) {}

    open(): void {
        this.closed = false;
        this.socketOpened = false;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const jwt = token();
        // The tree is fetched over REST - a browser throttles the messages of a background
        // tab. The WebSocket carries only the small changes. `since` tells the server which
        // changes the client already knows, so that nothing is lost in between.
        const url = `${protocol}://${window.location.host}${apiPrefix()}/brokers/${encodeURIComponent(this.brokerId)}/ws?since=${this.since}${
            jwt ? `&token=${jwt}` : ''
        }`;

        let socket: WebSocket;
        try {
            socket = new WebSocket(url);
            this.socket = socket;
        } catch {
            this.startPolling();
            return;
        }

        socket.onopen = () => {
            this.socketOpened = true;
            if (this.socketTimer !== null) {
                window.clearTimeout(this.socketTimer);
                this.socketTimer = null;
            }
            if (this.polling) {
                // The polling works, so the socket is not needed any more.
                socket.close();
                return;
            }
            this.onOpen?.();
        };

        socket.onmessage = event => {
            try {
                this.onMessage(JSON.parse(event.data) as ServerMessage);
            } catch (err) {
                // A broken message must not kill the connection - but it has to be visible.
                console.error('The message could not be processed:', err);
            }
        };

        socket.onclose = () => {
            this.onClose?.();
            if (this.closed || this.polling) {
                return;
            }
            this.reconnectTimer = window.setTimeout(() => this.open(), 2000);
        };

        socket.onerror = () => {
            socket.close();
        };

        // If the socket does not come up, the polling takes over. The flag makes sure that
        // this only happens if the socket really did not open.
        this.socketTimer = window.setTimeout(() => {
            this.socketTimer = null;
            if (!this.socketOpened && !this.closed) {
                socket.close();
                this.startPolling();
            }
        }, 4000);
    }

    /**
     * Ask the server for the changes instead of waiting for the WebSocket.
     *
     * This is the fallback for the panel in Home Assistant, which runs in an iframe and
     * cannot open a WebSocket of its own.
     */
    private startPolling(): void {
        this.polling = true;
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pollTimer !== null) {
            window.clearInterval(this.pollTimer);
        }
        void this.poll(true);
        this.pollTimer = window.setInterval(() => void this.poll(false), 1000);
    }

    private async poll(initial: boolean): Promise<void> {
        try {
            if (initial) {
                // The first round brings the complete tree and the status. The payloads are
                // shortened - a big answer is delayed in a background tab.
                const tree = await api.tree(this.brokerId, 120);
                const status = await api.status(this.brokerId);
                this.sequence = tree.sequence;
                this.onMessage({ type: 'tree', tree, status });
                return;
            }

            const result = await api.updates(this.brokerId, this.sequence);
            this.sequence = result.sequence;
            for (const change of result.changes) {
                if (change.full) {
                    // The log does not reach back that far - the whole tree is needed.
                    const tree = await api.tree(this.brokerId, 120);
                    const status = await api.status(this.brokerId);
                    this.sequence = tree.sequence;
                    this.onMessage({ type: 'tree', tree, status });
                    break;
                }
                if (change.type === 'remove') {
                    this.onMessage({ type: 'remove', topic: change.topic });
                } else {
                    this.onMessage({
                        type: 'value',
                        topic: change.topic,
                        value: change.value.value,
                        qos: change.value.qos,
                        retain: change.value.retain,
                        size: change.value.size,
                        timestamp: change.value.timestamp,
                    });
                }
            }
        } catch {
            /* the next round tries again */
        }
    }

    close(): void {
        this.closed = true;
        if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socketTimer !== null) {
            window.clearTimeout(this.socketTimer);
            this.socketTimer = null;
        }
        if (this.pollTimer !== null) {
            window.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.socket?.close();
        this.socket = null;
    }
}
