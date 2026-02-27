"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMarketItem = void 0;
const node_html_parser_1 = require("node-html-parser");
const SteamCommunity_1 = require("../SteamCommunity");
SteamCommunity_1.SteamCommunity.prototype.getMarketItem = function (appid, hashName, currency, callback) {
    if (typeof currency === 'function') {
        callback = currency;
        currency = 1;
    }
    this.httpRequest(`https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(hashName)}`, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const bodyStr = String(body);
        const root = (0, node_html_parser_1.parse)(bodyStr);
        const noListings = root.querySelector('.market_listing_table_message')?.textContent.trim();
        if (noListings === 'There are no listings for this item.') {
            callback(new Error('There are no listings for this item.'), null);
            return;
        }
        const item = new CMarketItem(appid, hashName, this, bodyStr);
        item.updatePrice(currency, (priceErr) => {
            if (priceErr) {
                callback(priceErr, null);
            }
            else {
                callback(null, item);
            }
        });
    }, 'steamcommunity');
};
// ─── CMarketItem class ────────────────────────────────────────────────────────
class CMarketItem {
    commodity;
    commodityID;
    medianSalePrices;
    firstAsset;
    assets;
    quantity;
    lowestPrice;
    buyQuantity;
    highestBuyOrder;
    constructor(appid, hashName, community, body) {
        Object.defineProperty(this, '_community', { value: community, enumerable: false });
        Object.defineProperty(this, '_appid', { value: appid, enumerable: false });
        Object.defineProperty(this, '_hashName', { value: hashName, enumerable: false });
        let match;
        this._country = 'US';
        match = body.match(/var g_strCountryCode = "([^"]+)";/);
        if (match)
            this._country = match[1];
        this._language = 'english';
        match = body.match(/var g_strLanguage = "([^"]+)";/);
        if (match)
            this._language = match[1];
        this.commodity = false;
        match = body.match(/Market_LoadOrderSpread\(\s*(\d+)\s*\);/);
        if (match) {
            this.commodity = true;
            this.commodityID = parseInt(match[1], 10);
        }
        this.medianSalePrices = null;
        match = body.match(/var line1=([^;]+);/);
        if (match) {
            try {
                const raw = JSON.parse(match[1]);
                this.medianSalePrices = raw.map(([hour, price, quantity]) => ({
                    hour: new Date(hour),
                    price,
                    quantity: parseInt(quantity, 10),
                }));
            }
            catch {
                // ignore
            }
        }
        this.firstAsset = null;
        this.assets = null;
        match = body.match(/var g_rgAssets = (.*);/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                const byApp = parsed[appid];
                if (byApp) {
                    const firstCtx = byApp[Object.keys(byApp)[0]];
                    if (firstCtx) {
                        this.assets = firstCtx;
                        this.firstAsset = firstCtx[Object.keys(firstCtx)[0]];
                    }
                }
            }
            catch {
                // ignore
            }
        }
        this.quantity = 0;
        this.lowestPrice = 0;
    }
    updatePrice(currency, callback) {
        if (this.commodity) {
            this.updatePriceForCommodity(currency, callback);
        }
        else {
            this.updatePriceForNonCommodity(currency, callback);
        }
    }
    updatePriceForCommodity(currency, callback) {
        if (!this.commodity) {
            throw new Error('Cannot update price for non-commodity item');
        }
        this._community.httpRequest({
            uri: `https://steamcommunity.com/market/itemordershistogram?country=US&language=english&currency=${currency}&item_nameid=${this.commodityID}`,
            json: true,
        }, (err, _response, body) => {
            const b = body;
            if (err) {
                callback(err);
                return;
            }
            if (b['success'] !== 1) {
                callback(new Error('Error ' + b['success']));
                return;
            }
            const sellSummary = String(b['sell_order_summary'] ?? '');
            const sellMatch = sellSummary.match(/<span class="market_commodity_orders_header_promote">(\d+)<\/span>/);
            if (sellMatch)
                this.quantity = parseInt(sellMatch[1], 10);
            this.buyQuantity = 0;
            const buySummary = String(b['buy_order_summary'] ?? '');
            const buyMatch = buySummary.match(/<span class="market_commodity_orders_header_promote">(\d+)<\/span>/);
            if (buyMatch)
                this.buyQuantity = parseInt(buyMatch[1], 10);
            this.lowestPrice = parseInt(String(b['lowest_sell_order'] ?? '0'), 10);
            this.highestBuyOrder = parseInt(String(b['highest_buy_order'] ?? '0'), 10);
            callback(null);
        }, 'steamcommunity');
    }
    updatePriceForNonCommodity(currency, callback) {
        if (this.commodity) {
            throw new Error('Cannot update price for commodity item');
        }
        this._community.httpRequest({
            uri: `https://steamcommunity.com/market/listings/${this._appid}/${encodeURIComponent(this._hashName)}/render/?query=&start=0&count=10&country=US&language=english&currency=${currency}`,
            json: true,
        }, (err, _response, body) => {
            const b = body;
            if (err) {
                callback(err);
                return;
            }
            if (b['success'] !== 1) {
                callback(new Error('Error ' + b['success']));
                return;
            }
            const totalCount = b['total_count'];
            if (totalCount)
                this.quantity = parseInt(String(totalCount), 10);
            const root = (0, node_html_parser_1.parse)(String(b['results_html'] ?? ''));
            for (const el of root.querySelectorAll('.market_listing_price.market_listing_price_with_fee')) {
                const raw = (el.textContent ?? '').replace(',', '.').replace(/[^\d.]/g, '');
                const parsed = parseFloat(raw);
                if (!isNaN(parsed)) {
                    this.lowestPrice = parsed;
                    break;
                }
            }
            callback(null);
        }, 'steamcommunity');
    }
}
exports.CMarketItem = CMarketItem;
//# sourceMappingURL=CMarketItem.js.map