import { chrome } from '@doctormckay/user-agents';
import SteamID from 'steamid';

import { SteamCommunity } from '../SteamCommunity';
import type { LoginResult } from '../types';

// ─── Augment SteamCommunity with login methods ────────────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		login(details: LoginDetails, callback: LoginCallback): void;
		getClientLogonToken(callback: (err: Error | null, token?: ClientLogonToken) => void): void;
		_modernLogin(logOnDetails: LoginDetails & { disableMobile: boolean }): Promise<LoginResult>;
	}
}

export interface LoginDetails {
	accountName: string;
	password: string;
	steamguard?: string;
	authCode?: string;
	twoFactorCode?: string;
	disableMobile?: boolean;
}

export interface ClientLogonToken {
	steamID: SteamID;
	accountName: string;
	webLogonToken: string;
}

type LoginCallback = (
	err: Error | null,
	sessionID?: string,
	cookies?: string[],
	steamguard?: string,
	_unused?: null,
) => void;

// ─── login ────────────────────────────────────────────────────────────────────

SteamCommunity.prototype.login = function (
	this: SteamCommunity,
	details: LoginDetails,
	callback: LoginCallback,
): void {
	if (!details.accountName || !details.password) {
		throw new Error('Missing either accountName or password to login; both are needed');
	}

	delete this._profileURL;

	const logOnOptions = { ...details, disableMobile: details.disableMobile !== false };

	this._modernLogin(logOnOptions).then(({ sessionID, cookies, steamguard, mobileAccessToken }) => {
		this.setCookies(cookies);
		if (mobileAccessToken) {
			this.setMobileAppAccessToken(mobileAccessToken);
		}
		callback(null, sessionID, cookies, steamguard, null);
	}).catch((err: Error) => callback(err));
};

// ─── getClientLogonToken ──────────────────────────────────────────────────────

SteamCommunity.prototype.getClientLogonToken = function (
	this: SteamCommunity,
	callback: (err: Error | null, token?: ClientLogonToken) => void,
): void {
	this.httpRequestGet(
		{ uri: 'https://steamcommunity.com/chat/clientjstoken', json: true },
		(err, response, body) => {
			if (err ?? response.statusCode !== 200) {
				callback(err ?? new Error('HTTP error ' + response.statusCode));
				return;
			}

			const b = body as Record<string, unknown> | null;
			if (!b?.['logged_in']) {
				const notLoggedIn = new Error('Not Logged In');
				callback(notLoggedIn);
				this._notifySessionExpired(notLoggedIn);
				return;
			}

			if (!b['steamid'] || !b['account_name'] || !b['token']) {
				callback(new Error('Malformed response'));
				return;
			}

			callback(null, {
				steamID: new SteamID(String(b['steamid'])),
				accountName: String(b['account_name']),
				webLogonToken: String(b['token']),
			});
		},
	);
};

// ─── _modernLogin (internal, uses steam-session) ─────────────────────────────

SteamCommunity.prototype._modernLogin = function (
	this: SteamCommunity,
	logOnDetails: LoginDetails & { disableMobile: boolean },
): Promise<LoginResult> {
	return new Promise(async (resolve, reject) => {
		const { LoginSession, EAuthTokenPlatformType, EAuthSessionGuardType } = await import('steam-session');

		const session = new LoginSession(
			logOnDetails.disableMobile
				? EAuthTokenPlatformType.WebBrowser
				: EAuthTokenPlatformType.MobileApp,
			{
				localAddress: this._options.localAddress,
				userAgent: this._options.userAgent ?? chrome(),
			},
		);

		session.on('authenticated', async () => {
			try {
				const webCookies = await session.getWebCookies();
				const sessionIdCookie = webCookies.find((c: string) => c.startsWith('sessionid='));
				resolve({
					sessionID: sessionIdCookie!.split('=')[1]!.split(';')[0]!.trim(),
					cookies: webCookies,
					steamguard: session.steamGuardMachineToken ?? '',
					mobileAccessToken: logOnDetails.disableMobile ? null : (session.accessToken ?? null),
				});
			} catch (ex) {
				reject(ex as Error);
			}
		});

		session.on('error', (err: Error) => reject(err));

		try {
			const startResult = await session.startWithCredentials({
				accountName: logOnDetails.accountName,
				password: logOnDetails.password,
				steamGuardMachineToken: logOnDetails.steamguard,
				steamGuardCode: logOnDetails.authCode ?? logOnDetails.twoFactorCode,
			});

			if (startResult.actionRequired) {
				session.cancelLoginAttempt();

				const emailAction = startResult.validActions?.find(
					(a: { type: number; detail?: string }) => a.type === EAuthSessionGuardType.EmailCode,
				);

				if (emailAction) {
					const err = Object.assign(new Error('SteamGuard'), { emaildomain: emailAction.detail });
					return reject(err);
				}

				return reject(new Error('SteamGuardMobile'));
			}
		} catch (ex) {
			return reject(ex as Error);
		}
	});
};
