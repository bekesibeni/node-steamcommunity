"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_agents_1 = require("@doctormckay/user-agents");
const steamid_1 = __importDefault(require("steamid"));
const SteamCommunity_1 = require("../SteamCommunity");
// ─── login ────────────────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.login = function (details, callback) {
    if (!details.accountName || !details.password) {
        throw new Error('Missing either accountName or password to login; both are needed');
    }
    delete this._profileURL;
    const logOnOptions = { ...details, disableMobile: details.disableMobile !== false };
    this._modernLogin(logOnOptions).then(({ sessionID, cookies, steamguard, mobileAccessToken }) => {
        this.setCookies(cookies);
        if (mobileAccessToken) {
            this.setMobileAppAccessToken(mobileAccessToken);
        }
        callback(null, sessionID, cookies, steamguard, null);
    }).catch((err) => callback(err));
};
// ─── getClientLogonToken ──────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getClientLogonToken = function (callback) {
    this.httpRequestGet({ uri: 'https://steamcommunity.com/chat/clientjstoken', json: true }, (err, response, body) => {
        if (err ?? response.statusCode !== 200) {
            callback(err ?? new Error('HTTP error ' + response.statusCode));
            return;
        }
        const b = body;
        if (!b?.['logged_in']) {
            const notLoggedIn = new Error('Not Logged In');
            callback(notLoggedIn);
            this._notifySessionExpired(notLoggedIn);
            return;
        }
        if (!b['steamid'] || !b['account_name'] || !b['token']) {
            callback(new Error('Malformed response'));
            return;
        }
        callback(null, {
            steamID: new steamid_1.default(String(b['steamid'])),
            accountName: String(b['account_name']),
            webLogonToken: String(b['token']),
        });
    });
};
// ─── _modernLogin (internal, uses steam-session) ─────────────────────────────
SteamCommunity_1.SteamCommunity.prototype._modernLogin = function (logOnDetails) {
    return new Promise(async (resolve, reject) => {
        const { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } = await import('steam-session');
        const session = new LoginSession(logOnDetails.disableMobile
            ? EAuthTokenPlatformType.WebBrowser
            : EAuthTokenPlatformType.MobileApp, {
            localAddress: this._options.localAddress,
            userAgent: this._options.userAgent ?? (0, user_agents_1.chrome)(),
        });
        session.on('authenticated', async () => {
            try {
                const webCookies = await session.getWebCookies();
                const sessionIdCookie = webCookies.find((c) => c.startsWith('sessionid='));
                resolve({
                    sessionID: sessionIdCookie.split('=')[1].split(';')[0].trim(),
                    cookies: webCookies,
                    steamguard: session.steamGuardMachineToken ?? '',
                    mobileAccessToken: logOnDetails.disableMobile ? null : (session.accessToken ?? null),
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
        session.on('error', (err) => reject(err));
        try {
            const startResult = await session.startWithCredentials({
                accountName: logOnDetails.accountName,
                password: logOnDetails.password,
                steamGuardMachineToken: logOnDetails.steamguard,
                steamGuardCode: logOnDetails.authCode ?? logOnDetails.twoFactorCode,
            });
            if (startResult.actionRequired) {
                session.cancelLoginAttempt();
                const emailAction = startResult.validActions?.find((a) => a.type === EAuthSessionGuardType.EmailCode);
                if (emailAction) {
                    const err = Object.assign(new Error('SteamGuard'), { emaildomain: emailAction.detail });
                    return reject(err);
                }
                return reject(new Error('SteamGuardMobile'));
            }
        }
        catch (ex) {
            return reject(ex);
        }
    });
};
//# sourceMappingURL=login.js.map