"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SteamCommunity = exports.PrivacyState = exports.EFriendRelationship = exports.ESharedFileType = exports.EConfirmationType = exports.EResult = exports.SteamID = void 0;
const events_1 = require("events");
const crypto_1 = require("crypto");
const http_1 = require("@doctormckay/stdlib/http");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const http_2 = require("@doctormckay/stdlib/http");
const user_agents_1 = require("@doctormckay/user-agents");
const steamid_1 = __importDefault(require("steamid"));
exports.SteamID = steamid_1.default;
const EResult_1 = require("./resources/EResult");
Object.defineProperty(exports, "EResult", { enumerable: true, get: function () { return EResult_1.EResult; } });
const EConfirmationType_1 = require("./resources/EConfirmationType");
Object.defineProperty(exports, "EConfirmationType", { enumerable: true, get: function () { return EConfirmationType_1.EConfirmationType; } });
const ESharedFileType_1 = require("./resources/ESharedFileType");
Object.defineProperty(exports, "ESharedFileType", { enumerable: true, get: function () { return ESharedFileType_1.ESharedFileType; } });
const EFriendRelationship_1 = require("./resources/EFriendRelationship");
Object.defineProperty(exports, "EFriendRelationship", { enumerable: true, get: function () { return EFriendRelationship_1.EFriendRelationship; } });
const EPersonaState_1 = require("./resources/EPersonaState");
const EPersonaStateFlag_1 = require("./resources/EPersonaStateFlag");
const EChatState_1 = require("./resources/EChatState");
const types_1 = require("./types");
Object.defineProperty(exports, "PrivacyState", { enumerable: true, get: function () { return types_1.PrivacyState; } });
// ─── Main class ──────────────────────────────────────────────────────────────
class SteamCommunity extends events_1.EventEmitter {
    // ── Static enum / constant references (mirrors original JS static props) ──
    static SteamID = steamid_1.default;
    static EResult = EResult_1.EResult;
    static ConfirmationType = EConfirmationType_1.EConfirmationType;
    static ESharedFileType = ESharedFileType_1.ESharedFileType;
    static EFriendRelationship = EFriendRelationship_1.EFriendRelationship;
    static ChatState = EChatState_1.EChatState;
    static PersonaState = EPersonaState_1.EPersonaState;
    static PersonaStateFlag = EPersonaStateFlag_1.EPersonaStateFlag;
    static PrivacyState = types_1.PrivacyState;
    // ── Instance state ─────────────────────────────────────────────────────────
    /** Logged-in account SteamID — set by `setCookies()`. */
    steamID = null;
    /** Mobile app access token — set by `setMobileAppAccessToken()`. */
    mobileAccessToken;
    /** Set this to intercept HTTP requests before they are sent. Return true to delay the request. */
    onPreHttpRequest;
    // ── Internal HTTP ──────────────────────────────────────────────────────────
    _httpClient;
    _jar;
    _captchaGid = -1;
    _httpRequestID = 0;
    _options;
    // ── Cached profile URL (60-second cache) ──────────────────────────────────
    _profileURL;
    // ── Internal convenience method marker (used by httpRequestGet/Post) ──────
    _httpRequestConvenienceMethod;
    // ── Confirmation checker internal state ───────────────────────────────────
    _timeOffset;
    _usedConfTimes;
    _confirmationTimer;
    _confirmationPollInterval;
    _knownConfirmations;
    _confirmationKeys;
    _identitySecret;
    _confirmationQueueState;
    // ─────────────────────────────────────────────────────────────────────────
    constructor(options = {}) {
        super();
        if (typeof options === 'string') {
            options = { localAddress: options };
        }
        this._options = options;
        const userAgent = options.userAgent ?? (0, user_agents_1.chrome)();
        const defaultHeaders = { 'user-agent': userAgent };
        let httpAgent;
        let httpsAgent;
        if (options.socksProxy) {
            httpAgent = new socks_proxy_agent_1.SocksProxyAgent(options.socksProxy);
            httpsAgent = new socks_proxy_agent_1.SocksProxyAgent(options.socksProxy);
        }
        else if (options.httpProxy) {
            httpAgent = (0, http_2.getProxyAgent)(false, options.httpProxy);
            httpsAgent = (0, http_2.getProxyAgent)(true, options.httpProxy);
        }
        this._httpClient = new http_1.HttpClient({
            userAgent,
            defaultHeaders,
            defaultTimeout: options.timeout ?? 50_000,
            cookieJar: true,
            gzip: true,
            localAddress: options.localAddress,
            httpAgent: httpAgent,
            httpsAgent: httpsAgent,
        });
        this._jar = this._httpClient.cookieJar;
        // Defaults
        this._setCookie('Steam_Language=english');
        this._setCookie('timezoneOffset=0,0');
    }
    // ─── Cookie management ────────────────────────────────────────────────────
    _setCookie(cookie, _secure) {
        if (!this._jar || typeof this._jar.add !== 'function') {
            return;
        }
        let domains = [];
        if (/;\s*domain=/i.test(cookie)) {
            const match = cookie.match(/;\s*domain=([^;]+)/i);
            if (match?.[1]) {
                domains.push(match[1].trim());
            }
        }
        if (domains.length === 0) {
            domains = ['steamcommunity.com', 'store.steampowered.com', 'help.steampowered.com'];
        }
        for (const domain of domains) {
            this._jar.add(cookie, domain);
        }
    }
    setCookies(cookies) {
        for (const cookie of cookies) {
            const cookieName = cookie.trim().split('=')[0];
            if (cookieName === 'steamLogin' || cookieName === 'steamLoginSecure') {
                const match = cookie.match(/steamLogin(Secure)?=(\d+)/);
                if (match?.[2]) {
                    this.steamID = new steamid_1.default(match[2]);
                }
            }
            this._setCookie(cookie, !!(cookieName.match(/^steamMachineAuth/) ?? cookieName.match(/Secure$/)));
        }
        this._verifyMobileAccessToken();
    }
    getSessionID(host = 'http://steamcommunity.com') {
        if (this._jar && typeof this._jar.getCookieHeaderForUrl === 'function') {
            const cookieHeader = this._jar.getCookieHeaderForUrl(host);
            if (cookieHeader) {
                for (const part of cookieHeader.split(';')) {
                    const match = part.trim().match(/([^=]+)=(.+)/);
                    if (match?.[1] === 'sessionid' && match[2]) {
                        return decodeURIComponent(match[2]);
                    }
                }
            }
        }
        const sessionID = (0, crypto_1.randomBytes)(12).toString('hex');
        this._setCookie('sessionid=' + sessionID);
        return sessionID;
    }
    getCookies(url) {
        if (!this._jar || typeof this._jar.getCookieHeaderForUrl !== 'function') {
            return '';
        }
        return this._jar.getCookieHeaderForUrl(url ?? 'https://steamcommunity.com') ?? '';
    }
    // ─── _myProfile helper ────────────────────────────────────────────────────
    _myProfile(endpoint, form, callback, source) {
        if (this._profileURL) {
            completeRequest(this._profileURL);
        }
        else {
            this.httpRequest('https://steamcommunity.com/my', { followRedirect: false }, (err, response) => {
                if (err || response.statusCode !== 302) {
                    callback(err ?? new Error('HTTP error ' + response.statusCode), response, null);
                    return;
                }
                const location = response.headers['location'] ?? '';
                const match = location.match(/steamcommunity\.com(\/(id|profiles)\/[^/]+)\/?/);
                if (!match) {
                    callback(new Error("Can't get profile URL"), response, null);
                    return;
                }
                this._profileURL = match[1];
                setTimeout(() => { delete this._profileURL; }, 60_000).unref();
                completeRequest(match[1]);
            }, 'steamcommunity');
        }
        const self = this;
        function completeRequest(url) {
            let options;
            if (typeof endpoint === 'object' && endpoint.endpoint) {
                options = { ...endpoint };
                options.uri = 'https://steamcommunity.com' + url + '/' + endpoint.endpoint;
            }
            else {
                options = {};
                options.uri = 'https://steamcommunity.com' + url + '/' + endpoint;
            }
            if (form) {
                options.method = 'POST';
                options.form = form;
                options.followAllRedirects = true;
            }
            else if (!options.method) {
                options.method = 'GET';
            }
            self.httpRequest(options, callback, source ?? 'steamcommunity');
        }
    }
}
exports.SteamCommunity = SteamCommunity;
//# sourceMappingURL=SteamCommunity.js.map