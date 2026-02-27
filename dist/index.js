"use strict";
/**
 * node-steamcommunity — TypeScript rewrite
 *
 * Architecture: SteamCommunity base class defined in SteamCommunity.ts.
 * Each component file augments the class via TypeScript module augmentation
 * (declare module + prototype assignment).  This file loads all components
 * as side-effects to ensure every prototype method is attached before
 * anything is exported.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helpers = exports.PrivacyState = exports.SteamError = exports.CMarketSearchResult = exports.CMarketItem = exports.CSteamSharedFile = exports.CSteamGroup = exports.CSteamUser = exports.CConfirmation = exports.CEconItem = exports.ESharedFileType = exports.EPersonaStateFlag = exports.EPersonaState = exports.EFriendRelationship = exports.EChatState = exports.EConfirmationType = exports.EResult = exports.SteamCommunity = void 0;
// ── Core class ────────────────────────────────────────────────────────────────
var SteamCommunity_1 = require("./SteamCommunity");
Object.defineProperty(exports, "SteamCommunity", { enumerable: true, get: function () { return SteamCommunity_1.SteamCommunity; } });
// ── Resources (enums) ─────────────────────────────────────────────────────────
var EResult_1 = require("./resources/EResult");
Object.defineProperty(exports, "EResult", { enumerable: true, get: function () { return EResult_1.EResult; } });
var EConfirmationType_1 = require("./resources/EConfirmationType");
Object.defineProperty(exports, "EConfirmationType", { enumerable: true, get: function () { return EConfirmationType_1.EConfirmationType; } });
var EChatState_1 = require("./resources/EChatState");
Object.defineProperty(exports, "EChatState", { enumerable: true, get: function () { return EChatState_1.EChatState; } });
var EFriendRelationship_1 = require("./resources/EFriendRelationship");
Object.defineProperty(exports, "EFriendRelationship", { enumerable: true, get: function () { return EFriendRelationship_1.EFriendRelationship; } });
var EPersonaState_1 = require("./resources/EPersonaState");
Object.defineProperty(exports, "EPersonaState", { enumerable: true, get: function () { return EPersonaState_1.EPersonaState; } });
var EPersonaStateFlag_1 = require("./resources/EPersonaStateFlag");
Object.defineProperty(exports, "EPersonaStateFlag", { enumerable: true, get: function () { return EPersonaStateFlag_1.EPersonaStateFlag; } });
var ESharedFileType_1 = require("./resources/ESharedFileType");
Object.defineProperty(exports, "ESharedFileType", { enumerable: true, get: function () { return ESharedFileType_1.ESharedFileType; } });
// ── Classes ───────────────────────────────────────────────────────────────────
var CEconItem_1 = require("./classes/CEconItem");
Object.defineProperty(exports, "CEconItem", { enumerable: true, get: function () { return CEconItem_1.CEconItem; } });
var CConfirmation_1 = require("./classes/CConfirmation");
Object.defineProperty(exports, "CConfirmation", { enumerable: true, get: function () { return CConfirmation_1.CConfirmation; } });
var CSteamUser_1 = require("./classes/CSteamUser");
Object.defineProperty(exports, "CSteamUser", { enumerable: true, get: function () { return CSteamUser_1.CSteamUser; } });
var CSteamGroup_1 = require("./classes/CSteamGroup");
Object.defineProperty(exports, "CSteamGroup", { enumerable: true, get: function () { return CSteamGroup_1.CSteamGroup; } });
var CSteamSharedFile_1 = require("./classes/CSteamSharedFile");
Object.defineProperty(exports, "CSteamSharedFile", { enumerable: true, get: function () { return CSteamSharedFile_1.CSteamSharedFile; } });
var CMarketItem_1 = require("./classes/CMarketItem");
Object.defineProperty(exports, "CMarketItem", { enumerable: true, get: function () { return CMarketItem_1.CMarketItem; } });
var CMarketSearchResult_1 = require("./classes/CMarketSearchResult");
Object.defineProperty(exports, "CMarketSearchResult", { enumerable: true, get: function () { return CMarketSearchResult_1.CMarketSearchResult; } });
// ── Shared types ──────────────────────────────────────────────────────────────
var types_1 = require("./types");
Object.defineProperty(exports, "SteamError", { enumerable: true, get: function () { return types_1.SteamError; } });
Object.defineProperty(exports, "PrivacyState", { enumerable: true, get: function () { return types_1.PrivacyState; } });
// ── Component side-effects (attaches all prototype methods) ───────────────────
require("./components/http");
require("./components/login");
require("./components/webapi");
require("./components/users");
require("./components/profile");
require("./components/market");
require("./components/groups");
require("./components/sharedfiles");
require("./components/inventoryhistory");
require("./components/twofactor");
require("./components/confirmations");
require("./components/help");
// ── Class augmentations that live with their own class file ───────────────────
require("./classes/CSteamUser"); // registers getSteamUser on prototype
require("./classes/CSteamGroup"); // registers getSteamGroup on prototype
require("./classes/CMarketItem"); // registers getMarketItem on prototype
require("./classes/CSteamSharedFile"); // registers getSteamSharedFile on prototype
// ── Named helper export ───────────────────────────────────────────────────────
var helpers_1 = require("./components/helpers");
Object.defineProperty(exports, "Helpers", { enumerable: true, get: function () { return helpers_1.Helpers; } });
// ── Default export for CommonJS `require('steamcommunity')` compatibility ─────
const SteamCommunity_2 = require("./SteamCommunity");
exports.default = SteamCommunity_2.SteamCommunity;
//# sourceMappingURL=index.js.map