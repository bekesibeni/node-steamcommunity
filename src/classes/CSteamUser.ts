import SteamID from 'steamid';
import { XMLParser } from 'fast-xml-parser';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from '../components/helpers';
import type { Callback, SimpleCallback, UserComment } from '../types';
import type { CEconItem } from './CEconItem';

// ─── Augment SteamCommunity with getSteamUser ─────────────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getSteamUser(id: SteamID | string, callback: Callback<CSteamUser>): void;
	}
}

SteamCommunity.prototype.getSteamUser = function (
	this: SteamCommunity,
	id: SteamID | string,
	callback: Callback<CSteamUser>,
): void {
	// Normalize: a 17-digit string is a SteamID64, not a vanity URL.
	// Convert it to a SteamID object so the routing below handles it correctly —
	// the same pattern used by addFriend, removeFriend, etc.
	if (typeof id === 'string' && /^\d{17}$/.test(id)) {
		id = new SteamID(id);
	}

	if (typeof id !== 'string' && !Helpers.isSteamID(id)) {
		throw new Error('id parameter should be a user URL string or a SteamID object');
	}

	if (typeof id === 'object') {
		const sid = id as SteamID;
		if (sid.universe !== SteamID.Universe.PUBLIC || sid.type !== SteamID.Type.INDIVIDUAL) {
			throw new Error('SteamID must stand for an individual account in the public universe');
		}
	}

	// String → vanity URL path (/id/), SteamID object → numeric path (/profiles/)
	const url = typeof id === 'string'
		? `https://steamcommunity.com/id/${id}/?xml=1`
		: `https://steamcommunity.com/profiles/${id.toString()}/?xml=1`;

	this.httpRequest(url, (err, response, body) => {
		if (err) { callback(err, null!); return; }

		const xmlParser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '_',
			parseTagValue: false,
			isArray: (name) => name === 'group',
		});
		const doc = xmlParser.parse(String(body)) as { profile?: Record<string, unknown>; response?: { error?: string } };

		if (doc.response?.error) { callback(new Error(String(doc.response.error)), null!); return; }
		if (!doc.profile?.steamID64) { callback(new Error('No valid response'), null!); return; }

		// Try to extract a custom URL from the redirect path
		let customurl: string | null = null;
		const redirects = (response as unknown as Record<string, unknown>)?.['request'] as Record<string, unknown> | undefined;
		const redirectArr = redirects?.redirects as Array<{ redirectUri: string }> | undefined;
		if (redirectArr?.length) {
			const match = redirectArr[0]!.redirectUri.match(/https?:\/\/steamcommunity\.com\/id\/([^/]+)\//);
			if (match) customurl = match[1]!;
		}

		callback(null, new CSteamUser(this, doc.profile, customurl));
	}, 'steamcommunity');
};

// ─── CSteamUser class ─────────────────────────────────────────────────────────

export class CSteamUser {
	declare private readonly _community: SteamCommunity;

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

	constructor(
		community: SteamCommunity,
		profile: Record<string, unknown>,
		customurl: string | null,
	) {
		Object.defineProperty(this, '_community', { value: community, enumerable: false });

		// Helper: read a string field from the parsed XML object
		const get = (key: string, defaultVal = ''): string => {
			const val = profile[key];
			return val !== undefined && val !== null ? String(val) : defaultVal;
		};

		this.steamID = new SteamID(get('steamID64'));
		this.name = get('steamID');
		this.onlineState = get('onlineState');
		this.stateMessage = get('stateMessage');
		this.privacyState = get('privacyState') || 'uncreated';
		this.visibilityState = get('visibilityState');

		const avatarMatch = get('avatarIcon').match(/([0-9a-f]+)\.[a-z]+$/);
		this.avatarHash = avatarMatch ? avatarMatch[1]! : null;

		this.vacBanned = get('vacBanned', '0') === '1';
		this.tradeBanState = get('tradeBanState') || 'None';
		this.isLimitedAccount = get('isLimitedAccount') === '1';
		this.customURL = get('customURL') || customurl;

		if (this.visibilityState === '3') {
			let memberSinceValue = get('memberSince', '0').replace(/(\d{1,2})(st|nd|th)/, '$1');
			if (!memberSinceValue.includes(',')) {
				memberSinceValue += ', ' + new Date().getFullYear();
			}
			this.memberSince = new Date(memberSinceValue);
			this.location = get('location') || null;
			this.realName = get('realname') || null;
			this.summary = get('summary') || null;
		} else {
			this.memberSince = null;
			this.location = null;
			this.realName = null;
			this.summary = null;
		}

		this.groups = null;
		this.primaryGroup = null;

		const rawGroups = (profile['groups'] as { group?: Array<Record<string, unknown>> } | undefined)?.group;
		if (rawGroups?.length) {
			let primaryGroup: SteamID | null = null;
			const groups = rawGroups.map((g) => {
				const gid = new SteamID(String(g['groupID64'] ?? ''));
				if (g['_isPrimary'] === '1') primaryGroup = gid;
				return gid;
			});
			(this as { groups: SteamID[] }).groups = groups;
			(this as { primaryGroup: SteamID | null }).primaryGroup = primaryGroup;
		}
	}

	static getAvatarURL(hash?: string | null, size?: '' | 'full' | 'medium', protocol = 'https://'): string {
		const h = hash ?? '72f78b4c8cc1f62323f8a33f6d53e27db57c2252';
		const base = `${protocol}steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${h.substring(0, 2)}/${h}`;
		return size === 'full' || size === 'medium' ? `${base}_${size}.jpg` : `${base}.jpg`;
	}

	getAvatarURL(size?: '' | 'full' | 'medium', protocol?: string): string {
		return CSteamUser.getAvatarURL(this.avatarHash, size, protocol);
	}

	addFriend(callback?: SimpleCallback): void {
		this._community.addFriend(this.steamID, callback);
	}

	acceptFriendRequest(callback?: SimpleCallback): void {
		this._community.acceptFriendRequest(this.steamID, callback);
	}

	removeFriend(callback?: SimpleCallback): void {
		this._community.removeFriend(this.steamID, callback);
	}

	blockCommunication(callback?: SimpleCallback): void {
		this._community.blockCommunication(this.steamID, callback);
	}

	unblockCommunication(callback?: SimpleCallback): void {
		this._community.unblockCommunication(this.steamID, callback);
	}

	comment(message: string, callback?: Callback<string>): void {
		this._community.postUserComment(this.steamID, message, callback);
	}

	deleteComment(commentID: string, callback?: SimpleCallback): void {
		this._community.deleteUserComment(this.steamID, commentID, callback);
	}

	getComments(options: Record<string, unknown> | Callback<[UserComment[], number]>, callback?: Callback<[UserComment[], number]>): void {
		this._community.getUserComments(this.steamID, options as Record<string, unknown>, callback!);
	}

	inviteToGroup(groupID: SteamID | string, callback?: SimpleCallback): void {
		this._community.inviteUserToGroup(this.steamID, groupID, callback);
	}

	follow(callback?: SimpleCallback): void {
		this._community.followUser(this.steamID, callback);
	}

	unfollow(callback?: SimpleCallback): void {
		this._community.unfollowUser(this.steamID, callback);
	}

	getAliases(callback: Callback<Array<{ newname: string; timechanged: Date }>>): void {
		this._community.getUserAliases(this.steamID, callback);
	}

	getInventoryContexts(callback: Callback<Record<string, unknown>>): void {
		this._community.getUserInventoryContexts(this.steamID, callback);
	}

	/** @deprecated Use getInventoryContents */
	getInventory(
		appID: number,
		contextID: number,
		tradableOnly: boolean,
		callback: (err: Error | null, inventory?: CEconItem[], currency?: CEconItem[]) => void,
	): void {
		this._community.getUserInventory(this.steamID, appID, contextID, tradableOnly, callback);
	}

	getInventoryContents(
		appID: number,
		contextID: number,
		tradableOnly: boolean,
		language: string | Callback<[CEconItem[], CEconItem[], number]>,
		callback?: Callback<[CEconItem[], CEconItem[], number]>,
	): void {
		this._community.getUserInventoryContents(
			this.steamID,
			appID,
			contextID,
			tradableOnly,
			language as string,
			callback!,
		);
	}

	getProfileBackground(callback: Callback<string | null>): void {
		this._community.getUserProfileBackground(this.steamID, callback);
	}

	sendImage(
		imageContentsBuffer: Buffer,
		options: { spoiler?: boolean } | Callback<string>,
		callback?: Callback<string>,
	): void {
		this._community.sendImageToUser(this.steamID, imageContentsBuffer, options as { spoiler?: boolean }, callback!);
	}
}
