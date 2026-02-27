"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyState = exports.SteamError = void 0;
// ─── Augmented Steam error ───────────────────────────────────────────────────
/** Error enriched with Steam-specific fields set by various methods. */
class SteamError extends Error {
    eresult;
    code;
    emaildomain;
    inner;
    line;
    constructor(message) {
        super(message);
        this.name = 'SteamError';
    }
}
exports.SteamError = SteamError;
// ─── Privacy state constants ─────────────────────────────────────────────────
exports.PrivacyState = {
    Private: 1,
    FriendsOnly: 2,
    Public: 3,
};
//# sourceMappingURL=types.js.map