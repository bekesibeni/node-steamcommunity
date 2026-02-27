"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("./helpers");
SteamCommunity_1.SteamCommunity.prototype.getWebApiKey = function (unusedOrCallback, callback) {
    if (typeof unusedOrCallback === 'function') {
        callback = unusedOrCallback;
    }
    this.httpRequest({ uri: 'https://steamcommunity.com/dev/apikey?l=english', followRedirect: false }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = String(body);
        if (b.match(/You must have a validated email address to create a Steam Web API key\./)) {
            callback(new Error('You must have a validated email address to create a Steam Web API key.'), null);
            return;
        }
        if (b.match(/Your account requires (<a [^>]+>)?Steam Guard Mobile Authenticator/)) {
            callback(new Error('Steam Guard Mobile Authenticator required to create a Steam Web API key'), null);
            return;
        }
        if (b.match(/<h2>Access Denied<\/h2>/)) {
            callback(new Error('Access Denied'), null);
            return;
        }
        const match = b.match(/<p>Key: ([0-9A-F]+)<\/p>/);
        if (match) {
            callback(null, match[1]);
        }
        else {
            callback(new Error('No API key created for this account'), null);
        }
    }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.createWebApiKey = function (options, callback) {
    if (!options.domain) {
        callback(new Error('Passing a domain is required to register an API key'), null);
        return;
    }
    this.httpRequestPost({
        uri: 'https://steamcommunity.com/dev/requestkey',
        form: { domain: options.domain, request_id: options.requestID ?? '0', sessionid: this.getSessionID(), agreeToTerms: 'true' },
        json: true,
    }, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        switch (b['success']) {
            case SteamCommunity_1.SteamCommunity.EResult.OK:
                if (b['api_key']) {
                    callback(null, { confirmationRequired: false, apiKey: String(b['api_key']) });
                    return;
                }
                this.getWebApiKey(null, (keyErr, key) => {
                    if (keyErr) {
                        callback(keyErr, null);
                        return;
                    }
                    callback(null, { confirmationRequired: false, apiKey: key });
                });
                return;
            case SteamCommunity_1.SteamCommunity.EResult.Pending: {
                const finalizeOptions = {
                    domain: options.domain,
                    requestID: String(b['request_id'] ?? options.requestID ?? ''),
                };
                if (options.identitySecret) {
                    this.acceptConfirmationForObject(options.identitySecret, finalizeOptions.requestID, (confirmErr) => {
                        if (confirmErr) {
                            callback(confirmErr, null);
                        }
                        else {
                            this.createWebApiKey(finalizeOptions, callback);
                        }
                    });
                    return;
                }
                callback(null, { confirmationRequired: true, finalizeOptions });
                return;
            }
            default:
                callback(helpers_1.Helpers.eresultError(Number(b['success'] ?? 0)) ?? new Error('Unknown'), null);
        }
    });
};
SteamCommunity_1.SteamCommunity.prototype.setMobileAppAccessToken = function (token) {
    if (!this.steamID) {
        throw new Error('Log on to steamcommunity before setting a mobile app access token');
    }
    const decoded = helpers_1.Helpers.decodeJwt(token);
    if (!decoded['iss'] || !decoded['sub'] || !decoded['aud'] || !decoded['exp']) {
        throw new Error('Provided value is not a valid Steam access token');
    }
    if (decoded['iss'] === 'steam') {
        throw new Error('Provided token is a refresh token, not an access token');
    }
    if (decoded['sub'] !== this.steamID.getSteamID64()) {
        throw new Error(`Provided token belongs to account ${decoded['sub']}, but we are logged into ${this.steamID.getSteamID64()}`);
    }
    if (decoded['exp'] < Math.floor(Date.now() / 1000)) {
        throw new Error('Provided token is expired');
    }
    if (!(decoded['aud'] ?? []).includes('mobile')) {
        throw new Error('Provided token is not valid for MobileApp platform type');
    }
    this.mobileAccessToken = token;
};
SteamCommunity_1.SteamCommunity.prototype._verifyMobileAccessToken = function () {
    if (!this.mobileAccessToken)
        return;
    const decoded = helpers_1.Helpers.decodeJwt(this.mobileAccessToken);
    const isInvalid = decoded['sub'] !== this.steamID?.getSteamID64() ||
        decoded['exp'] < Math.floor(Date.now() / 1000);
    if (isInvalid) {
        delete this.mobileAccessToken;
    }
};
//# sourceMappingURL=webapi.js.map