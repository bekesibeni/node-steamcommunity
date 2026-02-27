"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EPersonaStateFlag = void 0;
var EPersonaStateFlag;
(function (EPersonaStateFlag) {
    EPersonaStateFlag[EPersonaStateFlag["HasRichPresence"] = 1] = "HasRichPresence";
    EPersonaStateFlag[EPersonaStateFlag["InJoinableGame"] = 2] = "InJoinableGame";
    EPersonaStateFlag[EPersonaStateFlag["Golden"] = 4] = "Golden";
    EPersonaStateFlag[EPersonaStateFlag["RemotePlayTogether"] = 8] = "RemotePlayTogether";
    /** @deprecated Use ClientTypeWeb */
    EPersonaStateFlag[EPersonaStateFlag["OnlineUsingWeb"] = 256] = "OnlineUsingWeb";
    EPersonaStateFlag[EPersonaStateFlag["ClientTypeWeb"] = 256] = "ClientTypeWeb";
    /** @deprecated Use ClientTypeMobile */
    EPersonaStateFlag[EPersonaStateFlag["OnlineUsingMobile"] = 512] = "OnlineUsingMobile";
    EPersonaStateFlag[EPersonaStateFlag["ClientTypeMobile"] = 512] = "ClientTypeMobile";
    /** @deprecated Use ClientTypeTenfoot */
    EPersonaStateFlag[EPersonaStateFlag["OnlineUsingBigPicture"] = 1024] = "OnlineUsingBigPicture";
    EPersonaStateFlag[EPersonaStateFlag["ClientTypeTenfoot"] = 1024] = "ClientTypeTenfoot";
    /** @deprecated Use ClientTypeVR */
    EPersonaStateFlag[EPersonaStateFlag["OnlineUsingVR"] = 2048] = "OnlineUsingVR";
    EPersonaStateFlag[EPersonaStateFlag["ClientTypeVR"] = 2048] = "ClientTypeVR";
    EPersonaStateFlag[EPersonaStateFlag["LaunchTypeGamepad"] = 4096] = "LaunchTypeGamepad";
    EPersonaStateFlag[EPersonaStateFlag["LaunchTypeCompatTool"] = 8192] = "LaunchTypeCompatTool";
})(EPersonaStateFlag || (exports.EPersonaStateFlag = EPersonaStateFlag = {}));
//# sourceMappingURL=EPersonaStateFlag.js.map