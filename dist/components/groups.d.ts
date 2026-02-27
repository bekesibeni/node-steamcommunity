import SteamID from 'steamid';
import type { Callback, SimpleCallback, GroupAnnouncement, GroupHistoryResult, GroupComment } from '../types';
export interface GroupEventServer {
    ip: string;
    password: string;
}
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getGroupMembers(gid: SteamID | string, callback: Callback<SteamID[]>, members?: SteamID[] | null, link?: string | null, addresses?: string[] | null, addressIdx?: number): void;
        getGroupMembersEx(gid: SteamID | string, addresses: string[], callback: Callback<SteamID[]>): void;
        joinGroup(gid: SteamID | string, callback?: SimpleCallback): void;
        leaveGroup(gid: SteamID | string, callback?: SimpleCallback): void;
        getAllGroupAnnouncements(gid: SteamID | string, time: Date | Callback<GroupAnnouncement[]>, callback?: Callback<GroupAnnouncement[]>): void;
        postGroupAnnouncement(gid: SteamID | string, headline: string, content: string, hidden: boolean | SimpleCallback, callback?: SimpleCallback): void;
        editGroupAnnouncement(gid: SteamID | string, aid: string, headline: string, content: string, callback?: SimpleCallback): void;
        deleteGroupAnnouncement(gid: SteamID | string, aid: string, callback?: SimpleCallback): void;
        scheduleGroupEvent(gid: SteamID | string, name: string, type: string | number, description: string, time: Date | null, server: GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void;
        editGroupEvent(gid: SteamID | string, id: string, name: string, type: string | number, description: string, time: Date | null, server: GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void;
        deleteGroupEvent(gid: SteamID | string, id: string, callback?: SimpleCallback): void;
        setGroupPlayerOfTheWeek(gid: SteamID | string, steamID: SteamID | string, callback?: Callback<[SteamID, SteamID]>): void;
        kickGroupMember(gid: SteamID | string, steamID: SteamID | string, callback?: SimpleCallback): void;
        getGroupHistory(gid: SteamID | string, page: number | Callback<GroupHistoryResult>, callback?: Callback<GroupHistoryResult>): void;
        getAllGroupComments(gid: SteamID | string, from: number, count: number, callback: Callback<GroupComment[]>): void;
        deleteGroupComment(gid: SteamID | string, cid: string, callback?: SimpleCallback): void;
        postGroupComment(gid: SteamID | string, message: string, callback?: SimpleCallback): void;
        getGroupJoinRequests(gid: SteamID | string, callback: Callback<SteamID[]>): void;
        respondToGroupJoinRequests(gid: SteamID | string, steamIDs: SteamID | string | SteamID[] | string[], approve: boolean, callback?: SimpleCallback): void;
        respondToAllGroupJoinRequests(gid: SteamID | string, approve: boolean, callback?: SimpleCallback): void;
        followCurator(curatorId: string | number, callback?: SimpleCallback): void;
        unfollowCurator(curatorId: string | number, callback?: SimpleCallback): void;
    }
}
//# sourceMappingURL=groups.d.ts.map