"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_html_parser_1 = require("node-html-parser");
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("./helpers");
const CMarketSearchResult_1 = require("../classes/CMarketSearchResult");
// ─── getMarketApps ────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getMarketApps = function (callback) {
    this.httpRequest('https://steamcommunity.com/market/', (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const root = (0, node_html_parser_1.parse)(String(body));
        if (!root.querySelector('.market_search_game_button_group')) {
            callback(new Error('Malformed response'), null);
            return;
        }
        const apps = {};
        for (const element of root.querySelectorAll('.market_search_game_button_group a.game_button')) {
            const name = element.querySelector('.game_button_game_name')?.textContent.trim() ?? '';
            const href = element.getAttribute('href') ?? '';
            const appid = href.substring(href.indexOf('=') + 1);
            if (appid)
                apps[appid] = name;
        }
        callback(null, apps);
    }, 'steamcommunity');
};
// ─── marketSearch ─────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.marketSearch = function (options, callback) {
    const qs = {};
    if (typeof options === 'string') {
        qs['query'] = options;
    }
    else {
        qs['query'] = options.query ?? '';
        qs['appid'] = options.appid;
        qs['search_descriptions'] = options.searchDescriptions ? 1 : 0;
        if (options.appid) {
            for (const [k, v] of Object.entries(options)) {
                if (['query', 'appid', 'searchDescriptions'].includes(k))
                    continue;
                qs[`category_${options.appid}_${k}[]`] = `tag_${v}`;
            }
        }
    }
    qs['start'] = 0;
    qs['count'] = 100;
    qs['sort_column'] = 'price';
    qs['sort_dir'] = 'asc';
    const results = [];
    const performSearch = () => {
        this.httpRequest({
            uri: 'https://steamcommunity.com/market/search/render/',
            qs,
            headers: { referer: 'https://steamcommunity.com/market/search' },
            json: true,
        }, (err, _res, body) => {
            if (err) {
                callback(err, null);
                return;
            }
            const b = body;
            if (!b['success']) {
                callback(new Error('Success is not true'), null);
                return;
            }
            if (!b['results_html']) {
                callback(new Error('No results_html in response'), null);
                return;
            }
            const searchRoot = (0, node_html_parser_1.parse)(String(b['results_html']));
            const errMsg = searchRoot.querySelector('.market_listing_table_message');
            if (errMsg) {
                callback(new Error(errMsg.textContent), null);
                return;
            }
            for (const row of searchRoot.querySelectorAll('.market_listing_row_link')) {
                results.push(new CMarketSearchResult_1.CMarketSearchResult(row));
            }
            const start = Number(b['start'] ?? 0);
            const pagesize = Number(b['pagesize'] ?? 0);
            const total = Number(b['total_count'] ?? 0);
            if (start + pagesize >= total) {
                callback(null, results);
            }
            else {
                qs['start'] = start + pagesize;
                performSearch();
            }
        }, 'steamcommunity');
    };
    performSearch();
};
// ─── getGemValue ──────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getGemValue = function (appid, assetid, callback) {
    this._myProfile({
        endpoint: 'ajaxgetgoovalue/',
        qs: { sessionid: this.getSessionID(), appid, contextid: 6, assetid },
        checkHttpError: false,
        json: true,
    }, null, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (b['success'] && b['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity_1.SteamCommunity.EResult[b['success']] ?? '')), { eresult: b['success'], code: b['success'] });
            callback(e, null);
            return;
        }
        if (!b['goo_value'] || !b['strTitle']) {
            callback(new Error('Malformed response'), null);
            return;
        }
        callback(null, { promptTitle: String(b['strTitle']), gemValue: parseInt(String(b['goo_value']), 10) });
    });
};
// ─── turnItemIntoGems ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.turnItemIntoGems = function (appid, assetid, expectedGemsValue, callback) {
    this._myProfile({ endpoint: 'ajaxgrindintogoo/', json: true, checkHttpError: false }, { appid, contextid: 6, assetid, goo_value_expected: expectedGemsValue, sessionid: this.getSessionID() }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (b['success'] && b['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity_1.SteamCommunity.EResult[b['success']])), { eresult: b['success'], code: b['success'] });
            callback(e, null);
            return;
        }
        // Note: 'goo_value_received ' has a trailing space — that's how Valve returns it
        if (!b['goo_value_received '] || !b['goo_value_total']) {
            callback(new Error('Malformed response'), null);
            return;
        }
        callback(null, {
            gemsReceived: parseInt(String(b['goo_value_received ']), 10),
            totalGems: parseInt(String(b['goo_value_total']), 10),
        });
    });
};
// ─── openBoosterPack ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.openBoosterPack = function (appid, assetid, callback) {
    this._myProfile({ endpoint: 'ajaxunpackbooster/', json: true, checkHttpError: false }, { appid, communityitemid: assetid, sessionid: this.getSessionID() }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (b['success'] && b['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity_1.SteamCommunity.EResult[b['success']])), { eresult: b['success'], code: b['success'] });
            callback(e, null);
            return;
        }
        if (!b['rgItems']) {
            callback(new Error('Malformed response'), null);
            return;
        }
        callback(null, b['rgItems']);
    });
};
// ─── getBoosterPackCatalog ────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getBoosterPackCatalog = function (callback) {
    this.httpRequestGet('https://steamcommunity.com/tradingcards/boostercreator/', (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const bodyStr = String(body);
        const idx = bodyStr.indexOf('CBoosterCreatorPage.Init(');
        if (idx === -1) {
            callback(new Error('Malformed response'), null);
            return;
        }
        const lines = bodyStr.slice(idx).split('\n').map((l) => l.trim());
        for (let i = 1; i <= 4; i++) {
            if (typeof lines[i] !== 'string' || !lines[i].match(/,$/)) {
                callback(Object.assign(new Error('Malformed response'), { line: i }), null);
                return;
            }
            lines[i] = lines[i].replace(/,$/, '');
        }
        let boosterPackCatalog;
        let totalGems, tradableGems, untradableGems;
        try {
            boosterPackCatalog = JSON.parse(lines[1]);
            totalGems = parseInt(lines[2].match(/\d+/)[0], 10);
            tradableGems = parseInt(lines[3].match(/\d+/)[0], 10);
            untradableGems = parseInt(lines[4].match(/\d+/)[0], 10);
        }
        catch (ex) {
            callback(Object.assign(new Error('Malformed response'), { inner: ex }), null);
            return;
        }
        const catalog = {};
        for (const app of boosterPackCatalog) {
            const entry = {
                appid: Number(app['appid']),
                name: String(app['name'] ?? ''),
                series: Number(app['series'] ?? 1),
                price: parseInt(String(app['price'] ?? 0), 10),
                unavailable: Boolean(app['unavailable']),
                availableAtTime: null,
            };
            const availAt = app['available_at_time'];
            if (typeof availAt === 'string') {
                entry.availableAtTime = helpers_1.Helpers.decodeSteamTime(availAt);
            }
            catalog[entry.appid] = entry;
        }
        callback(null, { totalGems, tradableGems, untradableGems, catalog });
    });
};
// ─── createBoosterPack ────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.createBoosterPack = function (appid, useUntradableGems, callback) {
    if (typeof useUntradableGems === 'function') {
        callback = useUntradableGems;
        useUntradableGems = false;
    }
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/tradingcards/ajaxcreatebooster/',
        form: {
            sessionid: this.getSessionID(),
            appid,
            series: 1,
            tradability_preference: useUntradableGems ? 3 : 2,
        },
        json: true,
        checkHttpError: false,
    }, (err, res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (b['purchase_eresult'] && b['purchase_eresult'] !== 1) {
            callback(helpers_1.Helpers.eresultError(Number(b['purchase_eresult'])) ?? new Error('Unknown'), null);
            return;
        }
        if (this._checkHttpError(err, res, callback, body))
            return;
        callback(null, {
            totalGems: parseInt(String(b['goo_amount'] ?? 0), 10),
            tradableGems: parseInt(String(b['tradable_goo_amount'] ?? 0), 10),
            untradableGems: parseInt(String(b['untradable_goo_amount'] ?? 0), 10),
            resultItem: b['purchase_result'],
        });
    });
};
// ─── getGiftDetails ───────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getGiftDetails = function (giftID, callback) {
    this.httpRequestPost({ uri: `https://steamcommunity.com/gifts/${giftID}/validateunpack`, form: { sessionid: this.getSessionID() }, json: true }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (b['success'] && b['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity_1.SteamCommunity.EResult[b['success']])), { eresult: b['success'], code: b['success'] });
            callback(e, null);
            return;
        }
        if (!b['packageid'] || !b['gift_name']) {
            callback(new Error('Malformed response'), null);
            return;
        }
        callback(null, { giftName: String(b['gift_name']), packageID: parseInt(String(b['packageid']), 10), owned: Boolean(b['owned']) });
    });
};
// ─── redeemGift ───────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.redeemGift = function (giftID, callback) {
    this.httpRequestPost({ uri: `https://steamcommunity.com/gifts/${giftID}/unpack`, form: { sessionid: this.getSessionID() }, json: true }, (err, _res, body) => {
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (b['success'] && b['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            const e = Object.assign(new Error(String(b['message'] ?? SteamCommunity_1.SteamCommunity.EResult[b['success']])), { eresult: b['success'], code: b['success'] });
            callback(e);
            return;
        }
        callback(null);
    });
};
// ─── _gemExchange ─────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype._gemExchange = function (assetid, denominationIn, denominationOut, quantityIn, quantityOut, callback) {
    this._myProfile({ endpoint: 'ajaxexchangegoo/', json: true, checkHttpError: false }, {
        appid: 753,
        assetid,
        goo_denomination_in: denominationIn,
        goo_amount_in: quantityIn,
        goo_denomination_out: denominationOut,
        goo_amount_out_expected: quantityOut,
        sessionid: this.getSessionID(),
    }, (err, _res, body) => {
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        callback(helpers_1.Helpers.eresultError(Number(b['success'] ?? 0)));
    });
};
// ─── packGemSacks / unpackGemSacks ────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.packGemSacks = function (assetid, desiredSackCount, callback) {
    this._gemExchange(assetid, 1, 1000, desiredSackCount * 1000, desiredSackCount, callback);
};
SteamCommunity_1.SteamCommunity.prototype.unpackGemSacks = function (assetid, sacksToUnpack, callback) {
    this._gemExchange(assetid, 1000, 1, sacksToUnpack, sacksToUnpack * 1000, callback);
};
//# sourceMappingURL=market.js.map