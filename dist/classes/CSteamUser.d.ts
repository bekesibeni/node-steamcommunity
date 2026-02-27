import SteamID from 'steamid';
import { SteamCommunity } from '../SteamCommunity';
import type { Callback, SimpleCallback, UserComment } from '../types';
import type { CEconItem } from './CEconItem';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getSteamUser(id: SteamID | string, callback: Callback<CSteamUser>): void;
    }
}
export declare class CSteamUser {
    private readonly _community;
    readonly steamID: SteamID;
    readonly name: string;
    readonly onlineState: string;
    readonly stateMessage: string;
    readonly privacyState: string;
    readonly visibilityState: string;
    readonly avatarHash: string | null;
    readonly vacBanned: boolean;
    readonly tradeBanState: string;
    readonly isLimitedAccount: boolean;
    readonly customURL: string | null;
    readonly memberSince: Date | null;
    readonly location: string | null;
    readonly realName: string | null;
    readonly summary: string | null;
    readonly groups: SteamID[] | null;
    readonly primaryGroup: SteamID | null;
    constructor(community: SteamCommunity, profile: Record<string, unknown>, customurl: string | null);
    static getAvatarURL(hash?: string | null, size?: '' | 'full' | 'medium', protocol?: string): string;
    getAvatarURL(size?: '' | 'full' | 'medium', protocol?: string): string;
    addFriend(callback?: SimpleCallback): void;
    acceptFriendRequest(callback?: SimpleCallback): void;
    removeFriend(callback?: SimpleCallback): void;
    blockCommunication(callback?: SimpleCallback): void;
    unblockCommunication(callback?: SimpleCallback): void;
    comment(message: string, callback?: Callback<string>): void;
    deleteComment(commentID: string, callback?: SimpleCallback): void;
    getComments(options: Record<string, unknown> | Callback<[UserComment[], number]>, callback?: Callback<[UserComment[], number]>): void;
    inviteToGroup(groupID: SteamID | string, callback?: SimpleCallback): void;
    follow(callback?: SimpleCallback): void;
    unfollow(callback?: SimpleCallback): void;
    getAliases(callback: Callback<Array<{
        newname: string;
        timechanged: Date;
    }>>): void;
    getInventoryContexts(callback: Callback<Record<string, unknown>>): void;
    /** @deprecated Use getInventoryContents */
    getInventory(appID: number, contextID: number, tradableOnly: boolean, callback: (err: Error | null, inventory?: CEconItem[], currency?: CEconItem[]) => void): void;
    getInventoryContents(appID: number, contextID: number, tradableOnly: boolean, language: string | Callback<[CEconItem[], CEconItem[], number]>, callback?: Callback<[CEconItem[], CEconItem[], number]>): void;
    getProfileBackground(callback: Callback<string | null>): void;
    sendImage(imageContentsBuffer: Buffer, options: {
        spoiler?: boolean;
    } | Callback<string>, callback?: Callback<string>): void;
}
//# sourceMappingURL=CSteamUser.d.ts.map