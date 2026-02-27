"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSteamGroup = void 0;
const steamid_1 = __importDefault(require("steamid"));
const fast_xml_parser_1 = require("fast-xml-parser");
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("../components/helpers");
SteamCommunity_1.SteamCommunity.prototype.getSteamGroup = function (id, callback) {
    if (typeof id !== 'string' && !helpers_1.Helpers.isSteamID(id)) {
        throw new Error('id parameter should be a group URL string or a SteamID object');
    }
    if (typeof id === 'object') {
        const sid = id;
        if (sid.universe !== steamid_1.default.Universe.PUBLIC || sid.type !== steamid_1.default.Type.CLAN) {
            throw new Error('SteamID must stand for a clan account in the public universe');
        }
    }
    const url = typeof id === 'string'
        ? `https://steamcommunity.com/groups/${id}/memberslistxml/?xml=1`
        : `https://steamcommunity.com/gid/${id.toString()}/memberslistxml/?xml=1`;
    this.httpRequest(url, (err, _response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        try {
            const parser = new fast_xml_parser_1.XMLParser({ parseTagValue: false });
            const doc = parser.parse(String(body));
            callback(null, new CSteamGroup(this, doc.memberList));
        }
        catch (ex) {
            callback(ex, null);
        }
    }, 'steamcommunity');
};
// ─── CSteamGroup class ────────────────────────────────────────────────────────
class CSteamGroup {
    steamID;
    name;
    url;
    headline;
    summary;
    avatarHash;
    members;
    membersInChat;
    membersInGame;
    membersOnline;
    constructor(community, ml) {
        Object.defineProperty(this, '_community', { value: community, enumerable: false });
        const details = ml['groupDetails'] ?? {};
        const str = (obj, key) => String(obj[key] ?? '');
        this.steamID = new steamid_1.default(str(ml, 'groupID64'));
        this.name = str(details, 'groupName');
        this.url = str(details, 'groupURL');
        this.headline = str(details, 'headline');
        this.summary = str(details, 'summary');
        this.avatarHash = str(details, 'avatarIcon').match(/([0-9a-f]+)\.jpg$/)[1];
        this.members = parseInt(str(details, 'memberCount'), 10);
        this.membersInChat = parseInt(str(details, 'membersInChat'), 10);
        this.membersInGame = parseInt(str(details, 'membersInGame'), 10);
        this.membersOnline = parseInt(str(details, 'membersOnline'), 10);
    }
    getAvatarURL(size, protocol = 'https://') {
        const base = `${protocol}steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${this.avatarHash.substring(0, 2)}/${this.avatarHash}`;
        return size === 'full' || size === 'medium' ? `${base}_${size}.jpg` : `${base}.jpg`;
    }
    getMembers(addressesOrCallback, callback) {
        if (typeof addressesOrCallback === 'function') {
            this._community.getGroupMembers(this.steamID, addressesOrCallback, null, null, null, 0);
        }
        else {
            this._community.getGroupMembers(this.steamID, callback, null, null, addressesOrCallback, 0);
        }
    }
    join(callback) { this._community.joinGroup(this.steamID, callback); }
    leave(callback) { this._community.leaveGroup(this.steamID, callback); }
    getAllAnnouncements(time, callback) {
        this._community.getAllGroupAnnouncements(this.steamID, time, callback);
    }
    postAnnouncement(headline, content, hidden, callback) {
        this._community.postGroupAnnouncement(this.steamID, headline, content, hidden, callback);
    }
    editAnnouncement(announcementID, headline, content, callback) {
        this._community.editGroupAnnouncement(this.steamID, announcementID, headline, content, callback);
    }
    deleteAnnouncement(announcementID, callback) {
        this._community.deleteGroupAnnouncement(this.steamID, announcementID, callback);
    }
    scheduleEvent(name, type, description, time, server, callback) {
        this._community.scheduleGroupEvent(this.steamID, name, type, description, time, server, callback);
    }
    editEvent(id, name, type, description, time, server, callback) {
        this._community.editGroupEvent(this.steamID, id, name, type, description, time, server, callback);
    }
    deleteEvent(id, callback) {
        this._community.deleteGroupEvent(this.steamID, id, callback);
    }
    setPlayerOfTheWeek(steamID, callback) {
        this._community.setGroupPlayerOfTheWeek(this.steamID, steamID, callback);
    }
    kick(steamID, callback) {
        this._community.kickGroupMember(this.steamID, steamID, callback);
    }
    getHistory(page, callback) {
        this._community.getGroupHistory(this.steamID, page, callback);
    }
    getAllComments(from, count, callback) {
        this._community.getAllGroupComments(this.steamID, from, count, callback);
    }
    deleteComment(cid, callback) {
        this._community.deleteGroupComment(this.steamID, cid, callback);
    }
    comment(message, callback) {
        this._community.postGroupComment(this.steamID, message, callback);
    }
    getJoinRequests(callback) {
        this._community.getGroupJoinRequests(this.steamID, callback);
    }
    respondToJoinRequests(steamIDs, approve, callback) {
        this._community.respondToGroupJoinRequests(this.steamID, steamIDs, approve, callback);
    }
    respondToAllJoinRequests(approve, callback) {
        this._community.respondToAllGroupJoinRequests(this.steamID, approve, callback);
    }
}
exports.CSteamGroup = CSteamGroup;
//# sourceMappingURL=CSteamGroup.js.map