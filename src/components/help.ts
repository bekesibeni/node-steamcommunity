import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from './helpers';
import type { SimpleCallback } from '../types';

const HELP_SITE_DOMAIN = 'https://help.steampowered.com';

declare module '../SteamCommunity' {
	interface SteamCommunity {
		restorePackage(packageID: number | string, callback?: SimpleCallback): void;
		removePackage(packageID: number | string, callback?: SimpleCallback): void;
	}
}

function wizardAjaxHandler(community: SteamCommunity, callback?: SimpleCallback) {
	return (err: Error | null, _res: unknown, body: unknown): void => {
		if (!callback) return;
		if (err) { callback(err); return; }
		const b = body as Record<string, unknown>;
		if (!b['success']) {
			callback(b['errorMsg'] ? new Error(String(b['errorMsg'])) : (Helpers.eresultError(Number(b['success'] ?? 0)) ?? new Error('Unknown')));
			return;
		}
		callback(null);
	};
}

SteamCommunity.prototype.restorePackage = function (this: SteamCommunity, packageID: number | string, callback?: SimpleCallback): void {
	this.httpRequestPost(
		{
			uri: HELP_SITE_DOMAIN + '/wizard/AjaxDoPackageRestore',
			form: { packageid: packageID, sessionid: this.getSessionID(HELP_SITE_DOMAIN), wizard_ajax: 1 },
			json: true,
		},
		wizardAjaxHandler(this, callback),
	);
};

SteamCommunity.prototype.removePackage = function (this: SteamCommunity, packageID: number | string, callback?: SimpleCallback): void {
	this.httpRequestPost(
		{
			uri: HELP_SITE_DOMAIN + '/wizard/AjaxDoPackageRemove',
			form: { packageid: packageID, sessionid: this.getSessionID(HELP_SITE_DOMAIN), wizard_ajax: 1 },
			json: true,
		},
		wizardAjaxHandler(this, callback),
	);
};
