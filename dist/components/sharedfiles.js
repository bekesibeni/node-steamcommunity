"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const steamid_1 = __importDefault(require("steamid"));
const SteamCommunity_1 = require("../SteamCommunity");
function toSteamID(userID) {
    return typeof userID === 'string' ? new steamid_1.default(userID) : userID;
}
SteamCommunity_1.SteamCommunity.prototype.deleteSharedFileComment = function (userID, sharedFileId, cid, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/PublishedFile_Public/delete/${sid.toString()}/${sharedFileId}/`, form: { gidcomment: cid, count: 10, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.favoriteSharedFile = function (sharedFileId, appid, callback) {
    this.httpRequestPost({ uri: 'https://steamcommunity.com/sharedfiles/favorite', form: { id: sharedFileId, appid, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.postSharedFileComment = function (userID, sharedFileId, message, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/PublishedFile_Public/post/${sid.toString()}/${sharedFileId}/`, form: { comment: message, count: 10, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.subscribeSharedFileComments = function (userID, sharedFileId, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/PublishedFile_Public/subscribe/${sid.toString()}/${sharedFileId}/`, form: { count: 10, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.unfavoriteSharedFile = function (sharedFileId, appid, callback) {
    this.httpRequestPost({ uri: 'https://steamcommunity.com/sharedfiles/unfavorite', form: { id: sharedFileId, appid, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
SteamCommunity_1.SteamCommunity.prototype.unsubscribeSharedFileComments = function (userID, sharedFileId, callback) {
    const sid = toSteamID(userID);
    this.httpRequestPost({ uri: `https://steamcommunity.com/comment/PublishedFile_Public/unsubscribe/${sid.toString()}/${sharedFileId}/`, form: { count: 10, sessionid: this.getSessionID() } }, (err) => { if (callback)
        callback(err); }, 'steamcommunity');
};
//# sourceMappingURL=sharedfiles.js.map