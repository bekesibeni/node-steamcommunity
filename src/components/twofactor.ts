import SteamTotp from 'steam-totp';

import { SteamCommunity } from '../SteamCommunity';
import type { SimpleCallback } from '../types';

const enum ETwoFactorTokenType {
	None = 0,
	ValveMobileApp = 1,
	ThirdParty = 2,
}

declare module '../SteamCommunity' {
	interface SteamCommunity {
		enableTwoFactor(callback: (err: Error | null, response?: Record<string, unknown>) => void): void;
		finalizeTwoFactor(secret: string | Buffer, activationCode: string, callback: SimpleCallback): void;
		disableTwoFactor(revocationCode: string, callback: SimpleCallback): void;
	}
}

SteamCommunity.prototype.enableTwoFactor = function (
	this: SteamCommunity,
	callback: (err: Error | null, response?: Record<string, unknown>) => void,
): void {
	this._verifyMobileAccessToken();

	if (!this.mobileAccessToken) {
		callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
		return;
	}

	this.httpRequestPost(
		{
			uri: `https://api.steampowered.com/ITwoFactorService/AddAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
			// Sends form-encoded; a future improvement could send protobuf to more closely mimic the official app
			form: {
				steamid: this.steamID!.getSteamID64(),
				authenticator_type: ETwoFactorTokenType.ValveMobileApp,
				device_identifier: SteamTotp.getDeviceID(this.steamID!),
				sms_phone_id: '1',
				version: 2,
			},
			json: true,
		},
		(err, _res, body) => {
			if (err) { callback(err); return; }
			const b = body as Record<string, Record<string, unknown>>;
			if (!b['response']) { callback(new Error('Malformed response')); return; }
			if (b['response']['status'] !== 1) {
				const e = Object.assign(new Error('Error ' + b['response']['status']), { eresult: b['response']['status'] });
				callback(e); return;
			}
			callback(null, b['response']);
		},
		'steamcommunity',
	);
};

SteamCommunity.prototype.finalizeTwoFactor = function (
	this: SteamCommunity,
	secret: string | Buffer,
	activationCode: string,
	callback: SimpleCallback,
): void {
	this._verifyMobileAccessToken();

	if (!this.mobileAccessToken) {
		callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
		return;
	}

	let attemptsLeft = 30;
	let diff = 0;

	const finalize = (): void => {
		const code = SteamTotp.generateAuthCode(typeof secret === 'string' ? secret : secret.toString('base64'), diff);

		this.httpRequestPost(
			{
				uri: `https://api.steampowered.com/ITwoFactorService/FinalizeAddAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
				form: {
					steamid: this.steamID!.getSteamID64(),
					authenticator_code: code,
					authenticator_time: Math.floor(Date.now() / 1000),
					activation_code: activationCode,
				},
				json: true,
			},
			(err, _res, body) => {
				if (err) { callback(err); return; }
				const outer = body as Record<string, Record<string, unknown>>;
				if (!outer['response']) { callback(new Error('Malformed response')); return; }
				const b = outer['response'];

				if (b['server_time']) {
					diff = Number(b['server_time']) - Math.floor(Date.now() / 1000);
				}

				if (b['status'] === 89) {
					callback(new Error('Invalid activation code'));
				} else if (b['want_more']) {
					if (--attemptsLeft <= 0) { callback(new Error('Too many finalize attempts')); return; }
					diff += 30;
					finalize();
				} else if (!b['success']) {
					callback(new Error('Error ' + b['status']));
				} else {
					callback(null);
				}
			},
			'steamcommunity',
		);
	};

	SteamTotp.getTimeOffset((err, offset) => {
		if (err) { callback(err); return; }
		diff = offset;
		finalize();
	});
};

SteamCommunity.prototype.disableTwoFactor = function (
	this: SteamCommunity,
	revocationCode: string,
	callback: SimpleCallback,
): void {
	this._verifyMobileAccessToken();

	if (!this.mobileAccessToken) {
		callback(new Error('No mobile access token available. Provide one by calling setMobileAppAccessToken()'));
		return;
	}

	this.httpRequestPost(
		{
			uri: `https://api.steampowered.com/ITwoFactorService/RemoveAuthenticator/v1/?access_token=${this.mobileAccessToken}`,
			form: { steamid: this.steamID!.getSteamID64(), revocation_code: revocationCode, steamguard_scheme: 1 },
			json: true,
		},
		(err, _res, body) => {
			if (err) { callback(err); return; }
			const b = body as Record<string, Record<string, unknown>>;
			if (!b['response']) { callback(new Error('Malformed response')); return; }
			if (!b['response']['success']) { callback(new Error('Request failed')); return; }
			callback(null);
		},
		'steamcommunity',
	);
};
