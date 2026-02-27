import { CMarketSearchResult } from '../classes/CMarketSearchResult';
import type { Callback, SimpleCallback, BoosterPackCatalogResult } from '../types';
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
        getGemValue(appid: number, assetid: string | number, callback: Callback<{
            promptTitle: string;
            gemValue: number;
        }>): void;
        turnItemIntoGems(appid: number, assetid: string | number, expectedGemsValue: number, callback: Callback<{
            gemsReceived: number;
            totalGems: number;
        }>): void;
        openBoosterPack(appid: number, assetid: string | number, callback: Callback<unknown[]>): void;
        getBoosterPackCatalog(callback: Callback<BoosterPackCatalogResult>): void;
        createBoosterPack(appid: number, useUntradableGems: boolean | Callback<{
            totalGems: number;
            tradableGems: number;
            untradableGems: number;
            resultItem: unknown;
        }>, callback?: Callback<{
            totalGems: number;
            tradableGems: number;
            untradableGems: number;
            resultItem: unknown;
        }>): void;
        getGiftDetails(giftID: string, callback: Callback<{
            giftName: string;
            packageID: number;
            owned: boolean;
        }>): void;
        redeemGift(giftID: string, callback: SimpleCallback): void;
        packGemSacks(assetid: string | number, desiredSackCount: number, callback: SimpleCallback): void;
        unpackGemSacks(assetid: string | number, sacksToUnpack: number, callback: SimpleCallback): void;
        _gemExchange(assetid: string | number, denominationIn: number, denominationOut: number, quantityIn: number, quantityOut: number, callback: SimpleCallback): void;
    }
}
//# sourceMappingURL=market.d.ts.map