import { parse } from 'node-html-parser';

import { SteamCommunity } from '../SteamCommunity';
import type { Callback, MedianSalePrice } from '../types';

// ─── Augment SteamCommunity with getMarketItem ────────────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getMarketItem(
			appid: number,
			hashName: string,
			currency: number | Callback<CMarketItem>,
			callback?: Callback<CMarketItem>,
		): void;
	}
}

SteamCommunity.prototype.getMarketItem = function (
	this: SteamCommunity,
	appid: number,
	hashName: string,
	currency: number | Callback<CMarketItem>,
	callback?: Callback<CMarketItem>,
): void {
	if (typeof currency === 'function') {
		callback = currency;
		currency = 1;
	}

	this.httpRequest(
		`https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(hashName)}`,
		(err, _response, body) => {
			if (err) {
				callback!(err, null!);
				return;
			}

			const bodyStr = String(body);
			const root = parse(bodyStr);
			const noListings = root.querySelector('.market_listing_table_message')?.textContent.trim();
			if (noListings === 'There are no listings for this item.') {
				callback!(new Error('There are no listings for this item.'), null!);
				return;
			}

			const item = new CMarketItem(appid, hashName, this, bodyStr);
			item.updatePrice(currency as number, (priceErr) => {
				if (priceErr) {
					callback!(priceErr, null!);
				} else {
					callback!(null, item);
				}
			});
		},
		'steamcommunity',
	);
};

// ─── CMarketItem class ────────────────────────────────────────────────────────

export class CMarketItem {
	declare private readonly _community: SteamCommunity;
	declare private readonly _appid: number;
	declare private readonly _hashName: string;
	declare private _country: string;
	declare private _language: string;

	commodity: boolean;
	commodityID?: number;
	medianSalePrices: MedianSalePrice[] | null;
	firstAsset: Record<string, unknown> | null;
	assets: Record<string, unknown> | null;
	quantity: number;
	lowestPrice: number;
	buyQuantity?: number;
	highestBuyOrder?: number;

	constructor(
		appid: number,
		hashName: string,
		community: SteamCommunity,
		body: string,
	) {
		Object.defineProperty(this, '_community', { value: community, enumerable: false });
		Object.defineProperty(this, '_appid', { value: appid, enumerable: false });
		Object.defineProperty(this, '_hashName', { value: hashName, enumerable: false });

		let match: RegExpMatchArray | null;

		this._country = 'US';
		match = body.match(/var g_strCountryCode = "([^"]+)";/);
		if (match) this._country = match[1]!;

		this._language = 'english';
		match = body.match(/var g_strLanguage = "([^"]+)";/);
		if (match) this._language = match[1]!;

		this.commodity = false;
		match = body.match(/Market_LoadOrderSpread\(\s*(\d+)\s*\);/);
		if (match) {
			this.commodity = true;
			this.commodityID = parseInt(match[1]!, 10);
		}

		this.medianSalePrices = null;
		match = body.match(/var line1=([^;]+);/);
		if (match) {
			try {
				const raw = JSON.parse(match[1]!) as Array<[string, number, string]>;
				this.medianSalePrices = raw.map(([hour, price, quantity]) => ({
					hour: new Date(hour),
					price,
					quantity: parseInt(quantity, 10),
				}));
			} catch {
				// ignore
			}
		}

		this.firstAsset = null;
		this.assets = null;
		match = body.match(/var g_rgAssets = (.*);/);
		if (match) {
			try {
				const parsed = JSON.parse(match[1]!) as Record<number, Record<string, Record<string, unknown>>>;
				const byApp = parsed[appid];
				if (byApp) {
					const firstCtx = byApp[Object.keys(byApp)[0]!];
					if (firstCtx) {
						this.assets = firstCtx;
						this.firstAsset = firstCtx[Object.keys(firstCtx)[0]!] as Record<string, unknown> | null;
					}
				}
			} catch {
				// ignore
			}
		}

		this.quantity = 0;
		this.lowestPrice = 0;
	}

	updatePrice(currency: number, callback: (err: Error | null) => void): void {
		if (this.commodity) {
			this.updatePriceForCommodity(currency, callback);
		} else {
			this.updatePriceForNonCommodity(currency, callback);
		}
	}

	updatePriceForCommodity(currency: number, callback: (err: Error | null) => void): void {
		if (!this.commodity) {
			throw new Error('Cannot update price for non-commodity item');
		}

		this._community.httpRequest(
			{
				uri: `https://steamcommunity.com/market/itemordershistogram?country=US&language=english&currency=${currency}&item_nameid=${this.commodityID}`,
				json: true,
			},
			(err, _response, body) => {
				const b = body as Record<string, unknown>;
				if (err) { callback(err); return; }
				if (b['success'] !== 1) { callback(new Error('Error ' + b['success'])); return; }

				const sellSummary = String(b['sell_order_summary'] ?? '');
				const sellMatch = sellSummary.match(/<span class="market_commodity_orders_header_promote">(\d+)<\/span>/);
				if (sellMatch) this.quantity = parseInt(sellMatch[1]!, 10);

				this.buyQuantity = 0;
				const buySummary = String(b['buy_order_summary'] ?? '');
				const buyMatch = buySummary.match(/<span class="market_commodity_orders_header_promote">(\d+)<\/span>/);
				if (buyMatch) this.buyQuantity = parseInt(buyMatch[1]!, 10);

				this.lowestPrice = parseInt(String(b['lowest_sell_order'] ?? '0'), 10);
				this.highestBuyOrder = parseInt(String(b['highest_buy_order'] ?? '0'), 10);
				callback(null);
			},
			'steamcommunity',
		);
	}

	updatePriceForNonCommodity(currency: number, callback: (err: Error | null) => void): void {
		if (this.commodity) {
			throw new Error('Cannot update price for commodity item');
		}

		this._community.httpRequest(
			{
				uri: `https://steamcommunity.com/market/listings/${this._appid}/${encodeURIComponent(this._hashName)}/render/?query=&start=0&count=10&country=US&language=english&currency=${currency}`,
				json: true,
			},
			(err, _response, body) => {
				const b = body as Record<string, unknown>;
				if (err) { callback(err); return; }
				if (b['success'] !== 1) { callback(new Error('Error ' + b['success'])); return; }

				const totalCount = b['total_count'];
				if (totalCount) this.quantity = parseInt(String(totalCount), 10);

				const root = parse(String(b['results_html'] ?? ''));
				for (const el of root.querySelectorAll('.market_listing_price.market_listing_price_with_fee')) {
					const raw = (el.textContent ?? '').replace(',', '.').replace(/[^\d.]/g, '');
					const parsed = parseFloat(raw);
					if (!isNaN(parsed)) {
						this.lowestPrice = parsed;
						break;
					}
				}

				callback(null);
			},
			'steamcommunity',
		);
	}
}
