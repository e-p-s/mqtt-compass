/**
 * The brands of the tools that are often found in a broker.
 *
 * The topics of some tools have a name that is the same everywhere - the discovery of
 * the home automation, the sensors of a chip, the logs of a container runtime. If the
 * name of the first level of a topic is in this list, the symbol of the brand is shown
 * next to it - and it links to the page of the brand at simpleicons.org.
 *
 * The list is only a suggestion - the user can turn the symbols off.
 */

/** One brand of the list. */
export interface Brand {
    /** The name of the brand - it is also the name of the symbol at simpleicons. */
    id: string;
    /** The name of the brand that is shown in the tooltip. */
    title: string;
    /** The names of the first level of a topic that belong to the brand. */
    topics: string[];
}

/** All the brands that are known. */
export const BRANDS: Brand[] = [
    { id: 'homeassistant', title: 'Home Assistant', topics: ['homeassistant', 'hass', 'ha'] },
    { id: 'tasmota', title: 'Tasmota', topics: ['tasmota'] },
    { id: 'esphome', title: 'ESPHome', topics: ['esphome'] },
    { id: 'shelly', title: 'Shelly', topics: ['shelly'] },
    { id: 'zigbee2mqtt', title: 'Zigbee2MQTT', topics: ['zigbee2mqtt', 'z2m'] },
    { id: 'zigbee', title: 'Zigbee', topics: ['zigbee'] },
    { id: 'philipshue', title: 'Philips Hue', topics: ['hue', 'philips', 'philipshue'] },
    { id: 'openhab', title: 'openHAB', topics: ['openhab'] },
    { id: 'homebridge', title: 'Homebridge', topics: ['homebridge'] },
    { id: 'nodered', title: 'Node-RED', topics: ['nodered', 'node-red'] },
    { id: 'influxdb', title: 'InfluxDB', topics: ['influxdb', 'influx'] },
    { id: 'grafana', title: 'Grafana', topics: ['grafana'] },
    { id: 'tplink', title: 'TP-Link', topics: ['tplink', 'tapo'] },
    { id: 'googlehome', title: 'Google Home', topics: ['googlehome', 'google'] },
    { id: 'sonarr', title: 'Sonarr', topics: ['sonarr'] },
    { id: 'radarr', title: 'Radarr', topics: ['radarr'] },
    { id: 'plex', title: 'Plex', topics: ['plex'] },
    { id: 'portainer', title: 'Portainer', topics: ['portainer'] },
    { id: 'mqtt', title: 'MQTT', topics: ['mqtt'] },
    { id: 'raspberrypi', title: 'Raspberry Pi', topics: ['raspberrypi', 'raspberry'] },
    { id: 'zigbee2mqtt_bridge', title: 'Zigbee2MQTT', topics: ['bridge'] },
    { id: 'docker', title: 'Docker', topics: ['docker'] },
    { id: 'kubernetes', title: 'Kubernetes', topics: ['kubernetes', 'k8s'] },
];

/**
 * The brand of a topic.
 *
 * The function looks at the first level of the topic - the part before the first slash.
 */
export function brandOfTopic(topic: string): Brand | undefined {
    const first = topic.split('/')[0]?.toLowerCase();
    if (!first) {
        return undefined;
    }
    return BRANDS.find(brand => brand.topics.includes(first));
}

/** The address of the symbol of a brand. */
export function brandIconUrl(brandId: string, color: string): string {
    const hex = color.replace('#', '');
    return `https://cdn.simpleicons.org/${brandId}/${hex}`;
}

/** The address of the page of a brand at simpleicons.org. */
export function brandPageUrl(brandId: string): string {
    return `https://simpleicons.org/?q=${brandId}`;
}
