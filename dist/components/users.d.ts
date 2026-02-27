import SteamID from 'steamid';
import { CEconItem } from '../classes/CEconItem';
import type { Callback, SimpleCallback, UserComment, SteamNotifications } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        parentalUnlock(pin: string, callback?: SimpleCallback): void;
        getNotifications(callback: Callback<SteamNotifications>): void;
        resetItemNotifications(callback?: SimpleCallback): void;
        loggedIn(callback: (err: Error | null, loggedIn?: boolean, familyView?: boolean) => void): void;
        getTradeURL(callback: (err: Error | null, url?: string, token?: string) => void): void;
        changeTradeURL(callback?: (err: Error | null, url?: string, token?: string) => void): void;
        clearPersonaNameHistory(callback?: SimpleCallback): void;
        getFriendsList(callback: Callback<Record<string, number>>): void;
        addFriend(userID: SteamID | string, callback?: SimpleCallback): void;
        acceptFriendRequest(userID: SteamID | string, callback?: SimpleCallback): void;
        removeFriend(userID: SteamID | string, callback?: SimpleCallback): void;
        blockCommunication(userID: SteamID | string, callback?: SimpleCallback): void;
        unblockCommunication(userID: SteamID | string, callback?: SimpleCallback): void;
        postUserComment(userID: SteamID | string, message: string, callback?: Callback<string>): void;
        deleteUserComment(userID: SteamID | string, commentID: string, callback?: SimpleCallback): void;
        getUserComments(userID: SteamID | string, options: Record<string, unknown> | Callback<[UserComment[], number]>, callback?: Callback<[UserComment[], number]>): void;
        inviteUserToGroup(userID: SteamID | string, groupID: SteamID | string, callback?: SimpleCallback): void;
        followUser(userID: SteamID | string, callback?: SimpleCallback): void;
        unfollowUser(userID: SteamID | string, callback?: SimpleCallback): void;
        getUserAliases(userID: SteamID | string, callback: Callback<Array<{
            newname: string;
            timechanged: Date;
        }>>): void;
        getUserProfileBackground(userID: SteamID | string, callback: Callback<string | null>): void;
        getUserInventoryContexts(userID: SteamID | string | Callback<Record<string, unknown>>, callback?: Callback<Record<string, unknown>>): void;
        /** @deprecated Use getUserInventoryContents instead. */
        getUserInventory(userID: SteamID | string, appID: number, contextID: number, tradableOnly: boolean, callback: (err: Error | null, inventory?: CEconItem[], currency?: CEconItem[]) => void): void;
        getUserInventoryContents(userID: SteamID | string, appID: number, contextID: number, tradableOnly: boolean, language: string | Function, callback?: Function): void;
        sendImageToUser(userID: SteamID | string, imageContentsBuffer: Buffer, options: {
            spoiler?: boolean;
        } | Callback<string>, callback?: Callback<string>): void;
    }
}
//# sourceMappingURL=users.d.ts.map