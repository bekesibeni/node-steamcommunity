"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_html_parser_1 = require("node-html-parser");
const FS = __importStar(require("fs"));
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("./helpers");
// ─── Comment privacy state mapping ───────────────────────────────────────────
// Maps ProfilePrivacySettings.comments values to the eCommentPermission integer.
// '1' (private) -> 2, '2' (friends only) -> 0, '3' (public) -> 1
const CommentPrivacyState = {
    '1': 2,
    '2': 0,
    '3': 1,
};
// ─── setupProfile ─────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.setupProfile = function (callback) {
    this._myProfile('edit?welcomed=1', null, (err, response) => {
        if (err) {
            callback?.(err);
            return;
        }
        if (response.statusCode !== 200) {
            callback?.(new Error('HTTP error ' + response.statusCode));
            return;
        }
        callback?.(null);
    }, 'steamcommunity');
};
// ─── editProfile ──────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.editProfile = function (settings, callback) {
    // Step 1: GET the current profile edit page to read existing values
    this._myProfile('edit/info', null, (err, _response, body) => {
        if (err) {
            callback?.(err);
            return;
        }
        const html = typeof body === 'string' ? body : '';
        const root = (0, node_html_parser_1.parse)(html);
        // The existing profile values are embedded as a data attribute on this element
        const configElem = root.querySelector('#profile_edit_config');
        let existingSettings = {};
        const dataAttr = configElem?.getAttribute('data-profile-edit');
        if (dataAttr) {
            try {
                existingSettings = JSON.parse(dataAttr);
            }
            catch {
                // Use empty defaults if parsing fails
            }
        }
        // Build the values object from existing settings, then overwrite with user-supplied settings
        const values = {
            sessionID: this.getSessionID(),
            type: 'profileSave',
            weblink_1_title: '',
            weblink_1_url: '',
            weblink_2_title: '',
            weblink_2_url: '',
            weblink_3_title: '',
            weblink_3_url: '',
            personaName: existingSettings['strPersonaName'] ?? '',
            real_name: existingSettings['strRealName'] ?? '',
            summary: existingSettings['strSummary'] ?? '',
            country: existingSettings['LocationData'] != null
                ? String(existingSettings['LocationData']['locCountryCode'] ?? '')
                : '',
            state: existingSettings['LocationData'] != null
                ? String(existingSettings['LocationData']['locStateCode'] ?? '')
                : '',
            city: existingSettings['LocationData'] != null
                ? String(existingSettings['LocationData']['locCityCode'] ?? '')
                : '',
            customURL: existingSettings['strCustomURL'] ?? '',
            primary_group_steamid: existingSettings['primaryGroupSteamid'] ?? '',
            json: 1,
        };
        // Apply user-supplied settings, mapping friendly names to API names
        if (settings.name !== undefined) {
            values['personaName'] = settings.name;
        }
        if (settings.realName !== undefined) {
            values['real_name'] = settings.realName;
        }
        if (settings.summary !== undefined) {
            values['summary'] = settings.summary;
        }
        if (settings.country !== undefined) {
            values['country'] = settings.country;
        }
        if (settings.state !== undefined) {
            values['state'] = settings.state;
        }
        if (settings.city !== undefined) {
            values['city'] = settings.city;
        }
        if (settings.customURL !== undefined) {
            values['customURL'] = settings.customURL;
        }
        if (settings.primaryGroup !== undefined) {
            const pg = settings.primaryGroup;
            values['primary_group_steamid'] = typeof pg === 'string' ? pg : pg.getSteamID64();
        }
        // Step 2: POST the updated settings
        this._myProfile({ endpoint: 'edit', method: 'POST', json: true }, values, (postErr, _postResponse, postBody) => {
            if (postErr) {
                callback?.(postErr);
                return;
            }
            let parsed = null;
            try {
                parsed = JSON.parse(typeof postBody === 'string' ? postBody : JSON.stringify(postBody));
            }
            catch {
                // postBody may already be parsed when json:true
                parsed = postBody;
            }
            if (Number(parsed?.['success']) !== 1) {
                callback?.(new Error(String(parsed?.['errmsg'] ?? 'Unknown error')));
                return;
            }
            callback?.(null);
        }, 'steamcommunity');
    }, 'steamcommunity');
};
// ─── profileSettings ──────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.profileSettings = function (settings, callback) {
    // Step 1: GET the current privacy settings
    this._myProfile('edit/settings', null, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        const html = typeof body === 'string' ? body : '';
        const root = (0, node_html_parser_1.parse)(html);
        const configElem = root.querySelector('#profile_edit_config');
        let existingSettings = {};
        const dataAttr = configElem?.getAttribute('data-profile-edit');
        if (dataAttr) {
            try {
                existingSettings = JSON.parse(dataAttr);
            }
            catch {
                // Use empty defaults
            }
        }
        // Extract existing Privacy object
        const existingPrivacy = (existingSettings['Privacy'] ?? {});
        // Build the privacy state object from existing settings
        const privacy = {
            PrivacyProfile: existingPrivacy['PrivacyProfile'] ?? 3,
            PrivacyInventory: existingPrivacy['PrivacyInventory'] ?? 3,
            PrivacyInventoryGifts: existingPrivacy['PrivacyInventoryGifts'] ?? 0,
            PrivacyOwnedGames: existingPrivacy['PrivacyOwnedGames'] ?? 3,
            PrivacyPlaytime: existingPrivacy['PrivacyPlaytime'] ?? 3,
            PrivacyFriendsList: existingPrivacy['PrivacyFriendsList'] ?? 3,
        };
        // Determine existing eCommentPermission
        let eCommentPermission = existingPrivacy['eCommentPermission'] ??
            Number(existingSettings['eCommentPermission'] ?? 0);
        // Apply user-requested settings
        if (settings.profile !== undefined) {
            privacy['PrivacyProfile'] = settings.profile;
        }
        if (settings.comments !== undefined) {
            const mappedPermission = CommentPrivacyState[String(settings.comments)];
            if (mappedPermission !== undefined) {
                eCommentPermission = mappedPermission;
            }
        }
        if (settings.inventory !== undefined) {
            privacy['PrivacyInventory'] = settings.inventory;
        }
        if (settings.inventoryGifts !== undefined) {
            privacy['PrivacyInventoryGifts'] = settings.inventoryGifts ? 0 : 1;
        }
        if (settings.gameDetails !== undefined) {
            privacy['PrivacyOwnedGames'] = settings.gameDetails;
        }
        if (settings.playtime !== undefined) {
            privacy['PrivacyPlaytime'] = settings.playtime ? 3 : 1;
        }
        if (settings.friendsList !== undefined) {
            privacy['PrivacyFriendsList'] = settings.friendsList;
        }
        // Step 2: POST the updated privacy settings
        this._myProfile({
            endpoint: 'ajaxsetprivacy/',
            method: 'POST',
            json: true,
        }, {
            sessionid: this.getSessionID(),
            Privacy: JSON.stringify(privacy),
            eCommentPermission: String(eCommentPermission),
        }, (postErr, _postResponse, postBody) => {
            if (postErr) {
                callback?.(postErr, null);
                return;
            }
            callback?.(null, postBody);
        }, 'steamcommunity');
    }, 'steamcommunity');
};
// ─── uploadAvatar ─────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.uploadAvatar = function (image, format, callback) {
    if (typeof format === 'function') {
        callback = format;
        format = undefined;
    }
    const doUpload = (buffer, contentType) => {
        const ext = contentType.replace('image/', '');
        const filename = `avatar.${ext}`;
        if (!this.steamID) {
            callback?.(new Error('Not logged in'));
            return;
        }
        this.httpRequestPost({
            uri: 'https://steamcommunity.com/actions/FileUploader',
            formData: {
                MAX_FILE_SIZE: '1048576',
                type: 'player_avatar_image',
                sId: this.steamID.getSteamID64(),
                sessionid: this.getSessionID(),
                doSub: '1',
                json: '1',
                avatar: {
                    value: buffer,
                    options: {
                        filename,
                        contentType,
                    },
                },
            },
            json: true,
        }, (err, _response, body) => {
            if (err) {
                callback?.(err);
                return;
            }
            const b = body;
            if (!b?.['success']) {
                callback?.(new Error(String(b?.['message'] ?? 'Unknown error')));
                return;
            }
            callback?.(null);
        }, 'steamcommunity');
    };
    if (Buffer.isBuffer(image)) {
        doUpload(image, format ?? 'image/jpeg');
    }
    else if (/^https?:\/\//i.test(image)) {
        // Download from URL
        this.httpRequestGet({ uri: image, encoding: null }, (err, response, body) => {
            if (err) {
                callback?.(err);
                return;
            }
            const contentType = String(response.headers['content-type'] ?? format ?? 'image/jpeg').split(';')[0].trim();
            doUpload(body, contentType);
        }, 'steamcommunity');
    }
    else {
        // Read from filesystem — guess format from extension
        const filePath = image;
        const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
        const contentType = (() => {
            switch (ext) {
                case 'png': return 'image/png';
                case 'gif': return 'image/gif';
                case 'jpg':
                case 'jpeg':
                default: return 'image/jpeg';
            }
        })();
        FS.readFile(filePath, (readErr, data) => {
            if (readErr) {
                callback?.(readErr);
                return;
            }
            doUpload(data, format ? String(format) : contentType);
        });
    }
};
// ─── postProfileStatus ────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.postProfileStatus = function (statusText, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    const opts = (options ?? {});
    this._myProfile('ajaxpostuserstatus/', {
        appid: opts.appID ?? 0,
        sessionid: this.getSessionID(),
        status_text: statusText,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err, null);
            return;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
        }
        catch {
            parsed = body;
        }
        const blotterHtml = String(parsed?.['blotter_html'] ?? '');
        const match = blotterHtml.match(/id="userstatus_(\d+)_/);
        if (!match?.[1]) {
            callback?.(new Error('Could not find post ID in response'), null);
            return;
        }
        callback?.(null, parseInt(match[1], 10));
    }, 'steamcommunity');
};
// ─── deleteProfileStatus ──────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.deleteProfileStatus = function (postID, callback) {
    this._myProfile('ajaxdeleteuserstatus/', {
        sessionid: this.getSessionID(),
        postid: postID,
    }, (err, _response, body) => {
        if (err) {
            callback?.(err);
            return;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
        }
        catch {
            parsed = body;
        }
        const eresultErr = helpers_1.Helpers.eresultError(Number(parsed?.['success'] ?? 0));
        callback?.(eresultErr);
    }, 'steamcommunity');
};
//# sourceMappingURL=profile.js.map