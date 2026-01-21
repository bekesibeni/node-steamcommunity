const { URL } = require('url');

var SteamCommunity = require('../index.js');
SteamCommunity.prototype._performHttpRequest = function(options, callback) {
	var self = this;

	if (!this._httpClient) {
		return callback(new Error('HTTP client not initialized'));
	}

	options = options || {};

	var url = options.url || options.uri;
	var method = (options.method || 'GET').toUpperCase();

	// Determine if caller expects JSON response
	var expectJson = options.json === true;
	var encoding = options.encoding;

	var followRedirects = true;
	if (typeof options.followRedirect === 'boolean') {
		followRedirects = options.followRedirect;
	}
	if (typeof options.followAllRedirects === 'boolean') {
		followRedirects = options.followAllRedirects;
	}

	var httpOptions = {
		method: method,
		url: url,
		headers: options.headers || {},
		queryString: options.qs,
		followRedirects: followRedirects,
		timeout: options.timeout,
		rejectUnauthorized: options.rejectUnauthorized
	};

	// Request body mapping
	if (options.formData) {
		httpOptions.multipartForm = {};
		for (var field in options.formData) {
			if (!options.formData.hasOwnProperty(field)) {
				continue;
			}

			var val = options.formData[field];

			if (val && typeof val === 'object' && Object.prototype.hasOwnProperty.call(val, 'value')) {
				var opts = val.options || {};

				httpOptions.multipartForm[field] = {
					content: val.value,
					contentType: opts.contentType,
					filename: opts.filename
				};
			} else {
				httpOptions.multipartForm[field] = {
					content: val
				};
			}
		}
	} else if (options.form) {
		httpOptions.urlEncodedForm = options.form;
	} else if (options.body) {
		httpOptions.body = options.body;
	}

	this._httpClient.request(httpOptions).then(function(response) {
		var body;

		if (expectJson) {
			body = response.jsonBody;
		} else if (encoding === null) {
			body = response.rawBody;
		} else if (typeof response.textBody === 'string') {
			body = response.textBody;
		} else {
			body = response.rawBody;
		}

		var responseLike = {
			statusCode: response.statusCode,
			statusMessage: response.statusMessage,
			headers: response.headers,
			body: body,
			url: response.url,
			request: {
				uri: {
					href: response.url
				}
			}
		};

		callback.call(self, null, responseLike, body);
	}).catch(function(err) {
		callback.call(self, err);
	});
};

SteamCommunity.prototype.httpRequest = function(uri, options, callback, source) {
	if (typeof uri === 'object') {
		source = callback;
		callback = options;
		options = uri;
		uri = options.url || options.uri;
	} else if (typeof options === 'function') {
		source = callback;
		callback = options;
		options = {};
	}

	options.url = options.uri = uri;

	if (this._httpRequestConvenienceMethod) {
		options.method = this._httpRequestConvenienceMethod;
		delete this._httpRequestConvenienceMethod;
	}

	// Add origin header if necessary
	// https://github.com/DoctorMcKay/node-steamcommunity/issues/351
	if ((options.method || 'GET').toUpperCase() != 'GET') {
		options.headers = options.headers || {};
		if (!options.headers.origin) {
			var parsedUrl = new URL(options.url);
			options.headers.origin = parsedUrl.protocol + '//' + parsedUrl.host;
		}
	}

	var requestID = ++this._httpRequestID;
	source = source || "";

	var self = this;
	var continued = false;

	if (!this.onPreHttpRequest || !this.onPreHttpRequest(requestID, source, options, continueRequest)) {
		// No pre-hook, or the pre-hook doesn't want to delay the request.
		continueRequest(null);
	}

	function continueRequest(err) {
		if (continued) {
			return;
		}

		continued = true;

		if (err) {
			if (callback) {
				callback(err);
			}

			return;
		}

		self._performHttpRequest(options, function (err, response, body) {
			var hasCallback = !!callback;
			var httpError = options.checkHttpError !== false && self._checkHttpError(err, response, callback, body);
			var communityError = !options.json && options.checkCommunityError !== false && self._checkCommunityError(body, httpError ? function () {} : callback); // don't fire the callback if hasHttpError did it already
			var tradeError = !options.json && options.checkTradeError !== false && self._checkTradeError(body, httpError || communityError ? function () {} : callback); // don't fire the callback if either of the previous already did
			var jsonError = options.json && options.checkJsonError !== false && !body ? new Error("Malformed JSON response") : null;

			self.emit('postHttpRequest', requestID, source, options, httpError || communityError || tradeError || jsonError || null, response, body, {
				"hasCallback": hasCallback,
				"httpError": httpError,
				"communityError": communityError,
				"tradeError": tradeError,
				"jsonError": jsonError
			});

			if (hasCallback && !(httpError || communityError || tradeError)) {
				if (jsonError) {
					callback.call(self, jsonError, response);
				} else {
					callback.apply(self, arguments);
				}
			}
		});
	}
};

SteamCommunity.prototype.httpRequestGet = function() {
	this._httpRequestConvenienceMethod = "GET";
	return this.httpRequest.apply(this, arguments);
};

SteamCommunity.prototype.httpRequestPost = function() {
	this._httpRequestConvenienceMethod = "POST";
	return this.httpRequest.apply(this, arguments);
};

SteamCommunity.prototype._notifySessionExpired = function(err) {
	this.emit('sessionExpired', err);
};

SteamCommunity.prototype._checkHttpError = function(err, response, callback, body) {
	if (err) {
		callback(err, response, body);
		return err;
	}

	if (response.statusCode >= 300 && response.statusCode <= 399 && response.headers.location.indexOf('/login') != -1) {
		err = new Error("Not Logged In");
		callback(err, response, body);
		this._notifySessionExpired(err);
		return err;
	}

	if (response.statusCode == 403 && typeof response.body === 'string' && response.body.match(/<div id="parental_notice_instructions">Enter your PIN below to exit Family View.<\/div>/)) {
		err = new Error("Family View Restricted");
		callback(err, response, body);
		return err;
	}

	if (response.statusCode >= 400) {
		err = new Error("HTTP error " + response.statusCode);
		err.code = response.statusCode;
		callback(err, response, body);
		return err;
	}

	return false;
};

SteamCommunity.prototype._checkCommunityError = function(html, callback) {
	var err;

	if(typeof html === 'string' && html.match(/<h1>Sorry!<\/h1>/)) {
		var match = html.match(/<h3>(.+)<\/h3>/);
		err = new Error(match ? match[1] : "Unknown error occurred");
		callback(err);
		return err;
	}

	if (typeof html === 'string' && html.indexOf('g_steamID = false;') > -1 && html.indexOf('<title>Sign In</title>') > -1) {
		err = new Error("Not Logged In");
		callback(err);
		this._notifySessionExpired(err);
		return err;
	}

	return false;
};

SteamCommunity.prototype._checkTradeError = function(html, callback) {
	if (typeof html !== 'string') {
		return false;
	}

	var match = html.match(/<div id="error_msg">\s*([^<]+)\s*<\/div>/);
	if (match) {
		var err = new Error(match[1].trim());
		callback(err);
		return err;
	}

	return false;
};
