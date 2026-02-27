import { parse } from 'node-html-parser';
import SteamID from 'steamid';
import { XMLParser } from 'fast-xml-parser';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from './helpers';
import { EResult } from '../resources/EResult';
import type {
	Callback,
	SimpleCallback,
	GroupAnnouncement,
	GroupHistoryResult,
	GroupHistoryItem,
	GroupComment,
} from '../types';

// ─── Server type for event scheduling ────────────────────────────────────────

export interface GroupEventServer {
	ip: string;
	password: string;
}

// ─── Augment SteamCommunity ───────────────────────────────────────────────────

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

// ─── Helper ───────────────────────────────────────────────────────────────────

function toSteamID(gid: SteamID | string): SteamID {
	return typeof gid === 'string' ? new SteamID(gid) : gid;
}

// ─── getGroupMembers ──────────────────────────────────────────────────────────

SteamCommunity.prototype.getGroupMembers = function (
	this: SteamCommunity,
	gid: SteamID | string,
	callback: Callback<SteamID[]>,
	members: SteamID[] | null = [],
	link: string | null = null,
	addresses: string[] | null = null,
	addressIdx = 0,
): void {
	members = members ?? [];

	if (!link) {
		if (typeof gid !== 'string') {
			link = `https://steamcommunity.com/gid/${(gid as SteamID).toString()}/memberslistxml/?xml=1`;
		} else {
			try {
				const sid = new SteamID(gid);
				if (sid.type === SteamID.Type.CLAN && sid.isValid()) {
					link = `https://steamcommunity.com/gid/${sid.getSteamID64()}/memberslistxml/?xml=1`;
				} else {
					throw new Error();
				}
			} catch {
				link = `https://steamcommunity.com/groups/${gid}/memberslistxml/?xml=1`;
			}
		}
	}

	if (addressIdx >= (addresses?.length ?? 0)) addressIdx = 0;

	const options: Record<string, unknown> = { uri: link };
	if (addresses?.length) options['localAddress'] = addresses[addressIdx];

	this.httpRequest(options, (err, _res, body) => {
		if (err) { callback(err, null!); return; }

		const mlParser = new XMLParser({ parseTagValue: false, isArray: (n) => n === 'steamID64' });
		const doc = mlParser.parse(String(body)) as { memberList: { members?: { steamID64?: string[] }; nextPageLink?: string } };
		const ml = doc.memberList;

		const newMembers = (members ?? []).concat(
			(ml.members?.steamID64 ?? []).map((id) => new SteamID(id)),
		);

		if (ml.nextPageLink) {
			this.getGroupMembers(gid, callback, newMembers, ml.nextPageLink, addresses, addressIdx + 1);
		} else {
			callback(null, newMembers);
		}
	}, 'steamcommunity');
};

SteamCommunity.prototype.getGroupMembersEx = function (
	this: SteamCommunity,
	gid: SteamID | string,
	addresses: string[],
	callback: Callback<SteamID[]>,
): void {
	this.getGroupMembers(gid, callback, null, null, addresses, 0);
};

// ─── joinGroup / leaveGroup ───────────────────────────────────────────────────

SteamCommunity.prototype.joinGroup = function (this: SteamCommunity, gid: SteamID | string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}`, form: { action: 'join', sessionID: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.leaveGroup = function (this: SteamCommunity, gid: SteamID | string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this._myProfile('home_process', { sessionID: this.getSessionID(), action: 'leaveGroup', groupId: sid.getSteamID64() }, (err) => {
		if (callback) callback(err);
	});
};

// ─── getAllGroupAnnouncements ─────────────────────────────────────────────────

SteamCommunity.prototype.getAllGroupAnnouncements = function (
	this: SteamCommunity,
	gid: SteamID | string,
	time: Date | Callback<GroupAnnouncement[]>,
	callback?: Callback<GroupAnnouncement[]>,
): void {
	if (typeof time === 'function') {
		callback = time;
		time = new Date(0);
	}
	const sid = toSteamID(gid);
	const since = time as Date;

	this.httpRequest({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/rss/` }, (err, _res, body) => {
		if (err) { callback!(err, null!); return; }

		interface RssItem { title: string; link: string; description: string; pubDate: string; author?: string; }
		const rssParser = new XMLParser({ parseTagValue: false, isArray: (n) => n === 'item' });
		const rssDoc = rssParser.parse(String(body)) as { rss?: { channel?: { item?: RssItem[] } } };
		const items = rssDoc.rss?.channel?.item ?? [];
		if (!items.length) { callback!(null, []); return; }

		const announcements: GroupAnnouncement[] = items
			.map((item) => ({
				headline: item.title ?? '',
				content:  item.description ?? '',
				date:     new Date(item.pubDate ?? ''),
				author:   item.author ?? null,
				aid:      String(item.link ?? '').split('/').pop() ?? '',
			}))
			.filter((a) => a.date > since);

		callback!(null, announcements);
	}, 'steamcommunity');
};

// ─── postGroupAnnouncement ───────────────────────────────────────────────────

SteamCommunity.prototype.postGroupAnnouncement = function (
	this: SteamCommunity,
	gid: SteamID | string,
	headline: string,
	content: string,
	hidden: boolean | SimpleCallback,
	callback?: SimpleCallback,
): void {
	if (typeof hidden === 'function') { callback = hidden; hidden = false; }
	const sid = toSteamID(gid);
	const form: Record<string, unknown> = {
		sessionID: this.getSessionID(), action: 'post', headline, body: content,
		'languages[0][headline]': headline, 'languages[0][body]': content,
	};
	if (hidden) form['is_hidden'] = 'is_hidden';
	this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements`, form }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

// ─── editGroupAnnouncement / deleteGroupAnnouncement ─────────────────────────

SteamCommunity.prototype.editGroupAnnouncement = function (this: SteamCommunity, gid: SteamID | string, aid: string, headline: string, content: string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestPost(
		{
			uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements`,
			form: { sessionID: this.getSessionID(), gid: aid, action: 'update', headline, body: content, 'languages[0][headline]': headline, 'languages[0][body]': content, 'languages[0][updated]': 1 },
		},
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.deleteGroupAnnouncement = function (this: SteamCommunity, gid: SteamID | string, aid: string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestGet(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements/delete/${aid}?sessionID=${this.getSessionID()}` },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

// ─── Event helpers ────────────────────────────────────────────────────────────

function buildEventForm(sessionid: string, action: string, extra: Record<string, unknown>, time: Date | null, server: GroupEventServer | string | SimpleCallback, type: string | number): Record<string, unknown> {
	let srv: GroupEventServer = { ip: '', password: '' };
	if (typeof server === 'string') srv = { ip: server, password: '' };
	else if (typeof server === 'object' && !('call' in server)) srv = server as GroupEventServer;

	const form: Record<string, unknown> = {
		sessionid, action,
		tzOffset: new Date().getTimezoneOffset() * -60,
		type: typeof type === 'number' || !isNaN(parseInt(String(type), 10)) ? 'GameEvent' : String(type),
		appID: typeof type === 'number' || !isNaN(parseInt(String(type), 10)) ? type : '',
		serverIP: srv.ip, serverPassword: srv.password,
		eventQuickTime: 'now',
		...extra,
	};

	if (time === null) {
		form['startDate'] = 'MM/DD/YY'; form['startHour'] = '12'; form['startMinute'] = '00'; form['startAMPM'] = 'PM'; form['timeChoice'] = 'quick';
	} else {
		const m = time.getMonth() + 1;
		const d = time.getDate();
		form['startDate'] = (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d + '/' + time.getFullYear().toString().substring(2);
		const h = time.getHours();
		form['startHour'] = String(h === 0 ? 12 : h > 12 ? h - 12 : h);
		form['startMinute'] = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();
		form['startAMPM'] = h <= 12 ? 'AM' : 'PM';
		form['timeChoice'] = 'specific';
	}

	return form;
}

SteamCommunity.prototype.scheduleGroupEvent = function (this, gid, name, type, description, time, server, callback?) {
	const sid = toSteamID(gid);
	if (typeof server === 'function') { callback = server; server = { ip: '', password: '' }; }
	const form = buildEventForm(this.getSessionID(), 'newEvent', { name, notes: description }, time, server, type);
	this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

SteamCommunity.prototype.editGroupEvent = function (this, gid, id, name, type, description, time, server, callback?) {
	const sid = toSteamID(gid);
	if (typeof server === 'function') { callback = server; server = { ip: '', password: '' }; }
	const form = buildEventForm(this.getSessionID(), 'updateEvent', { name, notes: description, eventID: id }, time, server, type);
	this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

SteamCommunity.prototype.deleteGroupEvent = function (this, gid, id, callback?) {
	const sid = toSteamID(gid);
	this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form: { sessionid: this.getSessionID(), action: 'deleteEvent', eventID: id } }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

// ─── setGroupPlayerOfTheWeek ──────────────────────────────────────────────────

SteamCommunity.prototype.setGroupPlayerOfTheWeek = function (this: SteamCommunity, gid: SteamID | string, steamID: SteamID | string, callback?: Callback<[SteamID, SteamID]>): void {
	const sid = toSteamID(gid);
	const player = toSteamID(steamID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/potwEdit`, form: { xml: 1, action: 'potw', memberId: player.getSteam3RenderedID(), sessionid: this.getSessionID() } },
		(err, res, body) => {
			if (!callback) return;
			if (err ?? res.statusCode !== 200) { callback(err ?? new Error('HTTP error ' + res.statusCode), null!); return; }
			const potwParser = new XMLParser({ parseTagValue: false });
			const potwDoc = potwParser.parse(String(body)) as { response?: { results?: string; oldPOTW?: string; newPOTW?: string } };
			const potwResult = potwDoc.response?.results;
			if (potwResult === 'OK') {
				callback(null, [new SteamID(potwDoc.response?.oldPOTW ?? ''), new SteamID(potwDoc.response?.newPOTW ?? '')]);
			} else {
				callback(new Error(potwResult ?? 'Unknown'), null!);
			}
		},
		'steamcommunity',
	);
};

// ─── kickGroupMember ─────────────────────────────────────────────────────────

SteamCommunity.prototype.kickGroupMember = function (this: SteamCommunity, gid: SteamID | string, steamID: SteamID | string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	const player = toSteamID(steamID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/membersManage`, form: { sessionID: this.getSessionID(), action: 'kick', memberId: player.getSteamID64(), queryString: '' } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

// ─── getGroupHistory ──────────────────────────────────────────────────────────

SteamCommunity.prototype.getGroupHistory = function (this: SteamCommunity, gid: SteamID | string, page: number | Callback<GroupHistoryResult>, callback?: Callback<GroupHistoryResult>): void {
	if (typeof page === 'function') { callback = page; page = 1; }
	const sid = toSteamID(gid);

	this.httpRequest(`https://steamcommunity.com/gid/${sid.getSteamID64()}/history?p=${page}`, (err, _res, body) => {
		if (err) { callback!(err, null!); return; }

		const histRoot = parse(String(body));
		const output: GroupHistoryResult = { items: [] };

		const pagingText = histRoot.querySelector('.group_paging p')?.textContent ?? '';
		const pagingMatch = pagingText.match(/(\d+) - (\d+) of (\d+)/);
		if (pagingMatch) {
			output.first = parseInt(pagingMatch[1]!, 10);
			output.last = parseInt(pagingMatch[2]!, 10);
			output.total = parseInt(pagingMatch[3]!, 10);
		}

		const currentYear = new Date().getFullYear();
		let lastDate = Date.now();

		for (const item of histRoot.querySelectorAll('.historyItem, .historyItemb')) {
			const data: GroupHistoryItem = {
				type: item.querySelector('.historyShort')?.textContent.replace(/ /g, '') ?? '',
				date: new Date(),
			};

			const users = item.querySelectorAll('.whiteLink[data-miniprofile]');
			if (users[0]) {
				const sid1 = new SteamID();
				sid1.universe = SteamID.Universe.PUBLIC;
				sid1.type = SteamID.Type.INDIVIDUAL;
				sid1.instance = SteamID.Instance.DESKTOP;
				sid1.accountid = parseInt(users[0].getAttribute('data-miniprofile') ?? '0', 10);
				data.user = sid1;
			}
			if (users[1]) {
				const sid2 = new SteamID();
				sid2.universe = SteamID.Universe.PUBLIC;
				sid2.type = SteamID.Type.INDIVIDUAL;
				sid2.instance = SteamID.Instance.DESKTOP;
				sid2.accountid = parseInt(users[1].getAttribute('data-miniprofile') ?? '0', 10);
				data.actor = sid2;
			}

			const dateParts = (item.querySelector('.historyDate')?.textContent ?? '').split('@');
			const dateStr = (dateParts[0]?.trim() ?? '').replace(/(st|nd|th)$/, '').trim() + ', ' + currentYear;
			const timeStr = (dateParts[1]?.trim() ?? '').replace(/(am|pm)/, ' $1');
			let date = new Date(dateStr + ' ' + timeStr + ' UTC');
			if (date.getTime() > lastDate) { date.setFullYear(date.getFullYear() - 1); }
			lastDate = date.getTime();
			data.date = date;

			output.items.push(data);
		}

		callback!(null, output);
	}, 'steamcommunity');
};

// ─── getAllGroupComments / deleteGroupComment / postGroupComment ───────────────

SteamCommunity.prototype.getAllGroupComments = function (this: SteamCommunity, gid: SteamID | string, from: number, count: number, callback: Callback<GroupComment[]>): void {
	const sid = toSteamID(gid);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/comment/Clan/render/${sid.getSteamID64()}/-1/`, form: { start: from, count } },
		(err, _res, body) => {
			if (err) { callback(err, null!); return; }
			const parsed = JSON.parse(String(body)) as { comments_html: string };
			const commRoot = parse(parsed.comments_html);
			const comments: GroupComment[] = [];
			for (const el of commRoot.querySelectorAll('.commentthread_comment_content')) {
				const authorEl = el.querySelector('.commentthread_author_link');
				const textEl = el.querySelector('.commentthread_comment_text');
				comments.push({
					authorName: authorEl?.querySelector('bdi')?.textContent ?? '',
					authorId: authorEl?.getAttribute('href')?.replace(/https?:\/\/steamcommunity.com\/(id|profiles)\//, '') ?? '',
					date: Helpers.decodeSteamTime(el.querySelector('.commentthread_comment_timestamp')?.textContent.trim() ?? ''),
					commentId: textEl?.getAttribute('id')?.replace('comment_content_', '') ?? '',
					text: textEl?.innerHTML.trim() ?? '',
				});
			}
			callback(null, comments);
		},
		'steamcommunity',
	);
};

SteamCommunity.prototype.deleteGroupComment = function (this: SteamCommunity, gid: SteamID | string, cid: string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestPost({ uri: `https://steamcommunity.com/comment/Clan/delete/${sid.getSteamID64()}/-1/`, form: { sessionid: this.getSessionID(), gidcomment: String(cid) } }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

SteamCommunity.prototype.postGroupComment = function (this: SteamCommunity, gid: SteamID | string, message: string, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestPost({ uri: `https://steamcommunity.com/comment/Clan/post/${sid.getSteamID64()}/-1/`, form: { comment: message, count: 6, sessionid: this.getSessionID() } }, (err) => { if (callback) callback(err); }, 'steamcommunity');
};

// ─── getGroupJoinRequests / respondToGroupJoinRequests / respondToAllGroupJoinRequests ──

SteamCommunity.prototype.getGroupJoinRequests = function (this: SteamCommunity, gid: SteamID | string, callback: Callback<SteamID[]>): void {
	const sid = toSteamID(gid);
	this.httpRequestGet(`https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, (err, _res, body) => {
		if (!body) { callback(new Error('Malformed response'), null!); return; }
		const matches = String(body).match(/JoinRequests_ApproveDenyUser\(\W*['"](\d+)['"],\W0\W\)/g);
		if (!matches) { callback(null, []); return; }
		const requests = matches.map((m) => new SteamID('[U:1:' + m.match(/JoinRequests_ApproveDenyUser\(\W*['"](\d+)['"],\W0\W\)/)![1] + ']'));
		callback(null, requests);
	}, 'steamcommunity');
};

SteamCommunity.prototype.respondToGroupJoinRequests = function (this: SteamCommunity, gid: SteamID | string, steamIDs: SteamID | string | SteamID[] | string[], approve: boolean, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	const rgAccounts = (Array.isArray(steamIDs) ? steamIDs : [steamIDs]).map((s) => s.toString());
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, form: { rgAccounts, bapprove: approve ? '1' : '0', json: '1', sessionID: this.getSessionID() }, json: true },
		(err, _res, body) => {
			if (!callback) return;
			const code = body as number;
			if (code !== EResult.OK) {
				const e = Object.assign(new Error(EResult[code] ?? 'Error ' + code), { eresult: code });
				callback(e);
			} else {
				callback(null);
			}
		},
		'steamcommunity',
	);
};

SteamCommunity.prototype.respondToAllGroupJoinRequests = function (this: SteamCommunity, gid: SteamID | string, approve: boolean, callback?: SimpleCallback): void {
	const sid = toSteamID(gid);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, form: { bapprove: approve ? '1' : '0', json: '1', action: 'bulkrespond', sessionID: this.getSessionID() }, json: true },
		(err, _res, body) => {
			if (!callback) return;
			const code = body as number;
			if (code !== EResult.OK) {
				const e = Object.assign(new Error(EResult[code] ?? 'Error ' + code), { eresult: code });
				callback(e);
			} else {
				callback(null);
			}
		},
		'steamcommunity',
	);
};

// ─── followCurator / unfollowCurator ──────────────────────────────────────────

function curatorRequest(community: SteamCommunity, curatorId: string | number, follow: number, callback?: SimpleCallback): void {
	community.httpRequestPost(
		{ uri: 'https://store.steampowered.com/curators/ajaxfollow', form: { clanid: curatorId, sessionid: community.getSessionID(), follow }, json: true },
		(err, _res, body) => {
			if (!callback) return;
			if (err) { callback(err); return; }
			const b = body as Record<string, Record<string, unknown>> | null;
			if (b?.['success']?.['success'] !== undefined && b['success']['success'] !== SteamCommunity.EResult.OK) {
				callback(Helpers.eresultError(Number(b['success']['success'])));
				return;
			}
			callback(null);
		},
		'steamcommunity',
	);
}

SteamCommunity.prototype.followCurator = function (this: SteamCommunity, curatorId: string | number, callback?: SimpleCallback): void {
	curatorRequest(this, curatorId, 1, callback);
};

SteamCommunity.prototype.unfollowCurator = function (this: SteamCommunity, curatorId: string | number, callback?: SimpleCallback): void {
	curatorRequest(this, curatorId, 0, callback);
};
