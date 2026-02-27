"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SteamCommunity_1 = require("../SteamCommunity");
const helpers_1 = require("./helpers");
const HELP_SITE_DOMAIN = 'https://help.steampowered.com';
function wizardAjaxHandler(community, callback) {
    return (err, _res, body) => {
        if (!callback)
            return;
        if (err) {
            callback(err);
            return;
        }
        const b = body;
        if (!b['success']) {
            callback(b['errorMsg'] ? new Error(String(b['errorMsg'])) : (helpers_1.Helpers.eresultError(Number(b['success'] ?? 0)) ?? new Error('Unknown')));
            return;
        }
        callback(null);
    };
}
SteamCommunity_1.SteamCommunity.prototype.restorePackage = function (packageID, callback) {
    this.httpRequestPost({
        uri: HELP_SITE_DOMAIN + '/wizard/AjaxDoPackageRestore',
        form: { packageid: packageID, sessionid: this.getSessionID(HELP_SITE_DOMAIN), wizard_ajax: 1 },
        json: true,
    }, wizardAjaxHandler(this, callback));
};
SteamCommunity_1.SteamCommunity.prototype.removePackage = function (packageID, callback) {
    this.httpRequestPost({
        uri: HELP_SITE_DOMAIN + '/wizard/AjaxDoPackageRemove',
        form: { packageid: packageID, sessionid: this.getSessionID(HELP_SITE_DOMAIN), wizard_ajax: 1 },
        json: true,
    }, wizardAjaxHandler(this, callback));
};
//# sourceMappingURL=help.js.map