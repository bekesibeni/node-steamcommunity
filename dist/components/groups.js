"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_html_parser_1 = require("node-html-parser");
const steamid_1 = __importDefault(require("steamid"));
const fast_xml_parser_1 = require("fast-xml-parser");
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("./helpers");
const EResult_1 = require("../resources/EResult");
// ─── Helper ───────────────────────────────────────────────────────────────────
function toSteamID(gid) {
    return typeof gid === 'string' ? new steamid_1.default(gid) : gid;
}
// ─── getGroupMembers ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getGroupMembers = function (gid, callback, members = [], link = null, addresses = null, addressIdx = 0) {
    members = members ?? [];
    if (!link) {
        if (typeof gid !== 'string') {
            link = `https://steamcommunity.com/gid/${gid.toString()}/memberslistxml/?xml=1`;
        }
        else {
            try {
                const sid = new steamid_1.default(gid);
                if (sid.type === steamid_1.default.Type.CLAN && sid.isValid()) {
                    link = `https://steamcommunity.com/gid/${sid.getSteamID64()}/memberslistxml/?xml=1`;
                }
                else {
                    throw new Error();
                }
            }
            catch {
                link = `https://steamcommunity.com/groups/${gid}/memberslistxml/?xml=1`;
            }
        }
    }
    if (addressIdx >= (addresses?.length ?? 0))
        addressIdx = 0;
    const options = { uri: link };
    if (addresses?.length)
        options['localAddress'] = addresses[addressIdx];
    this.httpRequest(options, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const mlParser = new fast_xml_parser_1.XMLParser({ parseTagValue: false, isArray: (n) => n === 'steamID64' });
        const doc = mlParser.parse(String(body));
        const ml = doc.memberList;
        const newMembers = (members ?? []).concat((ml.members?.steamID64 ?? []).map((id) => new steamid_1.default(id)));
        if (ml.nextPageLink) {
            this.getGroupMembers(gid, callback, newMembers, ml.nextPageLink, addresses, addressIdx + 1);
        }
        else {
            callback(null, newMembers);
        }
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.getGroupMembersEx = function (gid, addresses, callback) {
    this.getGroupMembers(gid, callback, null, null, addresses, 0);
};
// ─── joinGroup / leaveGroup ───────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.joinGroup = function (gid, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}`, form: { action: 'join', sessionID: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.leaveGroup = function (gid, callback) {
    const sid = toSteamID(gid);
    this._myProfile('home_process', { sessionID: this.getSessionID(), action: 'leaveGroup', groupId: sid.getSteamID64() }, (err) => {
        if (callback)
            callback(err);
    });
};
// ─── getAllGroupAnnouncements ─────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getAllGroupAnnouncements = function (gid, time, callback) {
    if (typeof time === 'function') {
        callback = time;
        time = new Date(0);
    }
    const sid = toSteamID(gid);
    const since = time;
    this.httpRequest({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/rss/` }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const rssParser = new fast_xml_parser_1.XMLParser({ parseTagValue: false, isArray: (n) => n === 'item' });
        const rssDoc = rssParser.parse(String(body));
        const items = rssDoc.rss?.channel?.item ?? [];
        if (!items.length) {
            callback(null, []);
            return;
        }
        const announcements = items
            .map((item) => ({
            headline: item.title ?? '',
            content: item.description ?? '',
            date: new Date(item.pubDate ?? ''),
            author: item.author ?? null,
            aid: String(item.link ?? '').split('/').pop() ?? '',
        }))
            .filter((a) => a.date > since);
        callback(null, announcements);
    }, 'steamcommunity');
};
// ─── postGroupAnnouncement ───────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.postGroupAnnouncement = function (gid, headline, content, hidden, callback) {
    if (typeof hidden === 'function') {
        callback = hidden;
        hidden = false;
    }
    const sid = toSteamID(gid);
    const form = {
        sessionID: this.getSessionID(), action: 'post', headline, body: content,
        'languages[0][headline]': headline, 'languages[0][body]': content,
    };
    if (hidden)
        form['is_hidden'] = 'is_hidden';
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements`, form }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── editGroupAnnouncement / deleteGroupAnnouncement ─────────────────────────
SteamCommunity_1.SteamCommunity.prototype.editGroupAnnouncement = function (gid, aid, headline, content, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({
        uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements`,
        form: { sessionID: this.getSessionID(), gid: aid, action: 'update', headline, body: content, 'languages[0][headline]': headline, 'languages[0][body]': content, 'languages[0][updated]': 1 },
    }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.deleteGroupAnnouncement = function (gid, aid, callback) {
    const sid = toSteamID(gid);
    this.httpRequestGet({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/announcements/delete/${aid}?sessionID=${this.getSessionID()}` }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── Event helpers ────────────────────────────────────────────────────────────
function buildEventForm(sessionid, action, extra, time, server, type) {
    let srv = { ip: '', password: '' };
    if (typeof server === 'string')
        srv = { ip: server, password: '' };
    else if (typeof server === 'object' && !('call' in server))
        srv = server;
    const form = {
        sessionid, action,
        tzOffset: new Date().getTimezoneOffset() * -60,
        type: typeof type === 'number' || !isNaN(parseInt(String(type), 10)) ? 'GameEvent' : String(type),
        appID: typeof type === 'number' || !isNaN(parseInt(String(type), 10)) ? type : '',
        serverIP: srv.ip, serverPassword: srv.password,
        eventQuickTime: 'now',
        ...extra,
    };
    if (time === null) {
        form['startDate'] = 'MM/DD/YY';
        form['startHour'] = '12';
        form['startMinute'] = '00';
        form['startAMPM'] = 'PM';
        form['timeChoice'] = 'quick';
    }
    else {
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
SteamCommunity_1.SteamCommunity.prototype.scheduleGroupEvent = function (gid, name, type, description, time, server, callback) {
    const sid = toSteamID(gid);
    if (typeof server === 'function') {
        callback = server;
        server = { ip: '', password: '' };
    }
    const form = buildEventForm(this.getSessionID(), 'newEvent', { name, notes: description }, time, server, type);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.editGroupEvent = function (gid, id, name, type, description, time, server, callback) {
    const sid = toSteamID(gid);
    if (typeof server === 'function') {
        callback = server;
        server = { ip: '', password: '' };
    }
    const form = buildEventForm(this.getSessionID(), 'updateEvent', { name, notes: description, eventID: id }, time, server, type);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.deleteGroupEvent = function (gid, id, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.toString()}/eventEdit`, form: { sessionid: this.getSessionID(), action: 'deleteEvent', eventID: id } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── setGroupPlayerOfTheWeek ──────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.setGroupPlayerOfTheWeek = function (gid, steamID, callback) {
    const sid = toSteamID(gid);
    const player = toSteamID(steamID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/potwEdit`, form: { xml: 1, action: 'potw', memberId: player.getSteam3RenderedID(), sessionid: this.getSessionID() } }, (err, res, body) => {
        if (!callback)
            return;
        if (err ?? res.statusCode !== 200) {
            callback(err ?? new Error('HTTP error ' + res.statusCode), null);
            return;
        }
        const potwParser = new fast_xml_parser_1.XMLParser({ parseTagValue: false });
        const potwDoc = potwParser.parse(String(body));
        const potwResult = potwDoc.response?.results;
        if (potwResult === 'OK') {
            callback(null, [new steamid_1.default(potwDoc.response?.oldPOTW ?? ''), new steamid_1.default(potwDoc.response?.newPOTW ?? '')]);
        }
        else {
            callback(new Error(potwResult ?? 'Unknown'), null);
        }
    }, 'steamcommunity');
};
// ─── kickGroupMember ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.kickGroupMember = function (gid, steamID, callback) {
    const sid = toSteamID(gid);
    const player = toSteamID(steamID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/membersManage`, form: { sessionID: this.getSessionID(), action: 'kick', memberId: player.getSteamID64(), queryString: '' } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── getGroupHistory ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getGroupHistory = function (gid, page, callback) {
    if (typeof page === 'function') {
        callback = page;
        page = 1;
    }
    const sid = toSteamID(gid);
    this.httpRequest(`https://steamcommunity.com/gid/${sid.getSteamID64()}/history?p=${page}`, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const histRoot = (0, node_html_parser_1.parse)(String(body));
        const output = { items: [] };
        const pagingText = histRoot.querySelector('.group_paging p')?.textContent ?? '';
        const pagingMatch = pagingText.match(/(\d+) - (\d+) of (\d+)/);
        if (pagingMatch) {
            output.first = parseInt(pagingMatch[1], 10);
            output.last = parseInt(pagingMatch[2], 10);
            output.total = parseInt(pagingMatch[3], 10);
        }
        const currentYear = new Date().getFullYear();
        let lastDate = Date.now();
        for (const item of histRoot.querySelectorAll('.historyItem, .historyItemb')) {
            const data = {
                type: item.querySelector('.historyShort')?.textContent.replace(/ /g, '') ?? '',
                date: new Date(),
            };
            const users = item.querySelectorAll('.whiteLink[data-miniprofile]');
            if (users[0]) {
                const sid1 = new steamid_1.default();
                sid1.universe = steamid_1.default.Universe.PUBLIC;
                sid1.type = steamid_1.default.Type.INDIVIDUAL;
                sid1.instance = steamid_1.default.Instance.DESKTOP;
                sid1.accountid = parseInt(users[0].getAttribute('data-miniprofile') ?? '0', 10);
                data.user = sid1;
            }
            if (users[1]) {
                const sid2 = new steamid_1.default();
                sid2.universe = steamid_1.default.Universe.PUBLIC;
                sid2.type = steamid_1.default.Type.INDIVIDUAL;
                sid2.instance = steamid_1.default.Instance.DESKTOP;
                sid2.accountid = parseInt(users[1].getAttribute('data-miniprofile') ?? '0', 10);
                data.actor = sid2;
            }
            const dateParts = (item.querySelector('.historyDate')?.textContent ?? '').split('@');
            const dateStr = (dateParts[0]?.trim() ?? '').replace(/(st|nd|th)$/, '').trim() + ', ' + currentYear;
            const timeStr = (dateParts[1]?.trim() ?? '').replace(/(am|pm)/, ' $1');
            let date = new Date(dateStr + ' ' + timeStr + ' UTC');
            if (date.getTime() > lastDate) {
                date.setFullYear(date.getFullYear() - 1);
            }
            lastDate = date.getTime();
            data.date = date;
            output.items.push(data);
        }
        callback(null, output);
    }, 'steamcommunity');
};
// ─── getAllGroupComments / deleteGroupComment / postGroupComment ───────────────
SteamCommunity_1.SteamCommunity.prototype.getAllGroupComments = function (gid, from, count, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/Clan/render/${sid.getSteamID64()}/-1/`, form: { start: from, count } }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const parsed = JSON.parse(String(body));
        const commRoot = (0, node_html_parser_1.parse)(parsed.comments_html);
        const comments = [];
        for (const el of commRoot.querySelectorAll('.commentthread_comment_content')) {
            const authorEl = el.querySelector('.commentthread_author_link');
            const textEl = el.querySelector('.commentthread_comment_text');
            comments.push({
                authorName: authorEl?.querySelector('bdi')?.textContent ?? '',
                authorId: authorEl?.getAttribute('href')?.replace(/https?:\/\/steamcommunity.com\/(id|profiles)\//, '') ?? '',
                date: helpers_1.Helpers.decodeSteamTime(el.querySelector('.commentthread_comment_timestamp')?.textContent.trim() ?? ''),
                commentId: textEl?.getAttribute('id')?.replace('comment_content_', '') ?? '',
                text: textEl?.innerHTML.trim() ?? '',
            });
        }
        callback(null, comments);
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.deleteGroupComment = function (gid, cid, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/Clan/delete/${sid.getSteamID64()}/-1/`, form: { sessionid: this.getSessionID(), gidcomment: String(cid) } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.postGroupComment = function (gid, message, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/Clan/post/${sid.getSteamID64()}/-1/`, form: { comment: message, count: 6, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── getGroupJoinRequests / respondToGroupJoinRequests / respondToAllGroupJoinRequests ──
SteamCommunity_1.SteamCommunity.prototype.getGroupJoinRequests = function (gid, callback) {
    const sid = toSteamID(gid);
    this.httpRequestGet(`https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, (err, _res, body) => {
        if (!body) {
            callback(new Error('Malformed response'), null);
            return;
        }
        const matches = String(body).match(/JoinRequests_ApproveDenyUser\(\W*['"](\d+)['"],\W0\W\)/g);
        if (!matches) {
            callback(null, []);
            return;
        }
        const requests = matches.map((m) => new steamid_1.default('[U:1:' + m.match(/JoinRequests_ApproveDenyUser\(\W*['"](\d+)['"],\W0\W\)/)[1] + ']'));
        callback(null, requests);
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.respondToGroupJoinRequests = function (gid, steamIDs, approve, callback) {
    const sid = toSteamID(gid);
    const rgAccounts = (Array.isArray(steamIDs) ? steamIDs : [steamIDs]).map((s) => s.toString());
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, form: { rgAccounts, bapprove: approve ? '1' : '0', json: '1', sessionID: this.getSessionID() }, json: true }, (err, _res, body) => {
        if (!callback)
            return;
        const code = body;
        if (code !== EResult_1.EResult.OK) {
            const e = Object.assign(new Error(EResult_1.EResult[code] ?? 'Error ' + code), { eresult: code });
            callback(e);
        }
        else {
            callback(null);
        }
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.respondToAllGroupJoinRequests = function (gid, approve, callback) {
    const sid = toSteamID(gid);
    this.httpRequestPost({ uri: `https://steamcommunity.com/gid/${sid.getSteamID64()}/joinRequestsManage`, form: { bapprove: approve ? '1' : '0', json: '1', action: 'bulkrespond', sessionID: this.getSessionID() }, json: true }, (err, _res, body) => {
        if (!callback)
            return;
        const code = body;
        if (code !== EResult_1.EResult.OK) {
            const e = Object.assign(new Error(EResult_1.EResult[code] ?? 'Error ' + code), { eresult: code });
            callback(e);
        }
        else {
            callback(null);
        }
    }, 'steamcommunity');
};
// ─── followCurator / unfollowCurator ──────────────────────────────────────────
function curatorRequest(community, curatorId, follow, callback) {
    community.httpRequestPost({ uri: 'https://store.steampowered.com/curators/ajaxfollow', form: { clanid: curatorId, sessionid: community.getSessionID(), follow }, json: true }, (err, _res, body) => {
        if (!callback)
            return;
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (b?.['success']?.['success'] !== undefined && b['success']['success'] !== SteamCommunity_1.SteamCommunity.EResult.OK) {
            callback(helpers_1.Helpers.eresultError(Number(b['success']['success'])));
            return;
        }
        callback(null);
    }, 'steamcommunity');
}
SteamCommunity_1.SteamCommunity.prototype.followCurator = function (curatorId, callback) {
    curatorRequest(this, curatorId, 1, callback);
};
SteamCommunity_1.SteamCommunity.prototype.unfollowCurator = function (curatorId, callback) {
    curatorRequest(this, curatorId, 0, callback);
};
//# sourceMappingURL=groups.js.map