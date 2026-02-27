"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSteamUser = void 0;
const steamid_1 = __importDefault(require("steamid"));
const fast_xml_parser_1 = require("fast-xml-parser");
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("../components/helpers");
SteamCommunity_1.SteamCommunity.prototype.getSteamUser = function (id, callback) {
    // Normalize: a 17-digit string is a SteamID64, not a vanity URL.
    // Convert it to a SteamID object so the routing below handles it correctly —
    // the same pattern used by addFriend, removeFriend, etc.
    if (typeof id === 'string' && /^\d{17}$/.test(id)) {
        id = new steamid_1.default(id);
    }
    if (typeof id !== 'string' && !helpers_1.Helpers.isSteamID(id)) {
        throw new Error('id parameter should be a user URL string or a SteamID object');
    }
    if (typeof id === 'object') {
        const sid = id;
        if (sid.universe !== steamid_1.default.Universe.PUBLIC || sid.type !== steamid_1.default.Type.INDIVIDUAL) {
            throw new Error('SteamID must stand for an individual account in the public universe');
        }
    }
    // String → vanity URL path (/id/), SteamID object → numeric path (/profiles/)
    const url = typeof id === 'string'
        ? `https://steamcommunity.com/id/${id}/?xml=1`
        : `https://steamcommunity.com/profiles/${id.toString()}/?xml=1`;
    this.httpRequest(url, (err, response, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const xmlParser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '_',
            parseTagValue: false,
            isArray: (name) => name === 'group',
        });
        const doc = xmlParser.parse(String(body));
        if (doc.response?.error) {
            callback(new Error(String(doc.response.error)), null);
            return;
        }
        if (!doc.profile?.steamID64) {
            callback(new Error('No valid response'), null);
            return;
        }
        // Try to extract a custom URL from the redirect path
        let customurl = null;
        const redirects = response?.['request'];
        const redirectArr = redirects?.redirects;
        if (redirectArr?.length) {
            const match = redirectArr[0].redirectUri.match(/https?:\/\/steamcommunity\.com\/id\/([^/]+)\//);
            if (match)
                customurl = match[1];
        }
        callback(null, new CSteamUser(this, doc.profile, customurl));
    }, 'steamcommunity');
};
// ─── CSteamUser class ─────────────────────────────────────────────────────────
class CSteamUser {
    steamID;
    name;
    onlineState;
    stateMessage;
    privacyState;
    visibilityState;
    avatarHash;
    vacBanned;
    tradeBanState;
    isLimitedAccount;
    customURL;
    memberSince;
    location;
    realName;
    summary;
    groups;
    primaryGroup;
    constructor(community, profile, customurl) {
        Object.defineProperty(this, '_community', { value: community, enumerable: false });
        // Helper: read a string field from the parsed XML object
        const get = (key, defaultVal = '') => {
            const val = profile[key];
            return val !== undefined && val !== null ? String(val) : defaultVal;
        };
        this.steamID = new steamid_1.default(get('steamID64'));
        this.name = get('steamID');
        this.onlineState = get('onlineState');
        this.stateMessage = get('stateMessage');
        this.privacyState = get('privacyState') || 'uncreated';
        this.visibilityState = get('visibilityState');
        const avatarMatch = get('avatarIcon').match(/([0-9a-f]+)\.[a-z]+$/);
        this.avatarHash = avatarMatch ? avatarMatch[1] : null;
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
        }
        else {
            this.memberSince = null;
            this.location = null;
            this.realName = null;
            this.summary = null;
        }
        this.groups = null;
        this.primaryGroup = null;
        const rawGroups = profile['groups']?.group;
        if (rawGroups?.length) {
            let primaryGroup = null;
            const groups = rawGroups.map((g) => {
                const gid = new steamid_1.default(String(g['groupID64'] ?? ''));
                if (g['_isPrimary'] === '1')
                    primaryGroup = gid;
                return gid;
            });
            this.groups = groups;
            this.primaryGroup = primaryGroup;
        }
    }
    static getAvatarURL(hash, size, protocol = 'https://') {
        const h = hash ?? '72f78b4c8cc1f62323f8a33f6d53e27db57c2252';
        const base = `${protocol}steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/${h.substring(0, 2)}/${h}`;
        return size === 'full' || size === 'medium' ? `${base}_${size}.jpg` : `${base}.jpg`;
    }
    getAvatarURL(size, protocol) {
        return CSteamUser.getAvatarURL(this.avatarHash, size, protocol);
    }
    addFriend(callback) {
        this._community.addFriend(this.steamID, callback);
    }
    acceptFriendRequest(callback) {
        this._community.acceptFriendRequest(this.steamID, callback);
    }
    removeFriend(callback) {
        this._community.removeFriend(this.steamID, callback);
    }
    blockCommunication(callback) {
        this._community.blockCommunication(this.steamID, callback);
    }
    unblockCommunication(callback) {
        this._community.unblockCommunication(this.steamID, callback);
    }
    comment(message, callback) {
        this._community.postUserComment(this.steamID, message, callback);
    }
    deleteComment(commentID, callback) {
        this._community.deleteUserComment(this.steamID, commentID, callback);
    }
    getComments(options, callback) {
        this._community.getUserComments(this.steamID, options, callback);
    }
    inviteToGroup(groupID, callback) {
        this._community.inviteUserToGroup(this.steamID, groupID, callback);
    }
    follow(callback) {
        this._community.followUser(this.steamID, callback);
    }
    unfollow(callback) {
        this._community.unfollowUser(this.steamID, callback);
    }
    getAliases(callback) {
        this._community.getUserAliases(this.steamID, callback);
    }
    getInventoryContexts(callback) {
        this._community.getUserInventoryContexts(this.steamID, callback);
    }
    /** @deprecated Use getInventoryContents */
    getInventory(appID, contextID, tradableOnly, callback) {
        this._community.getUserInventory(this.steamID, appID, contextID, tradableOnly, callback);
    }
    getInventoryContents(appID, contextID, tradableOnly, language, callback) {
        this._community.getUserInventoryContents(this.steamID, appID, contextID, tradableOnly, language, callback);
    }
    getProfileBackground(callback) {
        this._community.getUserProfileBackground(this.steamID, callback);
    }
    sendImage(imageContentsBuffer, options, callback) {
        this._community.sendImageToUser(this.steamID, imageContentsBuffer, options, callback);
    }
}
exports.CSteamUser = CSteamUser;
//# sourceMappingURL=CSteamUser.js.map