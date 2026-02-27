import type { RawAssetPropertiesEntry } from '../types';

// ─── Tag shape ────────────────────────────────────────────────────────────────

export interface EconItemTag {
	internal_name: string;
	name: string;
	category: string;
	color: string;
	category_name: string;
}

// ─── Description line shape ───────────────────────────────────────────────────

export interface EconItemDescription {
	type: string;
	value: string;
	color?: string;
	app_data?: unknown;
}

// ─── Asset properties (CS2 / new inventory endpoint) ─────────────────────────

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

// ─── CEconItem ────────────────────────────────────────────────────────────────

/**
 * Represents a single Steam economy item (asset + description merged).
 * The constructor accepts the raw asset object and description lookup table
 * from the Steam inventory API (v2 endpoint) and merges them together.
 */
export class CEconItem {
	// Core IDs — always present after construction
	id!: string;
	assetid?: string;
	currencyid?: string;
	instanceid!: string;
	classid!: string;
	contextid!: string;
	amount!: number;
	appid!: number;
	is_currency!: boolean;

	// Description fields — present when a description was found
	name?: string;
	market_name?: string;
	market_hash_name?: string;
	market_fee_app?: number;
	tradable!: boolean;
	marketable!: boolean;
	commodity!: boolean;
	market_tradable_restriction!: number;
	market_marketable_restriction!: number;
	fraudwarnings!: string[];
	descriptions!: EconItemDescription[];
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

	// v4 asset properties (CS2 float, paint seed, stickers, etc.)
	asset_properties: AssetProperties = {};
	asset_accessories: AssetAccessory[] = [];

	// Allow any additional Steam API fields without compile errors
	[key: string]: unknown;

	constructor(
		item: Record<string, unknown>,
		description?: Record<string, unknown> | null,
		contextID?: string | number,
		assetProperties?: RawAssetPropertiesEntry,
	) {
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
						} else if (p.string_value !== undefined) {
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
						} else if (p.string_value !== undefined) {
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
				const parsed: AssetAccessory = { classid: acc.classid };
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
		const isCurrency =
			!!(this.is_currency as boolean | undefined ?? this.currency as boolean | undefined) ||
			this.currencyid !== undefined;

		if (isCurrency) {
			this.currencyid = this.id = String(this.id ?? this.currencyid ?? '');
		} else {
			this.assetid = this.id = String(this.id ?? this.assetid ?? '');
		}

		this.instanceid = String(this.instanceid ?? '0');
		this.amount = parseInt(String(this.amount ?? '0'), 10);
		this.contextid = String(this.contextid ?? (contextID?.toString() ?? ''));

		// ── Merge description ────────────────────────────────────────────────────
		if (description) {
			// description may be a lookup table keyed by "classid_instanceid"
			const key = String(this.classid) + '_' + String(this.instanceid);
			const resolved = (description[key] as Record<string, unknown> | undefined) ?? description;

			for (const prop of Object.keys(resolved)) {
				if (!(prop in this) || this[prop] === undefined) {
					this[prop] = (resolved as Record<string, unknown>)[prop];
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
		this.fraudwarnings = (this.fraudwarnings as string[] | undefined) ?? [];
		this.descriptions = (this.descriptions as EconItemDescription[] | undefined) ?? [];

		if (this.owner && JSON.stringify(this.owner) === '{}') {
			this.owner = null;
		}

		// ── Normalise tag shape (restore old property names) ─────────────────────
		if (this.tags) {
			this.tags = (this.tags as unknown as Record<string, unknown>[]).map((tag) => ({
				internal_name: String(tag['internal_name'] ?? ''),
				name: String(tag['localized_tag_name'] ?? tag['name'] ?? ''),
				category: String(tag['category'] ?? ''),
				color: String(tag['color'] ?? ''),
				category_name: String(tag['localized_category_name'] ?? tag['category_name'] ?? ''),
			})) as EconItemTag[];
		}

		// ── market_fee_app for Steam Community Market (appid 753, context 6) ─────
		if (
			this.appid === 753 &&
			this.contextid === '6' &&
			this.market_hash_name
		) {
			const feeMatch = String(this.market_hash_name).match(/^(\d+)-/);
			if (feeMatch) {
				this.market_fee_app = parseInt(feeMatch[1]!, 10);
			}
		}

		// ── Restore cache_expiration for CS2 items ────────────────────────────────
		if (this.appid === 730 && this.contextid === '2' && this.owner_descriptions) {
			const tradeDesc = (this.owner_descriptions as EconItemDescription[]).find(
				(d) => d.value?.indexOf('Tradable/Marketable After ') === 0,
			);
			if (tradeDesc?.value) {
				const date = new Date(tradeDesc.value.substring(26).replace(/[,()]/g, ''));
				if (!isNaN(date.getTime())) {
					this.cache_expiration = date.toISOString();
				}
			}
		}

		if (this.item_expiration) {
			this.cache_expiration = this.item_expiration as string;
		}

		if ((this.actions as unknown) === '') {
			this.actions = [];
		}

		// v8 quirk: avoid deleting a property that's already falsy
		if (this.currency) {
			delete (this as Record<string, unknown>)['currency'];
		}
	}

	getImageURL(): string {
		return `https://steamcommunity-a.akamaihd.net/economy/image/${this.icon_url ?? ''}/`;
	}

	getLargeImageURL(): string {
		if (!this.icon_url_large) {
			return this.getImageURL();
		}
		return `https://steamcommunity-a.akamaihd.net/economy/image/${this.icon_url_large}/`;
	}

	getTag(category: string): EconItemTag | null {
		if (!this.tags) {
			return null;
		}
		return (
			(this.tags as EconItemTag[]).find((t) => t.category === category) ?? null
		);
	}
}
