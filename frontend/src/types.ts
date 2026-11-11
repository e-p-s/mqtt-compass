/** The data structures of the backend. */

/** The last value that was seen for one topic. */
export interface ValueInfo {
    value: string | null;
    /** What the payload is: string, number, boolean, null, object or array. */
    kind: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array' | 'empty';
    qos: number;
    retain: boolean;
    timestamp: number;
    firstSeen: number;
    size: number;
    /** The value in the tree was cut - the full one has to be fetched. */
    truncated?: boolean;
}

/** The settings of a broker. */
export interface BrokerSettings {
    id?: string | null;
    name?: string | null;
    host: string;
    port: number;
    username: string | null;
    password: string | null;
    tls: boolean;
    tls_insecure: boolean;
    ca_certs: string | null;
    client_cert: string | null;
    client_key: string | null;
    client_id: string | null;
    keepalive: number;
    protocol: string;
    subscribe: string;
    qos: number;
    connect_timeout: number;
}

/** A broker with its status - the summary that the list in the header shows. */
export interface BrokerSummary {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string | null;
    connected: boolean;
    state: string;
    lastError: string | null;
    topics: number;
    folders: number;
    messageCount: number;
}

/** One node of the topic tree. */
export interface TreeNode {
    name: string;
    path: string;
    value?: ValueInfo;
    children?: TreeNode[];
}

/** The complete tree as it is sent by the backend. */
export interface TreeSnapshot {
    version: number;
    /** The number of the last change - the client uses it for the next poll. */
    sequence: number;
    children: TreeNode[];
}

/** The connection status of the broker. */
export interface Status {
    connected: boolean;
    state: string;
    lastError: string | null;
    lastConnected: number | null;
    broker: BrokerSettings;
    messageCount: number;
    topics: number;
    folders: number;
}

/** The broker settings as they are shown in the UI. */
export interface BrokerSettings {
    host: string;
    port: number;
    username: string | null;
    password: string | null;
    tls: boolean;
    tls_insecure: boolean;
    ca_certs: string | null;
    client_cert: string | null;
    client_key: string | null;
    client_id: string | null;
    keepalive: number;
    protocol: string;
    subscribe: string;
    qos: number;
    connect_timeout: number;
}

/** A message of the WebSocket. */
export type ServerMessage =
    | { type: 'tree'; tree: TreeSnapshot; status: Status }
    | {
          type: 'value';
          topic: string;
          value: string;
          qos: number;
          retain: boolean;
          size: number;
          timestamp: number;
      }
    | { type: 'remove'; topic: string }
    | { type: 'status'; status: Status };
