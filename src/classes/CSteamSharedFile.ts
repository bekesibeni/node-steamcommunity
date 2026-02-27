import SteamID from 'steamid';
import { parse } from 'node-html-parser';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from '../components/helpers';
import type { Callback, SimpleCallback } from '../types';
import { ESharedFileType } from '../resources/ESharedFileType';

// ─── Augment SteamCommunity with getSteamSharedFile ───────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getSteamSharedFile(sharedFileId: string, callback: Callback<CSteamSharedFile>): void;
	}
}

SteamCommunity.prototype.getSteamSharedFile = function (
	this: SteamCommunity,
	sharedFileId: string,
	callback: Callback<CSteamSharedFile>,
): void {
	this.httpRequestGet(
		`https://steamcommunity.com/sharedfiles/filedetails/?id=${sharedFileId}`,
		(err, _res, body) => {
			try {
				if (err) { callback(err, null!); return; }

				const $ = parse(String(body));

				// ── Stat container: left labels → right values ──────────────────────
				const detailsLeft  = $.querySelectorAll('.detailsStatsContainerLeft > div');
				const detailsRight = $.querySelectorAll('.detailsStatsContainerRight > div');
				const detailsStats: Record<string, string> = {};
				detailsLeft.forEach((el, i) => {
					const key = el.textContent.trim();
					const val = detailsRight[i]?.textContent ?? '';
					if (key) detailsStats[key] = val;
				});

				// ── Stats table: Unique Visitors, Current Favorites ─────────────────
				const statsTable: Record<string, string> = {};
				for (const row of $.querySelectorAll('.stats_table tr')) {
					const cells = row.querySelectorAll('td');
					if (cells.length >= 4) {
						const label = cells[3]?.textContent.trim() ?? '';
						const value = (cells[1]?.textContent ?? '').replace(/,/g, '');
						if (label) statsTable[label] = value;
					}
				}

				// ── appID ─────────────────────────────────────────────────────────────
				const shareOnclick = $.querySelector('#ShareItemBtn')?.getAttribute('onclick') ?? '';
				const appID = Number(
					shareOnclick
						.replace(`ShowSharePublishedFilePopup( '${sharedFileId}', '`, '')
						.replace("' );", '')
						.trim(),
				) || null;

				// ── fileSize ──────────────────────────────────────────────────────────
				const fileSize = detailsStats['File Size'] ?? null;

				// ── postDate ──────────────────────────────────────────────────────────
				const postedRaw = (detailsStats['Posted'] ?? '').trim();
				const postDate = postedRaw ? Helpers.decodeSteamTime(postedRaw) : new Date(0);

				// ── resolution ────────────────────────────────────────────────────────
				const resolution = detailsStats['Size'] ?? null;

				// ── uniqueVisitorsCount ───────────────────────────────────────────────
				const uvStr = statsTable['Unique Visitors'];
				const uniqueVisitorsCount = uvStr !== undefined ? Number(uvStr) : null;

				// ── favoritesCount ────────────────────────────────────────────────────
				const fcStr = statsTable['Current Favorites'];
				const favoritesCount = fcStr !== undefined ? Number(fcStr) : null;

				// ── upvoteCount ───────────────────────────────────────────────────────
				const upvoteStr = $.querySelector('#VotesUpCountContainer #VotesUpCount')?.textContent ?? '';
				const upvoteCount = upvoteStr.length > 0 ? Number(upvoteStr) : null;

				// ── guideNumRatings ───────────────────────────────────────────────────
				const numRatingsStr = ($.querySelector('.ratingSection .numRatings')?.textContent ?? '')
					.replace(' ratings', '');
				const guideNumRatings = Number(numRatingsStr) || null;

				// ── vote state ────────────────────────────────────────────────────────
				const upBtnClass   = $.querySelector('.workshopItemControlCtn #VoteUpBtn')?.getAttribute('class') ?? '';
				const downBtnClass = $.querySelector('.workshopItemControlCtn #VoteDownBtn')?.getAttribute('class') ?? '';
				const isUpvoted   = upBtnClass.includes('toggled');
				const isDownvoted = downBtnClass.includes('toggled');

				// ── type from breadcrumb ──────────────────────────────────────────────
				let type: ESharedFileType | null = null;
				const separatorEl = $.querySelector('.breadcrumbs .breadcrumb_separator');
				// The text after the separator is the next sibling element
				const breadcrumb = separatorEl
					? (separatorEl.nextElementSibling?.textContent ?? '')
					: '';
				if (breadcrumb.includes('Screenshot')) type = ESharedFileType.Screenshot;
				else if (breadcrumb.includes('Artwork')) type = ESharedFileType.Artwork;
				else if (breadcrumb.includes('Guide'))   type = ESharedFileType.Guide;

				// ── owner ─────────────────────────────────────────────────────────────
				const ownerHref = $.querySelector('.friendBlockLinkOverlay')?.getAttribute('href') ?? '';
				Helpers.resolveVanityURL(ownerHref, (err, data) => {
					if (err) { callback(err, null!); return; }
					const owner = new SteamID(data!.steamID);

					callback(null, new CSteamSharedFile(this, {
						id: sharedFileId,
						type,
						appID,
						owner,
						fileSize,
						postDate,
						resolution,
						uniqueVisitorsCount,
						favoritesCount,
						upvoteCount,
						guideNumRatings,
						isUpvoted,
						isDownvoted,
					}));
				});
			} catch (ex) {
				callback(ex as Error, null!);
			}
		},
		'steamcommunity',
	);
};

// ─── Data shape ───────────────────────────────────────────────────────────────

export interface SharedFileData {
	id: string;
	type: ESharedFileType | null;
	appID: number | null;
	owner: SteamID | null;
	fileSize: string | null;
	postDate: Date;
	resolution: string | null;
	uniqueVisitorsCount: number | null;
	favoritesCount: number | null;
	upvoteCount: number | null;
	guideNumRatings: number | null;
	isUpvoted: boolean | null;
	isDownvoted: boolean | null;
}

export class CSteamSharedFile implements SharedFileData {
	declare private readonly _community: SteamCommunity;

	declare readonly id: string;
	declare readonly type: ESharedFileType | null;
	declare readonly appID: number | null;
	declare readonly owner: SteamID | null;
	declare readonly fileSize: string | null;
	declare readonly postDate: Date;
	declare readonly resolution: string | null;
	declare readonly uniqueVisitorsCount: number | null;
	declare readonly favoritesCount: number | null;
	declare readonly upvoteCount: number | null;
	declare readonly guideNumRatings: number | null;
	declare readonly isUpvoted: boolean | null;
	declare readonly isDownvoted: boolean | null;

	constructor(community: SteamCommunity, data: SharedFileData) {
		Object.defineProperty(this, '_community', { value: community, enumerable: false });
		Object.assign(this, data);
	}

	deleteComment(cid: string, callback?: SimpleCallback): void {
		this._community.deleteSharedFileComment(this.owner!, this.id, cid, callback);
	}

	favorite(callback?: SimpleCallback): void {
		this._community.favoriteSharedFile(this.id, this.appID!, callback);
	}

	comment(message: string, callback?: SimpleCallback): void {
		this._community.postSharedFileComment(this.owner!, this.id, message, callback);
	}

	subscribe(callback?: SimpleCallback): void {
		this._community.subscribeSharedFileComments(this.owner!, this.id, callback);
	}

	unfavorite(callback?: SimpleCallback): void {
		this._community.unfavoriteSharedFile(this.id, this.appID!, callback);
	}

	unsubscribe(callback?: SimpleCallback): void {
		this._community.unsubscribeSharedFileComments(this.owner!, this.id, callback);
	}
}
