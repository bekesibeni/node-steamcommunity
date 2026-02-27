"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CConfirmation = void 0;
const EConfirmationType_1 = require("../resources/EConfirmationType");
class CConfirmation {
    id;
    type;
    /** For Trade confirmations this is the trade offer ID; for Market listings the listing ID. */
    creator;
    /** The nonce/key for this specific confirmation. */
    key;
    title;
    receiving;
    sending;
    /** ISO string — kept for backward compatibility. */
    time;
    timestamp;
    icon;
    /** Convenience: trade offer ID if this is a Trade confirmation, else null. */
    offerID;
    constructor(community, data) {
        Object.defineProperty(this, '_community', { value: community, enumerable: false });
        this.id = String(data.id);
        this.type = data.type;
        this.creator = String(data.creator);
        this.key = data.key;
        this.title = data.title;
        this.receiving = data.receiving;
        this.sending = data.sending;
        this.time = data.time;
        this.timestamp = data.timestamp;
        this.icon = data.icon;
        this.offerID = this.type === EConfirmationType_1.EConfirmationType.Trade ? this.creator : null;
    }
    /**
     * Get the trade offer ID associated with this confirmation.
     * For Trade confirmations the ID is already available locally,
     * so `time` and `key` are not needed and can be omitted.
     */
    getOfferID(time, key, callback) {
        if (this.type && this.creator) {
            if (this.type !== EConfirmationType_1.EConfirmationType.Trade) {
                callback(new Error('Not a trade confirmation'), null);
                return;
            }
            callback(null, this.creator);
            return;
        }
        this._community.getConfirmationOfferID(this.id, time, key, callback);
    }
    /** Accept or cancel this confirmation. */
    respond(time, key, accept, callback) {
        this._community.respondToConfirmation(this.id, this.key, time, key, accept, callback);
    }
}
exports.CConfirmation = CConfirmation;
//# sourceMappingURL=CConfirmation.js.map