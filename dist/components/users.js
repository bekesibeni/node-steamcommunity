"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_html_parser_1 = require("node-html-parser");
const crypto_1 = __importDefault(require("crypto"));
const image_size_1 = require("image-size");
const steamid_1 = __importDefault(require("steamid"));
const SteamCommunity_1 = require("../SteamCommunity");
const CEconItem_1 = require("../classes/CEconItem");
const helpers_1 = require("./helpers");
// ─── Helper: normalise a userID to SteamID ───────────────────────────────────
function toSteamID(userID) {
    return typeof userID === 'string' ? new steamid_1.default(userID) : userID;
}
// ─── parentalUnlock ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.parentalUnlock = function (pin, callback) {
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/parental/ajaxunlock',
        form: { pin, sessionid: this.getSessionID() },
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err);
            return;
        }
        const b = body;
        if (!b?.['success']) {
            const eresult = Number(b?.['eresult'] ?? 0);
            let message;
            switch (eresult) {
                case 15:
                    message = 'Incorrect PIN';
                    break;
                case 25:
                    message = 'Too many invalid PIN attempts';
                    break;
                default:
                    message = 'Error ' + eresult;
            }
            callback?.(new Error(message));
            return;
        }
        callback?.(null);
    }, 'steamcommunity');
};
// ─── getNotifications ────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getNotifications = function (callback) {
    this.httpRequestGet({
        uri: 'https://steamcommunity.com/actions/GetNotificationCounts',
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        const n = b?.['notifications'] ?? {};
        callback(null, {
            trades: n[1] ?? 0,
            gameTurns: n[2] ?? 0,
            moderatorMessages: n[3] ?? 0,
            comments: n[4] ?? 0,
            items: n[5] ?? 0,
            invites: n[6] ?? 0,
            // index 7 is intentionally skipped
            gifts: n[8] ?? 0,
            chat: n[9] ?? 0,
            helpRequestReplies: n[10] ?? 0,
            accountAlerts: n[11] ?? 0,
        });
    }, 'steamcommunity');
};
// ─── resetItemNotifications ──────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.resetItemNotifications = function (callback) {
    this.httpRequestGet({ uri: 'https://steamcommunity.com/my/inventory' }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── loggedIn ────────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.loggedIn = function (callback) {
    this.httpRequest({
        uri: 'https://steamcommunity.com/my',
        followRedirect: false,
        checkHttpError: false,
    }, (err, response) => {
        if (err) {
            callback(err);
            return;
        }
        if (response.statusCode === 403) {
            callback(null, true, true);
            return;
        }
        if (response.statusCode === 302) {
            const location = String(response.headers['location'] ?? '');
            if (/steamcommunity\.com\/(id|profiles)\/[^/]+/.test(location)) {
                callback(null, true, false);
                return;
            }
        }
        callback(null, false, false);
    }, 'steamcommunity');
};
// ─── getTradeURL ─────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getTradeURL = function (callback) {
    this._myProfile('tradeoffers/privacy', null, (err, _response, body) => {
        if (err) {
            callback(err);
            return;
        }
        const html = typeof body === 'string' ? body : '';
        const match = html.match(/https?:\/\/(www\.)?steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+(&|&amp;)token=([a-zA-Z0-9\-_]+)/);
        if (!match) {
            callback(new Error('Malformed response'));
            return;
        }
        const url = match[0].replace(/&amp;/g, '&');
        const token = match[3];
        callback(null, url, token);
    }, 'steamcommunity');
};
// ─── changeTradeURL ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.changeTradeURL = function (callback) {
    this._myProfile('tradeoffers/newtradeurl', { sessionid: this.getSessionID() }, (err, _response, body) => {
        if (err) {
            callback?.(err);
            return;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
        }
        catch {
            callback?.(new Error('Malformed response'));
            return;
        }
        const token = String(parsed?.['token'] ?? '');
        if (!token) {
            callback?.(new Error('Malformed response'));
            return;
        }
        const url = `https://steamcommunity.com/tradeoffer/new/?partner=${this.steamID?.accountid ?? ''}&token=${token}`;
        callback?.(null, url, token);
    }, 'steamcommunity');
};
// ─── clearPersonaNameHistory ─────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.clearPersonaNameHistory = function (callback) {
    this._myProfile('ajaxclearaliashistory/', { sessionid: this.getSessionID() }, (err, _response, body) => {
        if (err) {
            callback?.(err);
            return;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
        }
        catch {
            callback?.(new Error('Malformed response'));
            return;
        }
        const eresultErr = helpers_1.Helpers.eresultError(Number(parsed?.['success'] ?? 0));
        callback?.(eresultErr);
    }, 'steamcommunity');
};
// ─── getFriendsList ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getFriendsList = function (callback) {
    this.httpRequestGet({
        uri: 'https://steamcommunity.com/textfilter/ajaxgetfriendslist',
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (Number(b?.['success']) !== 1) {
            const eresultErr = helpers_1.Helpers.eresultError(Number(b?.['success'] ?? 0));
            callback(eresultErr ?? new Error('Unknown error'), null);
            return;
        }
        const friends = b?.['friendslist']?.['friends'];
        const result = {};
        if (Array.isArray(friends)) {
            for (const entry of friends) {
                const steamID64 = String(entry['steamid'] ?? '');
                const relationship = Number(entry['efriendrelationship'] ?? 0);
                if (steamID64) {
                    result[steamID64] = relationship;
                }
            }
        }
        callback(null, result);
    }, 'steamcommunity');
};
// ─── addFriend ───────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.addFriend = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/actions/AddFriendAjax',
        form: {
            accept_invite: 0,
            sessionID: this.getSessionID(),
            steamid: sid.getSteamID64(),
        },
        json: true,
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── acceptFriendRequest ─────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.acceptFriendRequest = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/actions/AddFriendAjax',
        form: {
            accept_invite: 1,
            sessionID: this.getSessionID(),
            steamid: sid.getSteamID64(),
        },
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── removeFriend ────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.removeFriend = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/actions/RemoveFriendAjax',
        form: {
            sessionID: this.getSessionID(),
            steamid: sid.getSteamID64(),
        },
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── blockCommunication ──────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.blockCommunication = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/actions/BlockUserAjax',
        form: {
            sessionID: this.getSessionID(),
            steamid: sid.getSteamID64(),
        },
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── unblockCommunication ────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.unblockCommunication = function (userID, callback) {
    const sid = toSteamID(userID);
    const form = {
        action: 'unignore',
        [`friends[${sid.getSteamID64()}]`]: 1,
    };
    this._myProfile('friends/blocked/', form, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── postUserComment ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.postUserComment = function (userID, message, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/comment/Profile/post/${sid.getSteamID64()}/-1`,
        form: {
            comment: message,
            count: 1,
            sessionid: this.getSessionID(),
        },
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        const b = body;
        const html = String(b?.['comments_html'] ?? '');
        const idAttr = (0, node_html_parser_1.parse)(html).querySelector('.commentthread_comment')?.getAttribute('id') ?? '';
        const commentID = idAttr.split('_')[1] ?? '';
        if (!commentID) {
            callback?.(new Error('Could not find comment ID in response'), null);
            return;
        }
        callback?.(null, commentID);
    }, 'steamcommunity');
};
// ─── deleteUserComment ───────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.deleteUserComment = function (userID, commentID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/comment/Profile/delete/${sid.getSteamID64()}/-1`,
        form: {
            gidcomment: commentID,
            start: 0,
            count: 1,
            sessionid: this.getSessionID(),
            feature2: -1,
        },
        json: true,
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── getUserComments ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getUserComments = function (userID, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/comment/Profile/render/${sid.getSteamID64()}/-1`,
        form: {
            start: 0,
            count: 0,
            feature2: -1,
            sessionid: this.getSessionID(),
            ...options,
        },
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        const b = body;
        const html = String(b?.['comments_html'] ?? '');
        const totalCount = Number(b?.['total_count'] ?? 0);
        const commentsRoot = (0, node_html_parser_1.parse)(html);
        const comments = [];
        for (const el of commentsRoot.querySelectorAll('.commentthread_comment.responsive_body_text[id]')) {
            const commentId = (el.getAttribute('id') ?? '').split('_')[1] ?? '';
            const authorElem = el.querySelector('.commentthread_author_link');
            // data-miniprofile contains the 32-bit account ID — works for both
            // /profiles/ and /id/ (vanity) URLs, unlike parsing the href.
            const miniprofile = authorElem?.getAttribute('data-miniprofile');
            const steamID = miniprofile
                ? new steamid_1.default('[U:1:' + miniprofile + ']')
                : new steamid_1.default(authorElem?.getAttribute('href')?.match(/\/profiles\/(\d+)/)?.[1] ?? '0');
            const tsElem = el.querySelector('.commentthread_comment_timestamp');
            const dateStr = tsElem?.getAttribute('title') ?? tsElem?.textContent.trim() ?? '';
            const textElem = el.querySelector('.commentthread_comment_text');
            const avatarSrc = el.querySelector('.playerAvatar img')?.getAttribute('src');
            const stateClass = el.querySelector('.playerAvatar')?.getAttribute('class') ?? '';
            const stateMatch = stateClass.match(/\bpersonastate(\w+)\b/) ??
                stateClass.match(/\bonline\b|\boffline\b|\bin-game\b/);
            const state = stateMatch?.[1] ?? stateMatch?.[0] ?? 'offline';
            comments.push({
                id: commentId,
                author: {
                    steamID,
                    name: authorElem?.textContent.trim() ?? '',
                    avatar: avatarSrc,
                    state,
                },
                date: helpers_1.Helpers.decodeSteamTime(dateStr),
                text: textElem?.textContent.trim() ?? '',
                html: textElem?.innerHTML ?? '',
            });
        }
        callback?.(null, [comments, totalCount]);
    }, 'steamcommunity');
};
// ─── inviteUserToGroup ───────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.inviteUserToGroup = function (userID, groupID, callback) {
    const sidUser = toSteamID(userID);
    const sidGroup = toSteamID(groupID);
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/actions/GroupInvite',
        form: {
            group: sidGroup.getSteamID64(),
            invitee: sidUser.getSteamID64(),
            json: 1,
            sessionID: this.getSessionID(),
            type: 'groupInvite',
        },
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── followUser ──────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.followUser = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}/followuser/`,
        form: { sessionid: this.getSessionID() },
        json: true,
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── unfollowUser ────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.unfollowUser = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}/unfollowuser/`,
        form: { sessionid: this.getSessionID() },
        json: true,
    }, (err) => { callback?.(err); }, 'steamcommunity');
};
// ─── getUserAliases ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getUserAliases = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestGet({
        uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}/ajaxaliases`,
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const raw = body;
        if (!Array.isArray(raw)) {
            callback(new Error('Malformed response'), null);
            return;
        }
        const result = raw.map((entry) => ({
            newname: String(entry['newname'] ?? ''),
            timechanged: helpers_1.Helpers.decodeSteamTime(String(entry['timechanged'] ?? '')),
        }));
        callback(null, result);
    }, 'steamcommunity');
};
// ─── getUserProfileBackground ─────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getUserProfileBackground = function (userID, callback) {
    const sid = toSteamID(userID);
    this.httpRequestGet({ uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}` }, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const html = typeof body === 'string' ? body : '';
        const bgRoot = (0, node_html_parser_1.parse)(html);
        if (bgRoot.querySelector('.profile_private_info')) {
            callback(new Error('Profile is private'), null);
            return;
        }
        const bgStyle = bgRoot.querySelector('.has_profile_background')?.getAttribute('style') ??
            bgRoot.querySelector('[class*="profile_background"]')?.getAttribute('style') ?? '';
        const bgMatch = bgStyle.match(/background-image:\s*url\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
        if (bgMatch?.[1]) {
            callback(null, bgMatch[1]);
            return;
        }
        callback(null, null);
    }, 'steamcommunity');
};
// ─── getUserInventoryContexts ─────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getUserInventoryContexts = function (userID, callback) {
    let sid;
    if (typeof userID === 'function') {
        callback = userID;
        sid = this.steamID ?? new steamid_1.default();
    }
    else {
        sid = toSteamID(userID);
    }
    this.httpRequestGet({ uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}/inventory/` }, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        const html = typeof body === 'string' ? body : '';
        const match = html.match(/var g_rgAppContextData = ([^\n]+);/);
        if (!match?.[1]) {
            callback?.(new Error('Malformed response'), null);
            return;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(match[1]);
        }
        catch {
            callback?.(new Error('Malformed response'), null);
            return;
        }
        callback?.(null, parsed);
    }, 'steamcommunity');
};
// ─── getUserInventory (deprecated) ───────────────────────────────────────────
/** @deprecated Use getUserInventoryContents instead. */
SteamCommunity_1.SteamCommunity.prototype.getUserInventory = function (userID, appID, contextID, tradableOnly, callback) {
    const sid = toSteamID(userID);
    const inventory = [];
    const currency = [];
    const fetchPage = (start) => {
        const qs = {
            trading: tradableOnly ? 1 : undefined,
        };
        if (start !== undefined) {
            qs['start'] = start;
        }
        this.httpRequestGet({
            uri: `https://steamcommunity.com/profiles/${sid.getSteamID64()}/inventory/json/${appID}/${contextID}`,
            qs,
            json: true,
        }, (err, _response, body) => {
            if (err) {
                callback(err);
                return;
            }
            const b = body;
            if (!b?.['success'] || !b['rgInventory'] || !b['rgDescriptions'] || !b['rgCurrency']) {
                callback(new Error(b ? String(b['Error'] ?? 'Malformed response') : 'Malformed response'));
                return;
            }
            const rgInventory = (b['rgInventory'] ?? {});
            const rgCurrency = (b['rgCurrency'] ?? {});
            const rgDescriptions = (b['rgDescriptions'] ?? {});
            for (const assetid of Object.keys(rgInventory)) {
                const asset = rgInventory[assetid];
                const descKey = `${String(asset['classid'])}_${String(asset['instanceid'] ?? '0')}`;
                const desc = rgDescriptions[descKey] ?? null;
                const item = new CEconItem_1.CEconItem(asset, desc, contextID);
                if (!tradableOnly || item.tradable) {
                    inventory.push(item);
                }
            }
            for (const currencyid of Object.keys(rgCurrency)) {
                const asset = rgCurrency[currencyid];
                const descKey = `${String(asset['classid'])}_${String(asset['instanceid'] ?? '0')}`;
                const desc = rgDescriptions[descKey] ?? null;
                const item = new CEconItem_1.CEconItem(asset, desc, contextID);
                if (!tradableOnly || item.tradable) {
                    currency.push(item);
                }
            }
            if (b['more']) {
                const moreStart = Number(b['more_start'] ?? 0);
                fetchPage(moreStart);
            }
            else {
                callback(null, inventory, currency);
            }
        }, 'steamcommunity');
    };
    fetchPage();
};
// ─── getUserInventoryContents ─────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getUserInventoryContents = function (userID, appID, contextID, tradableOnly, language, callback) {
    if (typeof language === 'function') {
        callback = language;
        language = 'english';
    }
    const lang = String(language);
    const sid = toSteamID(userID);
    const inventory = [];
    const currency = [];
    const fetchPage = (startAssetID) => {
        const qs = {
            l: lang,
            count: 1000,
        };
        if (startAssetID !== undefined) {
            qs['start_assetid'] = startAssetID;
        }
        this.httpRequestGet({
            uri: `https://steamcommunity.com/inventory/${sid.getSteamID64()}/${appID}/${contextID}`,
            qs,
            json: true,
        }, (err, _response, body) => {
            if (err) {
                callback(err);
                return;
            }
            const b = body;
            if (!b || (!b['assets'] && !b['inventory'])) {
                if (!b?.['success'] && b?.['error']) {
                    callback(new Error(String(b['error'])));
                }
                else if (startAssetID === undefined && !inventory.length && !currency.length) {
                    // Empty inventory is valid
                    callback(null, inventory, currency, 0);
                }
                else {
                    callback(null, inventory, currency, Number(b?.['total_inventory_count'] ?? 0));
                }
                return;
            }
            // Build description lookup table
            const descriptions = {};
            const rawDescs = (b['descriptions'] ?? []);
            for (const desc of rawDescs) {
                const classid = String(desc['classid'] ?? '');
                const instanceid = String(desc['instanceid'] ?? '0');
                descriptions[`${classid}_${instanceid}`] = desc;
            }
            // Build asset properties lookup table
            const assetPropsMap = {};
            const rawAssetProps = (b['asset_properties'] ?? []);
            for (const entry of rawAssetProps) {
                if (entry.assetid) {
                    assetPropsMap[entry.assetid] = entry;
                }
            }
            function getDescription(classid, instanceid) {
                return descriptions[`${classid}_${instanceid}`] ?? null;
            }
            function getAssetProperties(assetid) {
                return assetPropsMap[assetid];
            }
            const assets = (b['assets'] ?? []);
            for (const asset of assets) {
                const classid = String(asset['classid'] ?? '');
                const instanceid = String(asset['instanceid'] ?? '0');
                const assetid = String(asset['assetid'] ?? asset['id'] ?? '');
                const desc = getDescription(classid, instanceid);
                const assetProps = getAssetProperties(assetid);
                const item = new CEconItem_1.CEconItem(asset, desc, contextID, assetProps);
                if (item.is_currency) {
                    if (!tradableOnly || item.tradable) {
                        currency.push(item);
                    }
                }
                else {
                    if (!tradableOnly || item.tradable) {
                        inventory.push(item);
                    }
                }
            }
            const totalInventoryCount = Number(b['total_inventory_count'] ?? 0);
            if (b['more_items']) {
                const lastAssetID = String(b['last_assetid'] ?? '');
                fetchPage(lastAssetID);
            }
            else {
                callback(null, inventory, currency, totalInventoryCount);
            }
        }, 'steamcommunity');
    };
    fetchPage();
};
// ─── sendImageToUser ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.sendImageToUser = function (userID, imageContentsBuffer, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    const opts = options;
    const sid = toSteamID(userID);
    const sessionid = this.getSessionID();
    // Compute file metadata
    const fileSha = crypto_1.default.createHash('sha1').update(imageContentsBuffer).digest('hex');
    const fileSize = imageContentsBuffer.length;
    let dimensions;
    try {
        const sized = (0, image_size_1.imageSize)(imageContentsBuffer);
        dimensions = { width: sized.width ?? 0, height: sized.height ?? 0 };
    }
    catch {
        dimensions = { width: 0, height: 0 };
    }
    // Detect file type from magic bytes
    let fileType = 'image/jpeg';
    if (imageContentsBuffer[0] === 0x89 && imageContentsBuffer[1] === 0x50) {
        fileType = 'image/png';
    }
    else if (imageContentsBuffer[0] === 0x47 && imageContentsBuffer[1] === 0x49) {
        fileType = 'image/gif';
    }
    const fileName = `image.${fileType === 'image/png' ? 'png' : fileType === 'image/gif' ? 'gif' : 'jpg'}`;
    // Stage 1: beginfileupload
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/chat/beginfileupload/?l=english',
        formData: {
            sessionid,
            l: 'english',
            file_size: String(fileSize),
            file_name: fileName,
            file_sha: fileSha,
            file_image_width: String(dimensions.width),
            file_image_height: String(dimensions.height),
            file_type: fileType,
        },
        json: true,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        const startResult = body;
        if (!startResult?.['ugcid']) {
            callback?.(new Error('Malformed beginfileupload response'), null);
            return;
        }
        const urlHost = String(startResult['url_host'] ?? '');
        const urlPath = String(startResult['url_path'] ?? '');
        const ugcid = String(startResult['ugcid']);
        const timestamp = String(startResult['timestamp'] ?? '');
        const hmac = String(startResult['hmac'] ?? '');
        const requestHeaders = (startResult['request_headers'] ?? []);
        const putHeaders = {
            'Content-Type': fileType,
        };
        for (const header of requestHeaders) {
            const name = String(header['name'] ?? '');
            const value = String(header['value'] ?? '');
            if (name) {
                putHeaders[name] = value;
            }
        }
        const putUrl = urlHost.startsWith('http') ? urlHost + urlPath : `https://${urlHost}${urlPath}`;
        // Stage 2: PUT image to upload URL
        this.httpRequest({
            uri: putUrl,
            method: 'PUT',
            headers: putHeaders,
            body: imageContentsBuffer,
            checkHttpError: false,
            checkCommunityError: false,
            checkTradeError: false,
        }, (putErr) => {
            if (putErr) {
                callback?.(putErr, null);
                return;
            }
            // Stage 3: commitfileupload
            this.httpRequestPost({
                uri: 'https://steamcommunity.com/chat/commitfileupload/',
                formData: {
                    sessionid,
                    l: 'english',
                    file_name: fileName,
                    file_sha: fileSha,
                    success: '1',
                    ugcid,
                    file_type: fileType,
                    file_image_width: String(dimensions.width),
                    file_image_height: String(dimensions.height),
                    timestamp,
                    hmac,
                    friend_steamid: sid.getSteamID64(),
                    spoiler: opts.spoiler ? '1' : '0',
                },
                json: true,
            }, (commitErr, _commitResponse, commitBody) => {
                if (commitErr) {
                    callback?.(commitErr, null);
                    return;
                }
                const cb = commitBody;
                const resultUrl = cb?.['result']?.['details']?.['url'];
                if (typeof resultUrl !== 'string') {
                    callback?.(new Error('Malformed commitfileupload response'), null);
                    return;
                }
                callback?.(null, resultUrl);
            }, 'steamcommunity');
        }, 'steamcommunity');
    }, 'steamcommunity');
};
//# sourceMappingURL=users.js.map