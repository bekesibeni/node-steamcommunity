import SteamID from 'steamid';
import type { SimpleCallback } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        deleteSharedFileComment(userID: SteamID | string, sharedFileId: string, cid: string, callback?: SimpleCallback): void;
        favoriteSharedFile(sharedFileId: string, appid: number, callback?: SimpleCallback): void;
        postSharedFileComment(userID: SteamID | string, sharedFileId: string, message: string, callback?: SimpleCallback): void;
        subscribeSharedFileComments(userID: SteamID | string, sharedFileId: string, callback?: SimpleCallback): void;
        unfavoriteSharedFile(sharedFileId: string, appid: number, callback?: SimpleCallback): void;
        unsubscribeSharedFileComments(userID: SteamID | string, sharedFileId: string, callback?: SimpleCallback): void;
    }
}
//# sourceMappingURL=sharedfiles.d.ts.map