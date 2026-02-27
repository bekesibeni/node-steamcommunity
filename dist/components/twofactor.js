"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const steam_totp_1 = __importDefault(require("steam-totp"));
const SteamCommunity_1 = require("../SteamCommunity");
SteamCommunity_1.SteamCommunity.prototype.enableTwoFactor = function (callback) {
    this._verifyMobileAccessToken();
    if (!this.mobileAccessToken) {
        callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
        return;
    }
    this.httpRequestPost({
        uri: `https://api.steampowered.com/ITwoFactorService/AddAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
        // Sends form-encoded; a future improvement could send protobuf to more closely mimic the official app
        form: {
            steamid: this.steamID.getSteamID64(),
            authenticator_type: 1 /* ETwoFactorTokenType.ValveMobileApp */,
            device_identifier: steam_totp_1.default.getDeviceID(this.steamID),
            sms_phone_id: '1',
            version: 2,
        },
        json: true,
    }, (err, _res, body) => {
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (!b['response']) {
            callback(new Error('Malformed response'));
            return;
        }
        if (b['response']['status'] !== 1) {
            const e = Object.assign(new Error('Error ' + b['response']['status']), { eresult: b['response']['status'] });
            callback(e);
            return;
        }
        callback(null, b['response']);
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.finalizeTwoFactor = function (secret, activationCode, callback) {
    this._verifyMobileAccessToken();
    if (!this.mobileAccessToken) {
        callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
        return;
    }
    let attemptsLeft = 30;
    let diff = 0;
    const finalize = () => {
        const code = steam_totp_1.default.generateAuthCode(typeof secret === 'string' ? secret : secret.toString('base64'), diff);
        this.httpRequestPost({
            uri: `https://api.steampowered.com/ITwoFactorService/FinalizeAddAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
            form: {
                steamid: this.steamID.getSteamID64(),
                authenticator_code: code,
                authenticator_time: Math.floor(Date.now() / 1000),
                activation_code: activationCode,
            },
            json: true,
        }, (err, _res, body) => {
            if (err) {
                callback(err);
                return;
            }
            const outer = body;
            if (!outer['response']) {
                callback(new Error('Malformed response'));
                return;
            }
            const b = outer['response'];
            if (b['server_time']) {
                diff = Number(b['server_time']) - Math.floor(Date.now() / 1000);
            }
            if (b['status'] === 89) {
                callback(new Error('Invalid activation code'));
            }
            else if (b['want_more']) {
                if (--attemptsLeft <= 0) {
                    callback(new Error('Too many finalize attempts'));
                    return;
                }
                diff += 30;
                finalize();
            }
            else if (!b['success']) {
                callback(new Error('Error ' + b['status']));
            }
            else {
                callback(null);
            }
        }, 'steamcommunity');
    };
    steam_totp_1.default.getTimeOffset((err, offset) => {
        if (err) {
            callback(err);
            return;
        }
        diff = offset;
        finalize();
    });
};
SteamCommunity_1.SteamCommunity.prototype.disableTwoFactor = function (revocationCode, callback) {
    this._verifyMobileAccessToken();
    if (!this.mobileAccessToken) {
        callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
        return;
    }
    this.httpRequestPost({
        uri: `https://api.steampowered.com/ITwoFactorService/RemoveAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
        form: { steamid: this.steamID.getSteamID64(), revocation_code: revocationCode, steamguard_scheme: 1 },
        json: true,
    }, (err, _res, body) => {
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (!b['response']) {
            callback(new Error('Malformed response'));
            return;
        }
        if (!b['response']['success']) {
            callback(new Error('Request failed'));
            return;
        }
        callback(null);
    }, 'steamcommunity');
};
//# sourceMappingURL=twofactor.js.map