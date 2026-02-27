import type { Callback, InventoryHistoryOptions, InventoryHistoryResult } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        /** @deprecated Use GetTradeHistory Steam Web API instead. */
        getInventoryHistory(options: InventoryHistoryOptions | Callback<InventoryHistoryResult>, callback?: Callback<InventoryHistoryResult>): void;
    }
}
//# sourceMappingURL=inventoryhistory.d.ts.map