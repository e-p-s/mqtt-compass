import { describe, expect, it } from 'vitest';
import { BRANDS, brandIconUrl, brandOfTopic, brandPageUrl } from '../src/brands';

describe('brandOfTopic', () => {
    it('finds the brand of a well known topic', () => {
        expect(brandOfTopic('homeassistant')?.id).toBe('homeassistant');
        expect(brandOfTopic('homeassistant/sensor/temperature')?.id).toBe('homeassistant');
        expect(brandOfTopic('tasmota')?.id).toBe('tasmota');
        expect(brandOfTopic('esphome')?.id).toBe('esphome');
    });

    it('does not care about the case', () => {
        expect(brandOfTopic('HomeAssistant')?.id).toBe('homeassistant');
        expect(brandOfTopic('TASMOTA')?.id).toBe('tasmota');
    });

    it('knows several names for the same brand', () => {
        expect(brandOfTopic('hass')?.id).toBe('homeassistant');
        expect(brandOfTopic('z2m')?.id).toBe('zigbee2mqtt');
    });

    it('gives nothing for an unknown topic', () => {
        expect(brandOfTopic('mein/ eigener/topic')).toBeUndefined();
        expect(brandOfTopic('')).toBeUndefined();
    });

    it('does not match a name that is only a part of the topic', () => {
        // "homeassistant" is a brand, "homeassistant2" is not.
        expect(brandOfTopic('homeassistant2')).toBeUndefined();
    });
});

describe('the addresses of the symbols', () => {
    it('takes the colour of the theme', () => {
        expect(brandIconUrl('homeassistant', '#ff0000')).toBe(
            'https://cdn.simpleicons.org/homeassistant/ff0000',
        );
    });

    it('links to the page of the brand', () => {
        expect(brandPageUrl('tasmota')).toBe('https://simpleicons.org/?q=tasmota');
    });
});

describe('the list of the brands', () => {
    it('has no brand twice', () => {
        const ids = BRANDS.map(brand => brand.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('has no topic name twice', () => {
        const topics = BRANDS.flatMap(brand => brand.topics);
        expect(new Set(topics).size).toBe(topics.length);
    });

    it('gives every brand a title and at least one topic', () => {
        for (const brand of BRANDS) {
            expect(brand.title.length).toBeGreaterThan(0);
            expect(brand.topics.length).toBeGreaterThan(0);
        }
    });

    it('uses only lower case names', () => {
        for (const brand of BRANDS) {
            for (const topic of brand.topics) {
                expect(topic).toBe(topic.toLowerCase());
            }
        }
    });
});
