import SteamID from 'steamid';
import { SteamCommunity } from '../SteamCommunity';
import type { Callback, SimpleCallback, GroupAnnouncement } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getSteamGroup(id: SteamID | string, callback: Callback<CSteamGroup>): void;
    }
}
export declare class CSteamGroup {
    private readonly _community;
    readonly steamID: SteamID;
    readonly name: string;
    readonly url: string;
    readonly headline: string;
    readonly summary: string;
    readonly avatarHash: string;
    readonly members: number;
    readonly membersInChat: number;
    readonly membersInGame: number;
    readonly membersOnline: number;
    constructor(community: SteamCommunity, ml: Record<string, unknown>);
    getAvatarURL(size?: '' | 'full' | 'medium', protocol?: string): string;
    getMembers(addressesOrCallback: string[] | Callback<SteamID[]>, callback?: Callback<SteamID[]>): void;
    join(callback?: SimpleCallback): void;
    leave(callback?: SimpleCallback): void;
    getAllAnnouncements(time: Date | Callback<GroupAnnouncement[]>, callback?: Callback<GroupAnnouncement[]>): void;
    postAnnouncement(headline: string, content: string, hidden: boolean | SimpleCallback, callback?: SimpleCallback): void;
    editAnnouncement(announcementID: string, headline: string, content: string, callback?: SimpleCallback): void;
    deleteAnnouncement(announcementID: string, callback?: SimpleCallback): void;
    scheduleEvent(name: string, type: string | number, description: string, time: Date | null, server: import('../components/groups').GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void;
    editEvent(id: string, name: string, type: string | number, description: string, time: Date | null, server: import('../components/groups').GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void;
    deleteEvent(id: string, callback?: SimpleCallback): void;
    setPlayerOfTheWeek(steamID: SteamID | string, callback?: Callback<[SteamID, SteamID]>): void;
    kick(steamID: SteamID | string, callback?: SimpleCallback): void;
    getHistory(page: number | Callback<import('../types').GroupHistoryResult>, callback?: Callback<import('../types').GroupHistoryResult>): void;
    getAllComments(from: number, count: number, callback: Callback<import('../types').GroupComment[]>): void;
    deleteComment(cid: string, callback?: SimpleCallback): void;
    comment(message: string, callback?: SimpleCallback): void;
    getJoinRequests(callback: Callback<SteamID[]>): void;
    respondToJoinRequests(steamIDs: SteamID | string | SteamID[] | string[], approve: boolean, callback?: SimpleCallback): void;
    respondToAllJoinRequests(approve: boolean, callback?: SimpleCallback): void;
}
//# sourceMappingURL=CSteamGroup.d.ts.map