import SteamID from 'steamid';

import { SteamCommunity } from '../SteamCommunity';
import type { SimpleCallback } from '../types';

declare module '../SteamCommunity' {
	interface SteamCommunity {
		deleteSharedFileComment(userID: SteamID | string, sharedFileId: string, cid: string, callback?: SimpleCallback): void;
		favoriteSharedFile(sharedFileId: string, appid: number, callback?: SimpleCallback): void;
		postSharedFileComment(userID: SteamID | string, sharedFileId: string, message: string, callback?: SimpleCallback): void;
		subscribeSharedFileComments(userID: SteamID | string, sharedFileId: string, callback?: SimpleCallback): void;
		unfavoriteSharedFile(sharedFileId: string, appid: number, callback?: SimpleCallback): void;
		unsubscribeSharedFileComments(userID: SteamID | string, sharedFileId: string, callback?: SimpleCallback): void;
	}
}

function toSteamID(userID: SteamID | string): SteamID {
	return typeof userID === 'string' ? new SteamID(userID) : userID;
}

SteamCommunity.prototype.deleteSharedFileComment = function (this: SteamCommunity, userID, sharedFileId, cid, callback?) {
	const sid = toSteamID(userID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/comment/PublishedFile_Public/delete/${sid.toString()}/${sharedFileId}/`, form: { gidcomment: cid, count: 10, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.favoriteSharedFile = function (this: SteamCommunity, sharedFileId, appid, callback?) {
	this.httpRequestPost(
		{ uri: 'https://steamcommunity.com/sharedfiles/favorite', form: { id: sharedFileId, appid, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.postSharedFileComment = function (this: SteamCommunity, userID, sharedFileId, message, callback?) {
	const sid = toSteamID(userID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/comment/PublishedFile_Public/post/${sid.toString()}/${sharedFileId}/`, form: { comment: message, count: 10, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.subscribeSharedFileComments = function (this: SteamCommunity, userID, sharedFileId, callback?) {
	const sid = toSteamID(userID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/comment/PublishedFile_Public/subscribe/${sid.toString()}/${sharedFileId}/`, form: { count: 10, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.unfavoriteSharedFile = function (this: SteamCommunity, sharedFileId, appid, callback?) {
	this.httpRequestPost(
		{ uri: 'https://steamcommunity.com/sharedfiles/unfavorite', form: { id: sharedFileId, appid, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

SteamCommunity.prototype.unsubscribeSharedFileComments = function (this: SteamCommunity, userID, sharedFileId, callback?) {
	const sid = toSteamID(userID);
	this.httpRequestPost(
		{ uri: `https://steamcommunity.com/comment/PublishedFile_Public/unsubscribe/${sid.toString()}/${sharedFileId}/`, form: { count: 10, sessionid: this.getSessionID() } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};
