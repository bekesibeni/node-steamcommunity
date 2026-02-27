"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSteamSharedFile = void 0;
const steamid_1 = __importDefault(require("steamid"));
const node_html_parser_1 = require("node-html-parser");
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("../components/helpers");
const ESharedFileType_1 = require("../resources/ESharedFileType");
SteamCommunity_1.SteamCommunity.prototype.getSteamSharedFile = function (sharedFileId, callback) {
    this.httpRequestGet(`https://steamcommunity.com/sharedfiles/filedetails/?id=${sharedFileId}`, (err, _res, body) => {
        try {
            if (err) {
                callback(err, null);
                return;
            }
            const $ = (0, node_html_parser_1.parse)(String(body));
            // ── Stat container: left labels → right values ──────────────────────
            const detailsLeft = $.querySelectorAll('.detailsStatsContainerLeft > div');
            const detailsRight = $.querySelectorAll('.detailsStatsContainerRight > div');
            const detailsStats = {};
            detailsLeft.forEach((el, i) => {
                const key = el.textContent.trim();
                const val = detailsRight[i]?.textContent ?? '';
                if (key)
                    detailsStats[key] = val;
            });
            // ── Stats table: Unique Visitors, Current Favorites ─────────────────
            const statsTable = {};
            for (const row of $.querySelectorAll('.stats_table tr')) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) {
                    const label = cells[3]?.textContent.trim() ?? '';
                    const value = (cells[1]?.textContent ?? '').replace(/,/g, '');
                    if (label)
                        statsTable[label] = value;
                }
            }
            // ── appID ─────────────────────────────────────────────────────────────
            const shareOnclick = $.querySelector('#ShareItemBtn')?.getAttribute('onclick') ?? '';
            const appID = Number(shareOnclick
                .replace(`ShowSharePublishedFilePopup( '${sharedFileId}', '`, '')
                .replace("' );", '')
                .trim()) || null;
            // ── fileSize ──────────────────────────────────────────────────────────
            const fileSize = detailsStats['File Size'] ?? null;
            // ── postDate ──────────────────────────────────────────────────────────
            const postedRaw = (detailsStats['Posted'] ?? '').trim();
            const postDate = postedRaw ? helpers_1.Helpers.decodeSteamTime(postedRaw) : new Date(0);
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
            const upBtnClass = $.querySelector('.workshopItemControlCtn #VoteUpBtn')?.getAttribute('class') ?? '';
            const downBtnClass = $.querySelector('.workshopItemControlCtn #VoteDownBtn')?.getAttribute('class') ?? '';
            const isUpvoted = upBtnClass.includes('toggled');
            const isDownvoted = downBtnClass.includes('toggled');
            // ── type from breadcrumb ──────────────────────────────────────────────
            let type = null;
            const separatorEl = $.querySelector('.breadcrumbs .breadcrumb_separator');
            // The text after the separator is the next sibling element
            const breadcrumb = separatorEl
                ? (separatorEl.nextElementSibling?.textContent ?? '')
                : '';
            if (breadcrumb.includes('Screenshot'))
                type = ESharedFileType_1.ESharedFileType.Screenshot;
            else if (breadcrumb.includes('Artwork'))
                type = ESharedFileType_1.ESharedFileType.Artwork;
            else if (breadcrumb.includes('Guide'))
                type = ESharedFileType_1.ESharedFileType.Guide;
            // ── owner ─────────────────────────────────────────────────────────────
            const ownerHref = $.querySelector('.friendBlockLinkOverlay')?.getAttribute('href') ?? '';
            helpers_1.Helpers.resolveVanityURL(ownerHref, (err, data) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                const owner = new steamid_1.default(data.steamID);
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
        }
        catch (ex) {
            callback(ex, null);
        }
    }, 'steamcommunity');
};
class CSteamSharedFile {
    constructor(community, data) {
        Object.defineProperty(this, '_community', { value: community, enumerable: false });
        Object.assign(this, data);
    }
    deleteComment(cid, callback) {
        this._community.deleteSharedFileComment(this.owner, this.id, cid, callback);
    }
    favorite(callback) {
        this._community.favoriteSharedFile(this.id, this.appID, callback);
    }
    comment(message, callback) {
        this._community.postSharedFileComment(this.owner, this.id, message, callback);
    }
    subscribe(callback) {
        this._community.subscribeSharedFileComments(this.owner, this.id, callback);
    }
    unfavorite(callback) {
        this._community.unfavoriteSharedFile(this.id, this.appID, callback);
    }
    unsubscribe(callback) {
        this._community.unsubscribeSharedFileComments(this.owner, this.id, callback);
    }
}
exports.CSteamSharedFile = CSteamSharedFile;
//# sourceMappingURL=CSteamSharedFile.js.map