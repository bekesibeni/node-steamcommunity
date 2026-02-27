import { parse } from 'node-html-parser';
import SteamID from 'steamid';

import { SteamCommunity } from '../SteamCommunity';
import { CEconItem } from '../classes/CEconItem';
import { Helpers } from './helpers';
import type { Callback, InventoryHistoryOptions, InventoryHistoryResult, InventoryHistoryTrade } from '../types';

declare module '../SteamCommunity' {
	interface SteamCommunity {
		/** @deprecated Use GetTradeHistory Steam Web API instead. */
		getInventoryHistory(options: InventoryHistoryOptions | Callback<InventoryHistoryResult>, callback?: Callback<InventoryHistoryResult>): void;
	}
}

SteamCommunity.prototype.getInventoryHistory = function (
	this: SteamCommunity,
	options: InventoryHistoryOptions | Callback<InventoryHistoryResult>,
	callback?: Callback<InventoryHistoryResult>,
): void {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	options.direction ??= 'past';

	let qs = '?l=english';
	if (options.startTime) {
		const t = options.startTime instanceof Date
			? Math.floor(options.startTime.getTime() / 1000)
			: options.startTime;
		qs += '&after_time=' + t;
		if (options.startTrade) qs += '&after_trade=' + options.startTrade;
	}
	if (options.direction === 'future') qs += '&prev=1';

	this._myProfile('inventoryhistory' + qs, null, (err, _res, body) => {
		if (err) { callback!(err, null!); return; }

		const bodyStr = String(body);
		const output: InventoryHistoryResult = { trades: [] };
		const vanityURLs: string[] = [];

		const ihRoot = parse(bodyStr);
		if (!ihRoot.querySelector('.inventory_history_pagingrow')) {
			callback!(new Error('Malformed page: no paging row found'), null!);
			return;
		}

		const match2 = bodyStr.match(/var g_rgHistoryInventory = (.*);/);
		if (!match2) { callback!(new Error('Malformed page: no trade found'), null!); return; }

		let historyInventory: Record<string, Record<string, Record<string, Record<string, unknown>>>>;
		try {
			historyInventory = JSON.parse(match2[1]!) as typeof historyInventory;
		} catch {
			callback!(new Error('Malformed page: no well-formed trade data found'), null!);
			return;
		}

		// Parse paging buttons
		for (const btn of ihRoot.querySelectorAll('.inventory_history_nextbtn .pagebtn:not(.disabled)')) {
			const href = btn.getAttribute('href') ?? '';
			if (href.match(/prev=1/)) {
				output.firstTradeTime = new Date(Number(href.match(/after_time=(\d+)/)![1]) * 1000);
				output.firstTradeID = href.match(/after_trade=(\d+)/)![1]!;
			} else {
				output.lastTradeTime = new Date(Number(href.match(/after_time=(\d+)/)![1]) * 1000);
				output.lastTradeID = href.match(/after_trade=(\d+)/)![1]!;
			}
		}

		// Parse each trade row
		for (const row of ihRoot.querySelectorAll('.tradehistoryrow')) {
			const trade: InventoryHistoryTrade = {
				onHold: !!(row.querySelector('span:nth-of-type(2)')?.textContent ?? '').match(/Trade on Hold/i),
				date: new Date(),
				partnerName: row.querySelector('.tradehistory_event_description a')?.innerHTML ?? null,
				partnerSteamID: null,
				partnerVanityURL: null,
				itemsReceived: [],
				itemsGiven: [],
			};

			// Parse timestamp
			const timeMatch = (row.querySelector('.tradehistory_timestamp')?.innerHTML ?? '').match(/(\d+):(\d+)(am|pm)/);
			if (timeMatch) {
				let hour = parseInt(timeMatch[1]!, 10);
				const min = timeMatch[2]!;
				const ampm = timeMatch[3]!;
				if (hour === 12 && ampm === 'am') hour = 0;
				if (hour < 12 && ampm === 'pm') hour += 12;
				const timeStr = (hour < 10 ? '0' : '') + hour + ':' + min + ':00';
				trade.date = new Date((row.querySelector('.tradehistory_date')?.innerHTML ?? '') + ' ' + timeStr + ' UTC');
			}

			// Parse partner
			const profileLink = row.querySelector('.tradehistory_event_description a')?.getAttribute('href') ?? '';
			if (profileLink.includes('/profiles/')) {
				trade.partnerSteamID = new SteamID(profileLink.match(/(\d+)$/)![1]!);
			} else {
				trade.partnerVanityURL = profileLink.match(/\/([^/]+)$/)![1]!;
				if (options.resolveVanityURLs && !vanityURLs.includes(trade.partnerVanityURL)) {
					vanityURLs.push(trade.partnerVanityURL);
				}
			}

			// Parse items
			for (const itemEl of row.querySelectorAll('.history_item')) {
				const itemId = itemEl.getAttribute('id') ?? '';
				const itemMatch = bodyStr.match(
					new RegExp(`HistoryPageCreateItemHover\\( '${itemId}', (\\d+), '(\\d+)', '(\\d+|class_\\d+_instance_\\d+|class_\\d+)', '(\\d+)' \\);`),
				);
				if (!itemMatch) continue;

				const rawItem = historyInventory[itemMatch[1]!]?.[itemMatch[2]!]?.[itemMatch[3]!];
				if (!rawItem) continue;

				const econItem = new CEconItem(rawItem as Record<string, unknown>);
				if (itemId.includes('received')) {
					trade.itemsReceived.push(econItem);
				} else {
					trade.itemsGiven.push(econItem);
				}
			}

			output.trades.push(trade);
		}

		if (options.resolveVanityURLs && vanityURLs.length > 0) {
			const promises = vanityURLs.map((vanity) =>
				new Promise<{ vanityURL: string; steamID: string }>((resolve, reject) => {
					Helpers.resolveVanityURL(vanity, (err, result) => {
						if (err) reject(err);
						else resolve(result!);
					});
				}),
			);

			Promise.all(promises).then((results) => {
				for (const trade of output.trades) {
					if (trade.partnerSteamID ?? !trade.partnerVanityURL) continue;
					const found = results.find((r) => r.vanityURL === trade.partnerVanityURL);
					if (found) trade.partnerSteamID = new SteamID(found.steamID);
				}
				callback!(null, output);
			}).catch((e: Error) => callback!(e, null!));
		} else {
			callback!(null, output);
		}
	}, 'steamcommunity');
};
