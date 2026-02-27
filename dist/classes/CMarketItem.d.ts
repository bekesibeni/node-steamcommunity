import { SteamCommunity } from '../SteamCommunity';
import type { Callback, MedianSalePrice } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getMarketItem(appid: number, hashName: string, currency: number | Callback<CMarketItem>, callback?: Callback<CMarketItem>): void;
    }
}
export declare class CMarketItem {
    private readonly _community;
    private readonly _appid;
    private readonly _hashName;
    private _country;
    private _language;
    commodity: boolean;
    commodityID?: number;
    medianSalePrices: MedianSalePrice[] | null;
    firstAsset: Record<string, unknown> | null;
    assets: Record<string, unknown> | null;
    quantity: number;
    lowestPrice: number;
    buyQuantity?: number;
    highestBuyOrder?: number;
    constructor(appid: number, hashName: string, community: SteamCommunity, body: string);
    updatePrice(currency: number, callback: (err: Error | null) => void): void;
    updatePriceForCommodity(currency: number, callback: (err: Error | null) => void): void;
    updatePriceForNonCommodity(currency: number, callback: (err: Error | null) => void): void;
}
//# sourceMappingURL=CMarketItem.d.ts.map