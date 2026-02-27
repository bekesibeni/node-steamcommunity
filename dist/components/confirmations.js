"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const steam_totp_1 = __importDefault(require("steam-totp"));
const SteamCommunity_1 = require("../SteamCommunity");
const CConfirmation_1 = require("../classes/CConfirmation");
const EConfirmationType_1 = require("../resources/EConfirmationType");
// ─── Internal request helper ──────────────────────────────────────────────────
function confirmationRequest(community, url, key, time, tag, params, json, callback) {
    if (!community.steamID) {
        throw new Error('Must be logged in before trying to do anything with confirmations');
    }
    const fullParams = {
        ...(params ?? {}),
        p: steam_totp_1.default.getDeviceID(community.steamID),
        a: community.steamID.getSteamID64(),
        k: key,
        t: time,
        m: 'react',
        tag,
    };
    const req = {
        method: url === 'multiajaxop' ? 'POST' : 'GET',
        uri: `https://steamcommunity.com/mobileconf/${url}`,
        json: !!json,
    };
    if (req['method'] === 'GET') {
        req['qs'] = fullParams;
    }
    else {
        req['form'] = fullParams;
    }
    community.httpRequest(req, (err, _res, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, body);
    }, 'steamcommunity');
}
// ─── getConfirmations ─────────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getConfirmations = function (time, key, callback) {
    let tag = 'conf';
    if (typeof key === 'object') {
        tag = key.tag;
        key = key.key;
    }
    confirmationRequest(this, 'getlist', key, time, tag, null, true, (err, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        const b = body;
        if (!b['success']) {
            if (b['needauth']) {
                const notLoggedIn = new Error('Not Logged In');
                this._notifySessionExpired(notLoggedIn);
                callback(notLoggedIn, null);
            }
            else {
                callback(new Error(String(b['message'] ?? b['detail'] ?? 'Failed to get confirmation list')), null);
            }
            return;
        }
        const confs = (b['conf'] ?? []).map((conf) => new CConfirmation_1.CConfirmation(this, {
            id: String(conf['id']),
            type: conf['type'],
            creator: String(conf['creator_id']),
            key: String(conf['nonce']),
            title: `${conf['type_name'] ?? 'Confirm'} - ${conf['headline'] ?? ''}`,
            receiving: conf['type'] === EConfirmationType_1.EConfirmationType.Trade
                ? String(conf['summary']?.[1] ?? '')
                : '',
            sending: String(conf['summary']?.[0] ?? ''),
            time: new Date(Number(conf['creation_time']) * 1000).toISOString(),
            timestamp: new Date(Number(conf['creation_time']) * 1000),
            icon: String(conf['icon'] ?? ''),
        }));
        callback(null, confs);
    });
};
// ─── getConfirmationOfferID ───────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.getConfirmationOfferID = function (confID, time, key, callback) {
    const { parse } = require('node-html-parser');
    confirmationRequest(this, 'detailspage/' + confID, key, time, 'details', null, false, (err, body) => {
        if (err) {
            callback(err, null);
            return;
        }
        if (typeof body !== 'string') {
            callback(new Error('Cannot load confirmation details'), null);
            return;
        }
        const offer = parse(body).querySelector('.tradeoffer');
        if (!offer) {
            callback(null, null);
            return;
        }
        callback(null, (offer.getAttribute('id') ?? '').split('_')[1] ?? null);
    });
};
// ─── respondToConfirmation ────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.respondToConfirmation = function (confID, confKey, time, key, accept, callback) {
    let tag = accept ? 'allow' : 'cancel';
    if (typeof key === 'object') {
        tag = key.tag;
        key = key.key;
    }
    const endpoint = Array.isArray(confID) ? 'multiajaxop' : 'ajaxop';
    confirmationRequest(this, endpoint, key, time, tag, { op: accept ? 'allow' : 'cancel', cid: confID, ck: confKey }, true, (err, body) => {
        if (!callback)
            return;
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (b['success']) {
            callback(null);
            return;
        }
        if (b['message']) {
            callback(new Error(String(b['message'])));
            return;
        }
        callback(new Error('Could not act on confirmation'));
    });
};
// ─── acceptConfirmationForObject ─────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.acceptConfirmationForObject = function (identitySecret, objectID, callback) {
    this._usedConfTimes ??= [];
    if (this._timeOffset !== undefined) {
        doConfirmation();
    }
    else {
        steam_totp_1.default.getTimeOffset((err, offset) => {
            if (err) {
                callback(err);
                return;
            }
            this._timeOffset = offset;
            doConfirmation();
            setTimeout(() => { delete this._timeOffset; }, 1000 * 60 * 60 * 12).unref();
        });
    }
    const self = this;
    function doConfirmation() {
        const offset = self._timeOffset;
        let time = steam_totp_1.default.time(offset);
        const confKey = steam_totp_1.default.getConfirmationKey(identitySecret, time, 'list');
        self.getConfirmations(time, { tag: 'list', key: confKey }, (err, confs) => {
            if (err) {
                callback(err);
                return;
            }
            const conf = confs.find((c) => c.creator === String(objectID));
            if (!conf) {
                callback(new Error('Could not find confirmation for object ' + objectID));
                return;
            }
            let localOffset = 0;
            do {
                time = steam_totp_1.default.time(offset) + localOffset++;
            } while (self._usedConfTimes.includes(time));
            self._usedConfTimes.push(time);
            if (self._usedConfTimes.length > 60) {
                self._usedConfTimes.splice(0, self._usedConfTimes.length - 60);
            }
            const acceptKey = steam_totp_1.default.getConfirmationKey(identitySecret, time, 'accept');
            conf.respond(time, { tag: 'accept', key: acceptKey }, true, callback);
        });
    }
};
// ─── acceptAllConfirmations ───────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.acceptAllConfirmations = function (time, confKey, allowKey, callback) {
    this.getConfirmations(time, confKey, (err, confs) => {
        if (err) {
            callback(err, null);
            return;
        }
        if (confs.length === 0) {
            callback(null, []);
            return;
        }
        this.respondToConfirmation(confs.map((c) => c.id), confs.map((c) => c.key), time, allowKey, true, (respErr) => {
            if (respErr) {
                callback(respErr, null);
                return;
            }
            callback(null, confs);
        });
    });
};
// ─── Confirmation checker ─────────────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.startConfirmationChecker = function (pollInterval, identitySecret) {
    this._confirmationPollInterval = pollInterval;
    this._knownConfirmations ??= {};
    this._confirmationKeys ??= {};
    this._identitySecret = identitySecret;
    if (this._confirmationTimer)
        clearTimeout(this._confirmationTimer);
    setTimeout(() => this.checkConfirmations(), 500);
};
SteamCommunity_1.SteamCommunity.prototype.stopConfirmationChecker = function () {
    delete this._confirmationPollInterval;
    delete this._identitySecret;
    if (this._confirmationTimer) {
        clearTimeout(this._confirmationTimer);
        delete this._confirmationTimer;
    }
};
SteamCommunity_1.SteamCommunity.prototype.checkConfirmations = function () {
    if (this._confirmationTimer) {
        clearTimeout(this._confirmationTimer);
        delete this._confirmationTimer;
    }
    this.emit('debug', 'Checking confirmations');
    const resetTimer = () => {
        if (this._confirmationPollInterval) {
            this._confirmationTimer = setTimeout(() => this.checkConfirmations(), this._confirmationPollInterval);
        }
    };
    this._confirmationCheckerGetKey('conf', (err, keyObj) => {
        if (err) {
            resetTimer();
            return;
        }
        this.getConfirmations(keyObj.time, keyObj.key, (confErr, confirmations) => {
            if (confErr) {
                this.emit('debug', "Can't check confirmations: " + confErr.message);
                resetTimer();
                return;
            }
            const known = this._knownConfirmations;
            const newOnes = confirmations.filter((c) => !known[c.id]);
            if (newOnes.length < 1) {
                resetTimer();
                return;
            }
            for (const conf of newOnes) {
                known[conf.id] = conf;
                enqueueConfirmation(this, conf);
            }
            resetTimer();
        });
    });
};
function enqueueConfirmation(community, conf) {
    community._confirmationQueueState ??= { items: [], processing: false };
    community._confirmationQueueState.items.push(conf);
    if (!community._confirmationQueueState.processing) {
        processNextConfirmation(community);
    }
}
function processNextConfirmation(community) {
    const state = community._confirmationQueueState;
    if (!state)
        return;
    const conf = state.items.shift();
    if (!conf) {
        state.processing = false;
        return;
    }
    state.processing = true;
    if (community._identitySecret) {
        community.emit('debug', 'Accepting confirmation #' + conf.id);
        const time = Math.floor(Date.now() / 1000);
        const key = steam_totp_1.default.getConfirmationKey(community._identitySecret, time, 'allow');
        conf.respond(time, key, true, (respondErr) => {
            if (!respondErr)
                community.emit('confirmationAccepted', conf);
            delete community._knownConfirmations[conf.id];
            setTimeout(() => processNextConfirmation(community), 1000);
        });
    }
    else {
        community.emit('newConfirmation', conf);
        setTimeout(() => processNextConfirmation(community), 1000);
    }
}
// ─── acknowledgeTradeProtection ───────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype.acknowledgeTradeProtection = function (callback) {
    this.httpRequestPost({ uri: 'https://steamcommunity.com//trade/new/acknowledge', form: { sessionid: this.getSessionID(), message: 1 } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
// ─── _confirmationCheckerGetKey ───────────────────────────────────────────────
SteamCommunity_1.SteamCommunity.prototype._confirmationCheckerGetKey = function (tag, callback) {
    if (this._identitySecret) {
        if (tag === 'details') {
            callback(new Error('Disabled'));
            return;
        }
        const time = Math.floor(Date.now() / 1000);
        callback(null, { time, key: steam_totp_1.default.getConfirmationKey(this._identitySecret, time, tag) });
        return;
    }
    const existing = this._confirmationKeys[tag];
    const reusable = ['conf', 'details'];
    if (reusable.includes(tag) && existing && Date.now() - existing.time * 1000 < 1000 * 60 * 5) {
        callback(null, existing);
        return;
    }
    this.emit('confKeyNeeded', tag, (err, time, key) => {
        if (err) {
            callback(err);
            return;
        }
        this._confirmationKeys[tag] = { time, key };
        callback(null, { time, key });
    });
};
//# sourceMappingURL=confirmations.js.map