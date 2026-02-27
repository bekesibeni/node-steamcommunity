import type { HttpCallback } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        _checkCommunityError(html: unknown, callback: HttpCallback | (() => void)): Error | false;
        _checkTradeError(html: unknown, callback: HttpCallback | (() => void)): Error | false;
    }
}
//# sourceMappingURL=http.d.ts.map