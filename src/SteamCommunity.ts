import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';
import { URL } from 'url';

import { HttpClient, CookieJar } from '@doctormckay/stdlib/http';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { getProxyAgent } from '@doctormckay/stdlib/http';
import { chrome } from '@doctormckay/user-agents';
import SteamID from 'steamid';

import { EResult } from './resources/EResult';
import { EConfirmationType } from './resources/EConfirmationType';
import { ESharedFileType } from './resources/ESharedFileType';
import { EFriendRelationship } from './resources/EFriendRelationship';
import { EPersonaState } from './resources/EPersonaState';
import { EPersonaStateFlag } from './resources/EPersonaStateFlag';
import { EChatState } from './resources/EChatState';
import { PrivacyState } from './types';

import type {
	SteamCommunityOptions,
	ConfirmationKey,
	ConfirmationQueueState,
	PreHttpRequestHook,
	SteamHttpRequestOptions,
} from './types';
import type { CConfirmation } from './classes/CConfirmation';

// ─── Static surface ──────────────────────────────────────────────────────────

export { SteamID, EResult, EConfirmationType, ESharedFileType, EFriendRelationship, PrivacyState };

// ─── Main class ──────────────────────────────────────────────────────────────

export class SteamCommunity extends EventEmitter {

	// ── Static enum / constant references (mirrors original JS static props) ──
	static readonly SteamID = SteamID;
	static readonly EResult = EResult;
	static readonly ConfirmationType = EConfirmationType;
	static readonly ESharedFileType = ESharedFileType;
	static readonly EFriendRelationship = EFriendRelationship;
	static readonly ChatState = EChatState;
	static readonly PersonaState = EPersonaState;
	static readonly PersonaStateFlag = EPersonaStateFlag;
	static readonly PrivacyState = PrivacyState;

	// ── Instance state ─────────────────────────────────────────────────────────

	/** Logged-in account SteamID — set by `setCookies()`. */
	steamID: SteamID | null = null;

	/** Mobile app access token — set by `setMobileAppAccessToken()`. */
	mobileAccessToken?: string;

	/** Set this to intercept HTTP requests before they are sent. Return true to delay the request. */
	onPreHttpRequest?: PreHttpRequestHook;

	// ── Internal HTTP ──────────────────────────────────────────────────────────
	_httpClient: HttpClient;
	_jar: CookieJar;
	_captchaGid = -1;
	_httpRequestID = 0;
	_options: SteamCommunityOptions;

	// ── Cached profile URL (60-second cache) ──────────────────────────────────
	_profileURL?: string;

	// ── Internal convenience method marker (used by httpRequestGet/Post) ──────
	_httpRequestConvenienceMethod?: string;

	// ── Confirmation checker internal state ───────────────────────────────────
	_timeOffset?: number;
	_usedConfTimes?: number[];
	_confirmationTimer?: ReturnType<typeof setTimeout>;
	_confirmationPollInterval?: number;
	_knownConfirmations?: Record<string, CConfirmation>;
	_confirmationKeys?: Record<string, ConfirmationKey>;
	_identitySecret?: string;
	_confirmationQueueState?: ConfirmationQueueState;

	// ─────────────────────────────────────────────────────────────────────────

	constructor(options: SteamCommunityOptions | string = {}) {
		super();

		if (typeof options === 'string') {
			options = { localAddress: options };
		}

		this._options = options;

		const userAgent = options.userAgent ?? chrome();
		const defaultHeaders: Record<string, string> = { 'user-agent': userAgent };

		let httpAgent: ReturnType<typeof getProxyAgent> | SocksProxyAgent | undefined;
		let httpsAgent: ReturnType<typeof getProxyAgent> | SocksProxyAgent | undefined;

		if (options.socksProxy) {
			httpAgent = new SocksProxyAgent(options.socksProxy);
			httpsAgent = new SocksProxyAgent(options.socksProxy);
		} else if (options.httpProxy) {
			httpAgent = getProxyAgent(false, options.httpProxy);
			httpsAgent = getProxyAgent(true, options.httpProxy);
		}

		this._httpClient = new HttpClient({
			userAgent,
			defaultHeaders,
			defaultTimeout: options.timeout ?? 50_000,
			cookieJar: true,
			gzip: true,
			localAddress: options.localAddress,
			httpAgent: httpAgent as import('http').Agent | undefined,
			httpsAgent: httpsAgent as import('https').Agent | undefined,
		});

		this._jar = this._httpClient.cookieJar as CookieJar;

		// Defaults
		this._setCookie('Steam_Language=english');
		this._setCookie('timezoneOffset=0,0');
	}

	// ─── Cookie management ────────────────────────────────────────────────────

	_setCookie(cookie: string, _secure?: boolean): void {
		if (!this._jar || typeof this._jar.add !== 'function') {
			return;
		}

		let domains: string[] = [];

		if (/;\s*domain=/i.test(cookie)) {
			const match = cookie.match(/;\s*domain=([^;]+)/i);
			if (match?.[1]) {
				domains.push(match[1].trim());
			}
		}

		if (domains.length === 0) {
			domains = ['steamcommunity.com', 'store.steampowered.com', 'help.steampowered.com'];
		}

		for (const domain of domains) {
			this._jar.add(cookie, domain);
		}
	}

	setCookies(cookies: string[]): void {
		for (const cookie of cookies) {
			const cookieName = cookie.trim().split('=')[0]!;

			if (cookieName === 'steamLogin' || cookieName === 'steamLoginSecure') {
				const match = cookie.match(/steamLogin(Secure)?=(\d+)/);
				if (match?.[2]) {
					this.steamID = new SteamID(match[2]);
				}
			}

			this._setCookie(
				cookie,
				!!(cookieName.match(/^steamMachineAuth/) ?? cookieName.match(/Secure$/)),
			);
		}

		this._verifyMobileAccessToken();
	}

	getSessionID(host = 'http://steamcommunity.com'): string {
		if (this._jar && typeof this._jar.getCookieHeaderForUrl === 'function') {
			const cookieHeader = this._jar.getCookieHeaderForUrl(host);
			if (cookieHeader) {
				for (const part of cookieHeader.split(';')) {
					const match = part.trim().match(/([^=]+)=(.+)/);
					if (match?.[1] === 'sessionid' && match[2]) {
						return decodeURIComponent(match[2]);
					}
				}
			}
		}

		const sessionID = randomBytes(12).toString('hex');
		this._setCookie('sessionid=' + sessionID);
		return sessionID;
	}

	getCookies(url?: string): string {
		if (!this._jar || typeof this._jar.getCookieHeaderForUrl !== 'function') {
			return '';
		}
		return this._jar.getCookieHeaderForUrl(url ?? 'https://steamcommunity.com') ?? '';
	}

	// ─── _myProfile helper ────────────────────────────────────────────────────

	_myProfile(
		endpoint: string | (SteamHttpRequestOptions & { endpoint: string }),
		form: Record<string, unknown> | null,
		callback: (err: Error | null, response: import('./types').SteamHttpResponse, body: unknown) => void,
		source?: string,
	): void {
		if (this._profileURL) {
			completeRequest(this._profileURL);
		} else {
			this.httpRequest(
				'https://steamcommunity.com/my',
				{ followRedirect: false },
				(err, response) => {
					if (err || response.statusCode !== 302) {
						callback(err ?? new Error('HTTP error ' + response.statusCode), response, null);
						return;
					}

					const location = (response.headers as Record<string, string>)['location'] ?? '';
					const match = location.match(/steamcommunity\.com(\/(id|profiles)\/[^/]+)\/?/);
					if (!match) {
						callback(new Error("Can't get profile URL"), response, null);
						return;
					}

					this._profileURL = match[1];
					setTimeout(() => { delete this._profileURL; }, 60_000).unref();
					completeRequest(match[1]);
				},
				'steamcommunity',
			);
		}

		const self = this;

		function completeRequest(url: string): void {
			let options: SteamHttpRequestOptions;

			if (typeof endpoint === 'object' && endpoint.endpoint) {
				options = { ...endpoint };
				options.uri = 'https://steamcommunity.com' + url + '/' + endpoint.endpoint;
			} else {
				options = {};
				options.uri = 'https://steamcommunity.com' + url + '/' + (endpoint as string);
			}

			if (form) {
				options.method = 'POST';
				options.form = form;
				options.followAllRedirects = true;
			} else if (!options.method) {
				options.method = 'GET';
			}

			self.httpRequest(options, callback, source ?? 'steamcommunity');
		}
	}

	// ─── Method stubs — implemented by component augmentation ───────────────
	// Using `declare` (not `!:`) so TypeScript knows the type but no class field
	// initializer is emitted, meaning the prototype method assignments in each
	// component file are NOT shadowed at the instance level.

	/** @internal implemented in components/http.ts */
	declare httpRequest: (
		uriOrOptions: string | SteamHttpRequestOptions,
		optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback,
		callbackOrSource?: import('./types').HttpCallback | string,
		source?: string,
	) => void;

	/** @internal implemented in components/http.ts */
	declare httpRequestGet: (
		uriOrOptions: string | SteamHttpRequestOptions,
		optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback,
		callbackOrSource?: import('./types').HttpCallback | string,
		source?: string,
	) => void;

	/** @internal implemented in components/http.ts */
	declare httpRequestPost: (
		uriOrOptions: string | SteamHttpRequestOptions,
		optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback,
		callbackOrSource?: import('./types').HttpCallback | string,
		source?: string,
	) => void;

	/** @internal implemented in components/http.ts */
	declare _performHttpRequest: (
		options: SteamHttpRequestOptions,
		callback: import('./types').HttpCallback,
	) => void;

	/** @internal implemented in components/http.ts */
	declare _notifySessionExpired: (err: Error) => void;

	/** @internal implemented in components/http.ts */
	declare _checkHttpError: (
		err: Error | null,
		response: import('./types').SteamHttpResponse,
		callback: import('./types').HttpCallback,
		body: unknown,
	) => Error | false;

	/** @internal implemented in components/webapi.ts */
	declare _verifyMobileAccessToken: () => void;

	/** @internal implemented in components/confirmations.ts */
	declare acceptConfirmationForObject: (
		identitySecret: string | Buffer,
		objectID: string | number,
		callback: import('./types').SimpleCallback,
	) => void;

}
