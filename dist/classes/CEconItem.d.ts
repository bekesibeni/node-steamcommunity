import type { RawAssetPropertiesEntry } from '../types';
export interface EconItemTag {
    internal_name: string;
    name: string;
    category: string;
    color: string;
    category_name: string;
}
export interface EconItemDescription {
    type: string;
    value: string;
    color?: string;
    app_data?: unknown;
}
export interface AssetProperties {
    paint_seed?: number;
    float_value?: number;
    charm_template?: number | string;
    nametag?: string;
    item_certificate?: string;
    finish_catalog?: number | string;
}
export interface AssetAccessory {
    classid: string;
    sticker_wear?: number;
}
/**
 * Represents a single Steam economy item (asset + description merged).
 * The constructor accepts the raw asset object and description lookup table
 * from the Steam inventory API (v2 endpoint) and merges them together.
 */
export declare class CEconItem {
    id: string;
    assetid?: string;
    currencyid?: string;
    instanceid: string;
    classid: string;
    contextid: string;
    amount: number;
    appid: number;
    is_currency: boolean;
    name?: string;
    market_name?: string;
    market_hash_name?: string;
    market_fee_app?: number;
    tradable: boolean;
    marketable: boolean;
    commodity: boolean;
    market_tradable_restriction: number;
    market_marketable_restriction: number;
    fraudwarnings: string[];
    descriptions: EconItemDescription[];
    owner_descriptions?: EconItemDescription[];
    tags?: EconItemTag[];
    icon_url?: string;
    icon_url_large?: string;
    type?: string;
    background_color?: string;
    owner?: unknown;
    cache_expiration?: string;
    item_expiration?: string;
    actions?: unknown[];
    pos?: number;
    asset_properties: AssetProperties;
    asset_accessories: AssetAccessory[];
    [key: string]: unknown;
    constructor(item: Record<string, unknown>, description?: Record<string, unknown> | null, contextID?: string | number, assetProperties?: RawAssetPropertiesEntry);
    getImageURL(): string;
    getLargeImageURL(): string;
    getTag(category: string): EconItemTag | null;
}
//# sourceMappingURL=CEconItem.d.ts.map