import { URL } from 'url';
import type { HttpRequestOptions as StdlibHttpOptions } from '@doctormckay/stdlib/http';

import { SteamCommunity } from '../SteamCommunity';
import type { SteamHttpRequestOptions, SteamHttpResponse, HttpCallback } from '../types';

// ─── _performHttpRequest ──────────────────────────────────────────────────────

SteamCommunity.prototype._performHttpRequest = function (
	this: SteamCommunity,
	options: SteamHttpRequestOptions,
	callback: HttpCallback,
): void {
	if (!this._httpClient) {
		callback(new Error('HTTP client not initialized'), null!, null);
		return;
	}

	const url = (options.url ?? options.uri) as string;
	const method = (options.method ?? 'GET').toUpperCase();
	const expectJson = options.json === true;
	const encoding = options.encoding;

	let followRedirects = true;
	if (typeof options.followRedirect === 'boolean') followRedirects = options.followRedirect;
	if (typeof options.followAllRedirects === 'boolean') followRedirects = options.followAllRedirects;

	const httpOptions: StdlibHttpOptions = {
		method,
		url,
		headers: (options.headers as Record<string, string>) ?? {},
		queryString: options.qs,
		followRedirects,
		timeout: options.timeout,
		rejectUnauthorized: options.rejectUnauthorized,
	};

	// ── Body mapping ────────────────────────────────────────────────────────
	if (options.formData) {
		httpOptions.multipartForm = {};
		for (const [field, val] of Object.entries(options.formData)) {
			if (
				val !== null &&
				typeof val === 'object' &&
				!Buffer.isBuffer(val) &&
				Object.prototype.hasOwnProperty.call(val, 'value')
			) {
				const typed = val as { value: Buffer | string; options?: { contentType?: string; filename?: string } };
				httpOptions.multipartForm[field] = {
					content: typed.value,
					contentType: typed.options?.contentType,
					filename: typed.options?.filename,
				};
			} else {
				httpOptions.multipartForm[field] = {
					content: val as Buffer | string,
				};
			}
		}
	} else if (options.form) {
		httpOptions.urlEncodedForm = options.form as Record<string, unknown>;
	} else if (options.body) {
		httpOptions.body = options.body;
	}

	this._httpClient.request(httpOptions).then((response) => {
		let body: unknown;
		if (expectJson) {
			body = response.jsonBody;
		} else if (encoding === null) {
			body = response.rawBody;
		} else if (typeof response.textBody === 'string') {
			body = response.textBody;
		} else {
			body = response.rawBody;
		}

		const responseLike: SteamHttpResponse = {
			statusCode: response.statusCode,
			statusMessage: response.statusMessage,
			headers: response.headers,
			body,
			url: response.url,
			request: { uri: { href: response.url } },
		};

		callback.call(this, null, responseLike, body);
	}).catch((err: Error) => {
		callback.call(this, err, null!, null);
	});
};

// ─── httpRequest ──────────────────────────────────────────────────────────────

SteamCommunity.prototype.httpRequest = function (
	this: SteamCommunity,
	uriOrOptions: string | SteamHttpRequestOptions,
	optionsOrCallback?: SteamHttpRequestOptions | HttpCallback,
	callbackOrSource?: HttpCallback | string,
	source?: string,
): void {
	let options: SteamHttpRequestOptions;
	let callback: HttpCallback | undefined;

	if (typeof uriOrOptions === 'object') {
		// httpRequest(options, callback, source)
		source = callbackOrSource as string | undefined;
		callback = optionsOrCallback as HttpCallback | undefined;
		options = uriOrOptions;
	} else if (typeof optionsOrCallback === 'function') {
		// httpRequest(uri, callback, source)
		source = callbackOrSource as string | undefined;
		callback = optionsOrCallback;
		options = {};
	} else {
		// httpRequest(uri, options, callback, source)
		callback = callbackOrSource as HttpCallback | undefined;
		options = (optionsOrCallback as SteamHttpRequestOptions) ?? {};
	}

	const uri = typeof uriOrOptions === 'string' ? uriOrOptions : (options.url ?? options.uri ?? '');
	options.url = options.uri = uri;

	// Consume the convenience-method marker set by httpRequestGet / httpRequestPost
	if (this._httpRequestConvenienceMethod) {
		options.method = this._httpRequestConvenienceMethod;
		delete this._httpRequestConvenienceMethod;
	}

	// Add origin header on non-GET requests (prevents 403 on some endpoints)
	if ((options.method ?? 'GET').toUpperCase() !== 'GET') {
		options.headers ??= {};
		if (!(options.headers as Record<string, string>)['origin']) {
			const parsed = new URL(options.url!);
			(options.headers as Record<string, string>)['origin'] = `${parsed.protocol}//${parsed.host}`;
		}
	}

	const requestID = ++this._httpRequestID;
	const src = source ?? '';
	const self = this;  // declare before continueRequest is ever called
	let continued = false;

	if (!this.onPreHttpRequest || !this.onPreHttpRequest(requestID, src, options, continueRequest)) {
		continueRequest(null);
	}

	function continueRequest(preErr: Error | null): void {
		if (continued) return;
		continued = true;

		if (preErr) {
			callback?.(preErr, null!, null);
			return;
		}

		self._performHttpRequest(options, (err, response, body) => {
			const hasCallback = !!callback;
			const httpError = options.checkHttpError !== false
				? self._checkHttpError(err, response, callback ?? (() => undefined), body)
				: false;

			const communityError =
				!options.json &&
				options.checkCommunityError !== false &&
				self._checkCommunityError(body, httpError ? () => undefined : (callback ?? (() => undefined)));

			const tradeError =
				!options.json &&
				options.checkTradeError !== false &&
				self._checkTradeError(body, (httpError || communityError) ? () => undefined : (callback ?? (() => undefined)));

			const jsonError =
				options.json && options.checkJsonError !== false && !body
					? new Error('Malformed JSON response')
					: null;

			self.emit('postHttpRequest', requestID, src, options, httpError || communityError || tradeError || jsonError || null, response, body, {
				hasCallback,
				httpError,
				communityError,
				tradeError,
				jsonError,
			});

			if (hasCallback && !(httpError || communityError || tradeError)) {
				if (jsonError) {
					callback!.call(self, jsonError, response, body);
				} else {
					callback!.call(self, err, response, body);
				}
			}
		});
	}
};

// ─── Convenience wrappers ──────────────────────────────────────────────────────

SteamCommunity.prototype.httpRequestGet = function (
	this: SteamCommunity,
	...args: Parameters<SteamCommunity['httpRequest']>
): void {
	this._httpRequestConvenienceMethod = 'GET';
	this.httpRequest(...args);
};

SteamCommunity.prototype.httpRequestPost = function (
	this: SteamCommunity,
	...args: Parameters<SteamCommunity['httpRequest']>
): void {
	this._httpRequestConvenienceMethod = 'POST';
	this.httpRequest(...args);
};

// ─── Error checkers ───────────────────────────────────────────────────────────

SteamCommunity.prototype._notifySessionExpired = function (this: SteamCommunity, err: Error): void {
	this.emit('sessionExpired', err);
};

SteamCommunity.prototype._checkHttpError = function (
	this: SteamCommunity,
	err: Error | null,
	response: SteamHttpResponse,
	callback: HttpCallback,
	body: unknown,
): Error | false {
	if (err) {
		callback(err, response, body);
		return err;
	}

	const location = String((response?.headers as Record<string, string>)?.['location'] ?? '');
	if (response.statusCode >= 300 && response.statusCode <= 399 && location.includes('/login')) {
		const loginErr = new Error('Not Logged In');
		callback(loginErr, response, body);
		this._notifySessionExpired(loginErr);
		return loginErr;
	}

	if (
		response.statusCode === 403 &&
		typeof response.body === 'string' &&
		(response.body as string).includes('<div id="parental_notice_instructions">Enter your PIN below to exit Family View.</div>')
	) {
		const pinErr = new Error('Family View Restricted');
		callback(pinErr, response, body);
		return pinErr;
	}

	if (response.statusCode >= 400) {
		const httpErr = Object.assign(new Error('HTTP error ' + response.statusCode), { code: response.statusCode });
		callback(httpErr, response, body);
		return httpErr;
	}

	return false;
};

SteamCommunity.prototype._checkCommunityError = function (
	this: SteamCommunity,
	html: unknown,
	callback: HttpCallback | (() => void),
): Error | false {
	if (typeof html !== 'string') return false;

	if (html.includes('<h1>Sorry!</h1>')) {
		const match = html.match(/<h3>(.+)<\/h3>/);
		const err = new Error(match ? match[1]! : 'Unknown error occurred');
		(callback as HttpCallback)(err, null!, null);
		return err;
	}

	if (html.includes('g_steamID = false;') && html.includes('<title>Sign In</title>')) {
		const err = new Error('Not Logged In');
		(callback as HttpCallback)(err, null!, null);
		this._notifySessionExpired(err);
		return err;
	}

	return false;
};

SteamCommunity.prototype._checkTradeError = function (
	this: SteamCommunity,
	html: unknown,
	callback: HttpCallback | (() => void),
): Error | false {
	if (typeof html !== 'string') return false;

	const match = html.match(/<div id="error_msg">\s*([^<]+)\s*<\/div>/);
	if (match) {
		const err = new Error(match[1]!.trim());
		(callback as HttpCallback)(err, null!, null);
		return err;
	}

	return false;
};

// ─── Augment SteamCommunity with HTTP error checker methods ───────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		_checkCommunityError(html: unknown, callback: HttpCallback | (() => void)): Error | false;
		_checkTradeError(html: unknown, callback: HttpCallback | (() => void)): Error | false;
	}
}
