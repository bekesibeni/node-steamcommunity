import SteamID from 'steamid';
import { SteamCommunity } from '../SteamCommunity';
import type { Callback, SimpleCallback } from '../types';
import { ESharedFileType } from '../resources/ESharedFileType';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getSteamSharedFile(sharedFileId: string, callback: Callback<CSteamSharedFile>): void;
    }
}
export interface SharedFileData {
    id: string;
    type: ESharedFileType | null;
    appID: number | null;
    owner: SteamID | null;
    fileSize: string | null;
    postDate: Date;
    resolution: string | null;
    uniqueVisitorsCount: number | null;
    favoritesCount: number | null;
    upvoteCount: number | null;
    guideNumRatings: number | null;
    isUpvoted: boolean | null;
    isDownvoted: boolean | null;
}
export declare class CSteamSharedFile implements SharedFileData {
    private readonly _community;
    readonly id: string;
    readonly type: ESharedFileType | null;
    readonly appID: number | null;
    readonly owner: SteamID | null;
    readonly fileSize: string | null;
    readonly postDate: Date;
    readonly resolution: string | null;
    readonly uniqueVisitorsCount: number | null;
    readonly favoritesCount: number | null;
    readonly upvoteCount: number | null;
    readonly guideNumRatings: number | null;
    readonly isUpvoted: boolean | null;
    readonly isDownvoted: boolean | null;
    constructor(community: SteamCommunity, data: SharedFileData);
    deleteComment(cid: string, callback?: SimpleCallback): void;
    favorite(callback?: SimpleCallback): void;
    comment(message: string, callback?: SimpleCallback): void;
    subscribe(callback?: SimpleCallback): void;
    unfavorite(callback?: SimpleCallback): void;
    unsubscribe(callback?: SimpleCallback): void;
}
//# sourceMappingURL=CSteamSharedFile.d.ts.map