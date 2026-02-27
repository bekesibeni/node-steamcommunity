import { parse } from 'node-html-parser';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from './helpers';
import { CMarketSearchResult } from '../classes/CMarketSearchResult';
import type {
	Callback,
	SimpleCallback,
	BoosterPackCatalogResult,
	BoosterPackCatalogEntry,
} from '../types';

// ─── Market search options ────────────────────────────────────────────────────

export interface MarketSearchOptions {
	query?: string;
	appid?: number;
	searchDescriptions?: boolean;
	[tag: string]: unknown;
}

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getMarketApps(callback: Callback<Record<string, string>>): void;
		marketSearch(options: string | MarketSearchOptions, callback: Callback<CMarketSearchResult[]>): void;
		getGemValue(appid: number, assetid: string | number, callback: Callback<{ promptTitle: string; gemValue: number }>): void;
		turnItemIntoGems(appid: number, assetid: string | number, expectedGemsValue: number, callback: Callback<{ gemsReceived: number; totalGems: number }>): void;
		openBoosterPack(appid: number, assetid: string | number, callback: Callback<unknown[]>): void;
		getBoosterPackCatalog(callback: Callback<BoosterPackCatalogResult>): void;
		createBoosterPack(appid: number, useUntradableGems: boolean | Callback<{ totalGems: number; tradableGems: number; untradableGems: number; resultItem: unknown }>, callback?: Callback<{ totalGems: number; tradableGems: number; untradableGems: number; resultItem: unknown }>): void;
		getGiftDetails(giftID: string, callback: Callback<{ giftName: string; packageID: number; owned: boolean }>): void;
		redeemGift(giftID: string, callback: SimpleCallback): void;
		packGemSacks(assetid: string | number, desiredSackCount: number, callback: SimpleCallback): void;
		unpackGemSacks(assetid: string | number, sacksToUnpack: number, callback: SimpleCallback): void;
		_gemExchange(assetid: string | number, denominationIn: number, denominationOut: number, quantityIn: number, quantityOut: number, callback: SimpleCallback): void;
	}
}

// ─── getMarketApps ────────────────────────────────────────────────────────────

SteamCommunity.prototype.getMarketApps = function (
	this: SteamCommunity,
	callback: Callback<Record<string, string>>,
): void {
	this.httpRequest('https://steamcommunity.com/market/', (err, _res, body) => {
		if (err) { callback(err, null!); return; }

		const root = parse(String(body));
		if (!root.querySelector('.market_search_game_button_group')) {
			callback(new Error('Malformed response'), null!); return;
		}

		const apps: Record<string, string> = {};
		for (const element of root.querySelectorAll('.market_search_game_button_group a.game_button')) {
			const name = element.querySelector('.game_button_game_name')?.textContent.trim() ?? '';
			const href = element.getAttribute('href') ?? '';
			const appid = href.substring(href.indexOf('=') + 1);
			if (appid) apps[appid] = name;
		}
		callback(null, apps);
	}, 'steamcommunity');
};

// ─── marketSearch ─────────────────────────────────────────────────────────────

SteamCommunity.prototype.marketSearch = function (
	this: SteamCommunity,
	options: string | MarketSearchOptions,
	callback: Callback<CMarketSearchResult[]>,
): void {
	const qs: Record<string, unknown> = {};

	if (typeof options === 'string') {
		qs['query'] = options;
	} else {
		qs['query'] = options.query ?? '';
		qs['appid'] = options.appid;
		qs['search_descriptions'] = options.searchDescriptions ? 1 : 0;

		if (options.appid) {
			for (const [k, v] of Object.entries(options)) {
				if (['query', 'appid', 'searchDescriptions'].includes(k)) continue;
				qs[`category_${options.appid}_${k}[]`] = `tag_${v}`;
			}
		}
	}

	qs['start'] = 0;
	qs['count'] = 100;
	qs['sort_column'] = 'price';
	qs['sort_dir'] = 'asc';

	const results: CMarketSearchResult[] = [];

	const performSearch = (): void => {
		this.httpRequest(
			{
				uri: 'https://steamcommunity.com/market/search/render/',
				qs,
				headers: { referer: 'https://steamcommunity.com/market/search' },
				json: true,
			},
			(err, _res, body) => {
				if (err) { callback(err, null!); return; }

				const b = body as Record<string, unknown>;
				if (!b['success']) { callback(new Error('Success is not true'), null!); return; }
				if (!b['results_html']) { callback(new Error('No results_html in response'), null!); return; }

				const searchRoot = parse(String(b['results_html']));
				const errMsg = searchRoot.querySelector('.market_listing_table_message');
				if (errMsg) { callback(new Error(errMsg.textContent), null!); return; }

				for (const row of searchRoot.querySelectorAll('.market_listing_row_link')) {
					results.push(new CMarketSearchResult(row));
				}

				const start = Number(b['start'] ?? 0);
				const pagesize = Number(b['pagesize'] ?? 0);
				const total = Number(b['total_count'] ?? 0);

				if (start + pagesize >= total) {
					callback(null, results);
				} else {
					qs['start'] = start + pagesize;
					performSearch();
				}
			},
			'steamcommunity',
		);
	};

	performSearch();
};

// ─── getGemValue ──────────────────────────────────────────────────────────────

SteamCommunity.prototype.getGemValue = function (
	this: SteamCommunity,
	appid: number,
	assetid: string | number,
	callback: Callback<{ promptTitle: string; gemValue: number }>,
): void {
	this._myProfile(
		{
			endpoint: 'ajaxgetgoovalue/',
			qs: { sessionid: this.getSessionID(), appid, contextid: 6, assetid },
			checkHttpError: false,
			json: true,
		},
		null,
		(err, _res, body) => {
			if (err) { callback(err, null!); return; }
			const b = body as Record<string, unknown>;
			if (b['success'] && b['success'] !== SteamCommunity.EResult.OK) {
				const e = Object.assign(
					new Error(String(b['message'] ?? SteamCommunity.EResult[b['success'] as number] ?? '')),
					{ eresult: b['success'], code: b['success'] },
				);
				callback(e, null!); return;
			}
			if (!b['goo_value'] || !b['strTitle']) { callback(new Error('Malformed response'), null!); return; }
			callback(null, { promptTitle: String(b['strTitle']), gemValue: parseInt(String(b['goo_value']), 10) });
		},
	);
};

// ─── turnItemIntoGems ─────────────────────────────────────────────────────────

SteamCommunity.prototype.turnItemIntoGems = function (
	this: SteamCommunity,
	appid: number,
	assetid: string | number,
	expectedGemsValue: number,
	callback: Callback<{ gemsReceived: number; totalGems: number }>,
): void {
	this._myProfile(
		{ endpoint: 'ajaxgrindintogoo/', json: true, checkHttpError: false },
		{ appid, contextid: 6, assetid, goo_value_expected: expectedGemsValue, sessionid: this.getSessionID() },
		(err, _res, body) => {
			if (err) { callback(err, null!); return; }
			const b = body as Record<string, unknown>;
			if (b['success'] && b['success'] !== SteamCommunity.EResult.OK) {
				const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity.EResult[b['success'] as number])), { eresult: b['success'], code: b['success'] });
				callback(e, null!); return;
			}
			// Note: 'goo_value_received ' has a trailing space — that's how Valve returns it
			if (!b['goo_value_received '] || !b['goo_value_total']) { callback(new Error('Malformed response'), null!); return; }
			callback(null, {
				gemsReceived: parseInt(String(b['goo_value_received ']), 10),
				totalGems: parseInt(String(b['goo_value_total']), 10),
			});
		},
	);
};

// ─── openBoosterPack ─────────────────────────────────────────────────────────

SteamCommunity.prototype.openBoosterPack = function (
	this: SteamCommunity,
	appid: number,
	assetid: string | number,
	callback: Callback<unknown[]>,
): void {
	this._myProfile(
		{ endpoint: 'ajaxunpackbooster/', json: true, checkHttpError: false },
		{ appid, communityitemid: assetid, sessionid: this.getSessionID() },
		(err, _res, body) => {
			if (err) { callback(err, null!); return; }
			const b = body as Record<string, unknown>;
			if (b['success'] && b['success'] !== SteamCommunity.EResult.OK) {
				const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity.EResult[b['success'] as number])), { eresult: b['success'], code: b['success'] });
				callback(e, null!); return;
			}
			if (!b['rgItems']) { callback(new Error('Malformed response'), null!); return; }
			callback(null, b['rgItems'] as unknown[]);
		},
	);
};

// ─── getBoosterPackCatalog ────────────────────────────────────────────────────

SteamCommunity.prototype.getBoosterPackCatalog = function (
	this: SteamCommunity,
	callback: Callback<BoosterPackCatalogResult>,
): void {
	this.httpRequestGet('https://steamcommunity.com/tradingcards/boostercreator/', (err, _res, body) => {
		if (err) { callback(err, null!); return; }

		const bodyStr = String(body);
		const idx = bodyStr.indexOf('CBoosterCreatorPage.Init(');
		if (idx === -1) { callback(new Error('Malformed response'), null!); return; }

		const lines = bodyStr.slice(idx).split('\n').map((l) => l.trim());

		for (let i = 1; i <= 4; i++) {
			if (typeof lines[i] !== 'string' || !lines[i]!.match(/,$/)) {
				callback(Object.assign(new Error('Malformed response'), { line: i }), null!);
				return;
			}
			lines[i] = lines[i]!.replace(/,$/, '');
		}

		let boosterPackCatalog: Array<Record<string, unknown>>;
		let totalGems: number, tradableGems: number, untradableGems: number;
		try {
			boosterPackCatalog = JSON.parse(lines[1]!) as Array<Record<string, unknown>>;
			totalGems = parseInt(lines[2]!.match(/\d+/)![0]!, 10);
			tradableGems = parseInt(lines[3]!.match(/\d+/)![0]!, 10);
			untradableGems = parseInt(lines[4]!.match(/\d+/)![0]!, 10);
		} catch (ex) {
			callback(Object.assign(new Error('Malformed response'), { inner: ex }), null!);
			return;
		}

		const catalog: Record<number, BoosterPackCatalogEntry> = {};
		for (const app of boosterPackCatalog) {
			const entry: BoosterPackCatalogEntry = {
				appid: Number(app['appid']),
				name: String(app['name'] ?? ''),
				series: Number(app['series'] ?? 1),
				price: parseInt(String(app['price'] ?? 0), 10),
				unavailable: Boolean(app['unavailable']),
				availableAtTime: null,
			};

			const availAt = app['available_at_time'];
			if (typeof availAt === 'string') {
				entry.availableAtTime = Helpers.decodeSteamTime(availAt);
			}

			catalog[entry.appid] = entry;
		}

		callback(null, { totalGems, tradableGems, untradableGems, catalog });
	});
};

// ─── createBoosterPack ────────────────────────────────────────────────────────

SteamCommunity.prototype.createBoosterPack = function (
	this: SteamCommunity,
	appid: number,
	useUntradableGems: boolean | Callback<{ totalGems: number; tradableGems: number; untradableGems: number; resultItem: unknown }>,
	callback?: Callback<{ totalGems: number; tradableGems: number; untradableGems: number; resultItem: unknown }>,
): void {
	if (typeof useUntradableGems === 'function') {
		callback = useUntradableGems;
		useUntradableGems = false;
	}

	this.httpRequestPost(
		{
			uri: 'https://steamcommunity.com/tradingcards/ajaxcreatebooster/',
			form: {
				sessionid: this.getSessionID(),
				appid,
				series: 1,
				tradability_preference: useUntradableGems ? 3 : 2,
			},
			json: true,
			checkHttpError: false,
		},
		(err, res, body) => {
			if (err) { callback!(err, null!); return; }
			const b = body as Record<string, unknown>;
			if (b['purchase_eresult'] && b['purchase_eresult'] !== 1) {
				callback!(Helpers.eresultError(Number(b['purchase_eresult'])) ?? new Error('Unknown'), null!);
				return;
			}
			if (this._checkHttpError(err, res, callback as unknown as import('../types').HttpCallback, body)) return;
			callback!(null, {
				totalGems: parseInt(String(b['goo_amount'] ?? 0), 10),
				tradableGems: parseInt(String(b['tradable_goo_amount'] ?? 0), 10),
				untradableGems: parseInt(String(b['untradable_goo_amount'] ?? 0), 10),
				resultItem: b['purchase_result'],
			});
		},
	);
};

// ─── getGiftDetails ───────────────────────────────────────────────────────────

SteamCommunity.prototype.getGiftDetails = function (
	this: SteamCommunity,
	giftID: string,
	callback: Callback<{ giftName: string; packageID: number; owned: boolean }>,
): void {
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gifts/${giftID}/validateunpack`, form: { sessionid: this.getSessionID() }, json: true },
		(err, _res, body) => {
			if (err) { callback(err, null!); return; }
			const b = body as Record<string, unknown>;
			if (b['success'] && b['success'] !== SteamCommunity.EResult.OK) {
				const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity.EResult[b['success'] as number])), { eresult: b['success'], code: b['success'] });
				callback(e, null!); return;
			}
			if (!b['packageid'] || !b['gift_name']) { callback(new Error('Malformed response'), null!); return; }
			callback(null, { giftName: String(b['gift_name']), packageID: parseInt(String(b['packageid']), 10), owned: Boolean(b['owned']) });
		},
	);
};

// ─── redeemGift ───────────────────────────────────────────────────────────────

SteamCommunity.prototype.redeemGift = function (
	this: SteamCommunity,
	giftID: string,
	callback: SimpleCallback,
): void {
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gifts/${giftID}/unpack`, form: { sessionid: this.getSessionID() }, json: true },
		(err, _res, body) => {
			if (err) { callback(err); return; }
			const b = body as Record<string, unknown>;
			if (b['success'] && b['success'] !== SteamCommunity.EResult.OK) {
				const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity.EResult[b['success'] as number])), { eresult: b['success'], code: b['success'] });
				callback(e); return;
			}
			callback(null);
		},
	);
};

// ─── _gemExchange ─────────────────────────────────────────────────────────────

SteamCommunity.prototype._gemExchange = function (
	this: SteamCommunity,
	assetid: string | number,
	denominationIn: number,
	denominationOut: number,
	quantityIn: number,
	quantityOut: number,
	callback: SimpleCallback,
): void {
	this._myProfile(
		{ endpoint: 'ajaxexchangegoo/', json: true, checkHttpError: false },
		{
			appid: 753,
			assetid,
			goo_denomination_in: denominationIn,
			goo_amount_in: quantityIn,
			goo_denomination_out: denominationOut,
			goo_amount_out_expected: quantityOut,
			sessionid: this.getSessionID(),
		},
		(err, _res, body) => {
			if (err) { callback(err); return; }
			const b = body as Record<string, unknown>;
			callback(Helpers.eresultError(Number(b['success'] ?? 0)));
		},
	);
};

// ─── packGemSacks / unpackGemSacks ────────────────────────────────────────────

SteamCommunity.prototype.packGemSacks = function (
	this: SteamCommunity,
	assetid: string | number,
	desiredSackCount: number,
	callback: SimpleCallback,
): void {
	this._gemExchange(assetid, 1, 1000, desiredSackCount * 1000, desiredSackCount, callback);
};

SteamCommunity.prototype.unpackGemSacks = function (
	this: SteamCommunity,
	assetid: string | number,
	sacksToUnpack: number,
	callback: SimpleCallback,
): void {
	this._gemExchange(assetid, 1000, 1, sacksToUnpack, sacksToUnpack * 1000, callback);
};
