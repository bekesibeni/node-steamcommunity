import SteamID from 'steamid';
import { XMLParser } from 'fast-xml-parser';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from '../components/helpers';
import type { Callback, SimpleCallback, GroupAnnouncement } from '../types';

// ─── Augment SteamCommunity with getSteamGroup ────────────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getSteamGroup(id: SteamID | string, callback: Callback<CSteamGroup>): void;
	}
}

SteamCommunity.prototype.getSteamGroup = function (
	this: SteamCommunity,
	id: SteamID | string,
	callback: Callback<CSteamGroup>,
): void {
	if (typeof id !== 'string' && !Helpers.isSteamID(id)) {
		throw new Error('id parameter should be a group URL string or a SteamID object');
	}

	if (typeof id === 'object') {
		const sid = id as SteamID;
		if (sid.universe !== SteamID.Universe.PUBLIC || sid.type !== SteamID.Type.CLAN) {
			throw new Error('SteamID must stand for a clan account in the public universe');
		}
	}

	const url = typeof id === 'string'
		? `https://steamcommunity.com/groups/${id}/memberslistxml/?xml=1`
		: `https://steamcommunity.com/gid/${id.toString()}/memberslistxml/?xml=1`;

	this.httpRequest(url, (err, _response, body) => {
		if (err) { callback(err, null!); return; }
		try {
			const parser = new XMLParser({ parseTagValue: false });
			const doc = parser.parse(String(body)) as { memberList: Record<string, unknown> };
			callback(null, new CSteamGroup(this, doc.memberList));
		} catch (ex) {
			callback(ex as Error, null!);
		}
	}, 'steamcommunity');
};

// ─── CSteamGroup class ────────────────────────────────────────────────────────

export class CSteamGroup {
	declare private readonly _community: SteamCommunity;

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

	constructor(community: SteamCommunity, ml: Record<string, unknown>) {
		Object.defineProperty(this, '_community', { value: community, enumerable: false });

		const details = ml['groupDetails'] as Record<string, unknown> ?? {};
		const str = (obj: Record<string, unknown>, key: string): string => String(obj[key] ?? '');

		this.steamID       = new SteamID(str(ml, 'groupID64'));
		this.name          = str(details, 'groupName');
		this.url           = str(details, 'groupURL');
		this.headline      = str(details, 'headline');
		this.summary       = str(details, 'summary');
		this.avatarHash    = str(details, 'avatarIcon').match(/([0-9a-f]+)\.jpg$/)![1]!;
		this.members       = parseInt(str(details, 'memberCount'),    10);
		this.membersInChat = parseInt(str(details, 'membersInChat'),  10);
		this.membersInGame = parseInt(str(details, 'membersInGame'),  10);
		this.membersOnline = parseInt(str(details, 'membersOnline'),  10);
	}

	getAvatarURL(size?: '' | 'full' | 'medium', protocol = 'https://'): string {
		const base = `${protocol}steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${this.avatarHash.substring(0, 2)}/${this.avatarHash}`;
		return size === 'full' || size === 'medium' ? `${base}_${size}.jpg` : `${base}.jpg`;
	}

	getMembers(addressesOrCallback: string[] | Callback<SteamID[]>, callback?: Callback<SteamID[]>): void {
		if (typeof addressesOrCallback === 'function') {
			this._community.getGroupMembers(this.steamID, addressesOrCallback, null!, null!, null, 0);
		} else {
			this._community.getGroupMembers(this.steamID, callback!, null!, null!, addressesOrCallback, 0);
		}
	}

	join(callback?: SimpleCallback): void { this._community.joinGroup(this.steamID, callback); }
	leave(callback?: SimpleCallback): void { this._community.leaveGroup(this.steamID, callback); }

	getAllAnnouncements(time: Date | Callback<GroupAnnouncement[]>, callback?: Callback<GroupAnnouncement[]>): void {
		this._community.getAllGroupAnnouncements(this.steamID, time as Date, callback!);
	}

	postAnnouncement(headline: string, content: string, hidden: boolean | SimpleCallback, callback?: SimpleCallback): void {
		this._community.postGroupAnnouncement(this.steamID, headline, content, hidden as boolean, callback);
	}

	editAnnouncement(announcementID: string, headline: string, content: string, callback?: SimpleCallback): void {
		this._community.editGroupAnnouncement(this.steamID, announcementID, headline, content, callback);
	}

	deleteAnnouncement(announcementID: string, callback?: SimpleCallback): void {
		this._community.deleteGroupAnnouncement(this.steamID, announcementID, callback);
	}

	scheduleEvent(name: string, type: string | number, description: string, time: Date | null, server: import('../components/groups').GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void {
		this._community.scheduleGroupEvent(this.steamID, name, type, description, time, server, callback);
	}

	editEvent(id: string, name: string, type: string | number, description: string, time: Date | null, server: import('../components/groups').GroupEventServer | string | SimpleCallback, callback?: SimpleCallback): void {
		this._community.editGroupEvent(this.steamID, id, name, type, description, time, server, callback);
	}

	deleteEvent(id: string, callback?: SimpleCallback): void {
		this._community.deleteGroupEvent(this.steamID, id, callback);
	}

	setPlayerOfTheWeek(steamID: SteamID | string, callback?: Callback<[SteamID, SteamID]>): void {
		this._community.setGroupPlayerOfTheWeek(this.steamID, steamID, callback);
	}

	kick(steamID: SteamID | string, callback?: SimpleCallback): void {
		this._community.kickGroupMember(this.steamID, steamID, callback);
	}

	getHistory(page: number | Callback<import('../types').GroupHistoryResult>, callback?: Callback<import('../types').GroupHistoryResult>): void {
		this._community.getGroupHistory(this.steamID, page as number, callback!);
	}

	getAllComments(from: number, count: number, callback: Callback<import('../types').GroupComment[]>): void {
		this._community.getAllGroupComments(this.steamID, from, count, callback);
	}

	deleteComment(cid: string, callback?: SimpleCallback): void {
		this._community.deleteGroupComment(this.steamID, cid, callback);
	}

	comment(message: string, callback?: SimpleCallback): void {
		this._community.postGroupComment(this.steamID, message, callback);
	}

	getJoinRequests(callback: Callback<SteamID[]>): void {
		this._community.getGroupJoinRequests(this.steamID, callback);
	}

	respondToJoinRequests(steamIDs: SteamID | string | SteamID[] | string[], approve: boolean, callback?: SimpleCallback): void {
		this._community.respondToGroupJoinRequests(this.steamID, steamIDs, approve, callback);
	}

	respondToAllJoinRequests(approve: boolean, callback?: SimpleCallback): void {
		this._community.respondToAllGroupJoinRequests(this.steamID, approve, callback);
	}
}
