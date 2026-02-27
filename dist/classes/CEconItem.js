"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CEconItem = void 0;
// ─── CEconItem ────────────────────────────────────────────────────────────────
/**
 * Represents a single Steam economy item (asset + description merged).
 * The constructor accepts the raw asset object and description lookup table
 * from the Steam inventory API (v2 endpoint) and merges them together.
 */
class CEconItem {
    // Core IDs — always present after construction
    id;
    assetid;
    currencyid;
    instanceid;
    classid;
    contextid;
    amount;
    appid;
    is_currency;
    // Description fields — present when a description was found
    name;
    market_name;
    market_hash_name;
    market_fee_app;
    tradable;
    marketable;
    commodity;
    market_tradable_restriction;
    market_marketable_restriction;
    fraudwarnings;
    descriptions;
    owner_descriptions;
    tags;
    icon_url;
    icon_url_large;
    type;
    background_color;
    owner;
    cache_expiration;
    item_expiration;
    actions;
    pos;
    // v4 asset properties (CS2 float, paint seed, stickers, etc.)
    asset_properties = {};
    asset_accessories = [];
    constructor(item, description, contextID, assetProperties) {
        // Copy all raw asset fields onto this instance
        for (const key of Object.keys(item)) {
            this[key] = item[key];
        }
        // ── Parse asset_properties (paint seed, float, charm, nametag, cert, finish) ──
        this.asset_properties = {};
        if (assetProperties?.asset_properties && Array.isArray(assetProperties.asset_properties)) {
            for (const p of assetProperties.asset_properties) {
                switch (p.propertyid) {
                    case 1:
                        if (p.int_value !== undefined) {
                            this.asset_properties.paint_seed = parseInt(String(p.int_value), 10);
                        }
                        break;
                    case 2:
                        if (p.float_value !== undefined) {
                            this.asset_properties.float_value = parseFloat(String(p.float_value));
                        }
                        break;
                    case 3:
                        if (p.int_value !== undefined) {
                            this.asset_properties.charm_template = parseInt(String(p.int_value), 10);
                        }
                        else if (p.string_value !== undefined) {
                            this.asset_properties.charm_template = p.string_value;
                        }
                        break;
                    case 5:
                        if (p.string_value !== undefined) {
                            this.asset_properties.nametag = p.string_value;
                        }
                        break;
                    case 6:
                        if (p.string_value !== undefined) {
                            this.asset_properties.item_certificate = p.string_value;
                        }
                        break;
                    case 7:
                        if (p.int_value !== undefined) {
                            this.asset_properties.finish_catalog = parseInt(String(p.int_value), 10);
                        }
                        else if (p.string_value !== undefined) {
                            this.asset_properties.finish_catalog = p.string_value;
                        }
                        break;
                }
            }
        }
        // ── Parse asset_accessories (sticker wear — propertyid 4) ───────────────
        this.asset_accessories = [];
        if (assetProperties?.asset_accessories && Array.isArray(assetProperties.asset_accessories)) {
            for (const acc of assetProperties.asset_accessories) {
                const parsed = { classid: acc.classid };
                if (acc.parent_relationship_properties && Array.isArray(acc.parent_relationship_properties)) {
                    for (const rp of acc.parent_relationship_properties) {
                        if (rp.propertyid === 4 && rp.float_value !== undefined) {
                            parsed.sticker_wear = parseFloat(String(rp.float_value));
                            break;
                        }
                    }
                }
                this.asset_accessories.push(parsed);
            }
        }
        // ── Normalise id / assetid / currencyid ──────────────────────────────────
        const isCurrency = !!(this.is_currency ?? this.currency) ||
            this.currencyid !== undefined;
        if (isCurrency) {
            this.currencyid = this.id = String(this.id ?? this.currencyid ?? '');
        }
        else {
            this.assetid = this.id = String(this.id ?? this.assetid ?? '');
        }
        this.instanceid = String(this.instanceid ?? '0');
        this.amount = parseInt(String(this.amount ?? '0'), 10);
        this.contextid = String(this.contextid ?? (contextID?.toString() ?? ''));
        // ── Merge description ────────────────────────────────────────────────────
        if (description) {
            // description may be a lookup table keyed by "classid_instanceid"
            const key = String(this.classid) + '_' + String(this.instanceid);
            const resolved = description[key] ?? description;
            for (const prop of Object.keys(resolved)) {
                if (!(prop in this) || this[prop] === undefined) {
                    this[prop] = resolved[prop];
                }
            }
        }
        // ── Coerce well-known boolean fields ─────────────────────────────────────
        this.is_currency = isCurrency;
        this.tradable = !!this.tradable;
        this.marketable = !!this.marketable;
        this.commodity = !!this.commodity;
        this.market_tradable_restriction = this.market_tradable_restriction
            ? parseInt(String(this.market_tradable_restriction), 10)
            : 0;
        this.market_marketable_restriction = this.market_marketable_restriction
            ? parseInt(String(this.market_marketable_restriction), 10)
            : 0;
        this.fraudwarnings = this.fraudwarnings ?? [];
        this.descriptions = this.descriptions ?? [];
        if (this.owner && JSON.stringify(this.owner) === '{}') {
            this.owner = null;
        }
        // ── Normalise tag shape (restore old property names) ─────────────────────
        if (this.tags) {
            this.tags = this.tags.map((tag) => ({
                internal_name: String(tag['internal_name'] ?? ''),
                name: String(tag['localized_tag_name'] ?? tag['name'] ?? ''),
                category: String(tag['category'] ?? ''),
                color: String(tag['color'] ?? ''),
                category_name: String(tag['localized_category_name'] ?? tag['category_name'] ?? ''),
            }));
        }
        // ── market_fee_app for Steam Community Market (appid 753, context 6) ─────
        if (this.appid === 753 &&
            this.contextid === '6' &&
            this.market_hash_name) {
            const feeMatch = String(this.market_hash_name).match(/^(\d+)-/);
            if (feeMatch) {
                this.market_fee_app = parseInt(feeMatch[1], 10);
            }
        }
        // ── Restore cache_expiration for CS2 items ────────────────────────────────
        if (this.appid === 730 && this.contextid === '2' && this.owner_descriptions) {
            const tradeDesc = this.owner_descriptions.find((d) => d.value?.indexOf('Tradable/Marketable After ') === 0);
            if (tradeDesc?.value) {
                const date = new Date(tradeDesc.value.substring(26).replace(/[,()]/g, ''));
                if (!isNaN(date.getTime())) {
                    this.cache_expiration = date.toISOString();
                }
            }
        }
        if (this.item_expiration) {
            this.cache_expiration = this.item_expiration;
        }
        if (this.actions === '') {
            this.actions = [];
        }
        // v8 quirk: avoid deleting a property that's already falsy
        if (this.currency) {
            delete this['currency'];
        }
    }
    getImageURL() {
        return `https://steamcommunity-a.akamaihd.net/economy/image/${this.icon_url ?? ''}/`;
    }
    getLargeImageURL() {
        if (!this.icon_url_large) {
            return this.getImageURL();
        }
        return `https://steamcommunity-a.akamaihd.net/economy/image/${this.icon_url_large}/`;
    }
    getTag(category) {
        if (!this.tags) {
            return null;
        }
        return (this.tags.find((t) => t.category === category) ?? null);
    }
}
exports.CEconItem = CEconItem;
//# sourceMappingURL=CEconItem.js.map