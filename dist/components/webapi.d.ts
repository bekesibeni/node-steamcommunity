import type { Callback, CreateApiKeyOptions, CreateApiKeyResponse } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getWebApiKey(unusedOrCallback: null | Callback<string>, callback?: Callback<string>): void;
        createWebApiKey(options: CreateApiKeyOptions, callback: Callback<CreateApiKeyResponse>): void;
        setMobileAppAccessToken(token: string): void;
    }
}
//# sourceMappingURL=webapi.d.ts.map