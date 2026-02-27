import SteamTotp from 'steam-totp';

import { SteamCommunity } from '../SteamCommunity';
import { CConfirmation } from '../classes/CConfirmation';
import { EConfirmationType } from '../resources/EConfirmationType';
import type { SimpleCallback, Callback, ConfirmationKey } from '../types';

declare module '../SteamCommunity' {
	interface SteamCommunity {
		getConfirmations(time: number, key: string | { tag: string; key: string }, callback: Callback<CConfirmation[]>): void;
		getConfirmationOfferID(confID: string, time: number, key: string, callback: (err: Error | null, offerID: string | null) => void): void;
		respondToConfirmation(confID: string | string[], confKey: string | string[], time: number, key: string | { tag: string; key: string }, accept: boolean, callback?: SimpleCallback): void;
		acceptAllConfirmations(time: number, confKey: string, allowKey: string, callback: Callback<CConfirmation[]>): void;
		startConfirmationChecker(pollInterval: number, identitySecret?: string | Buffer | null): void;
		stopConfirmationChecker(): void;
		checkConfirmations(): void;
		acknowledgeTradeProtection(callback?: SimpleCallback): void;
		_confirmationCheckerGetKey(tag: string, callback: (err: Error | null, key?: ConfirmationKey) => void): void;
	}
}

// ─── Internal request helper ──────────────────────────────────────────────────

function confirmationRequest(
	community: SteamCommunity,
	url: string,
	key: string,
	time: number,
	tag: string,
	params: Record<string, unknown> | null,
	json: boolean,
	callback: (err: Error | null, body: unknown) => void,
): void {
	if (!community.steamID) {
		throw new Error('Must be logged in before trying to do anything with confirmations');
	}

	const fullParams: Record<string, unknown> = {
		...(params ?? {}),
		p: SteamTotp.getDeviceID(community.steamID),
		a: community.steamID.getSteamID64(),
		k: key,
		t: time,
		m: 'react',
		tag,
	};

	const req = {
		method: url === 'multiajaxop' ? 'POST' : 'GET',
		uri: `https://steamcommunity.com/mobileconf/${url}`,
		json: !!json,
	} as Record<string, unknown>;

	if (req['method'] === 'GET') {
		req['qs'] = fullParams;
	} else {
		req['form'] = fullParams;
	}

	community.httpRequest(req, (err, _res, body) => {
		if (err) { callback(err, null); return; }
		callback(null, body);
	}, 'steamcommunity');
}

// ─── getConfirmations ─────────────────────────────────────────────────────────

SteamCommunity.prototype.getConfirmations = function (
	this: SteamCommunity,
	time: number,
	key: string | { tag: string; key: string },
	callback: Callback<CConfirmation[]>,
): void {
	let tag = 'conf';
	if (typeof key === 'object') { tag = key.tag; key = key.key; }

	confirmationRequest(this, 'getlist', key as string, time, tag, null, true, (err, body) => {
		if (err) { callback(err, null!); return; }
		const b = body as Record<string, unknown>;
		if (!b['success']) {
			if (b['needauth']) {
				const notLoggedIn = new Error('Not Logged In');
				this._notifySessionExpired(notLoggedIn);
				callback(notLoggedIn, null!);
			} else {
				callback(new Error(String(b['message'] ?? b['detail'] ?? 'Failed to get confirmation list')), null!);
			}
			return;
		}

		const confs = ((b['conf'] as Array<Record<string, unknown>>) ?? []).map((conf) =>
			new CConfirmation(this, {
				id: String(conf['id']),
				type: conf['type'] as EConfirmationType,
				creator: String(conf['creator_id']),
				key: String(conf['nonce']),
				title: `${conf['type_name'] ?? 'Confirm'} - ${conf['headline'] ?? ''}`,
				receiving: conf['type'] === EConfirmationType.Trade
					? String((conf['summary'] as string[])?.[1] ?? '')
					: '',
				sending: String((conf['summary'] as string[])?.[0] ?? ''),
				time: new Date(Number(conf['creation_time']) * 1000).toISOString(),
				timestamp: new Date(Number(conf['creation_time']) * 1000),
				icon: String(conf['icon'] ?? ''),
			}),
		);

		callback(null, confs);
	});
};

// ─── getConfirmationOfferID ───────────────────────────────────────────────────

SteamCommunity.prototype.getConfirmationOfferID = function (
	this: SteamCommunity,
	confID: string,
	time: number,
	key: string,
	callback: (err: Error | null, offerID: string | null) => void,
): void {
	const { parse } = require('node-html-parser') as typeof import('node-html-parser');

	confirmationRequest(this, 'detailspage/' + confID, key, time, 'details', null, false, (err, body) => {
		if (err) { callback(err, null); return; }
		if (typeof body !== 'string') { callback(new Error('Cannot load confirmation details'), null); return; }

		const offer = parse(body).querySelector('.tradeoffer');
		if (!offer) { callback(null, null); return; }
		callback(null, (offer.getAttribute('id') ?? '').split('_')[1] ?? null);
	});
};

// ─── respondToConfirmation ────────────────────────────────────────────────────

SteamCommunity.prototype.respondToConfirmation = function (
	this: SteamCommunity,
	confID: string | string[],
	confKey: string | string[],
	time: number,
	key: string | { tag: string; key: string },
	accept: boolean,
	callback?: SimpleCallback,
): void {
	let tag = accept ? 'allow' : 'cancel';
	if (typeof key === 'object') { tag = key.tag; key = key.key; }

	const endpoint = Array.isArray(confID) ? 'multiajaxop' : 'ajaxop';
	confirmationRequest(this, endpoint, key as string, time, tag, { op: accept ? 'allow' : 'cancel', cid: confID, ck: confKey }, true, (err, body) => {
		if (!callback) return;
		if (err) { callback(err); return; }
		const b = body as Record<string, unknown>;
		if (b['success']) { callback(null); return; }
		if (b['message']) { callback(new Error(String(b['message']))); return; }
		callback(new Error('Could not act on confirmation'));
	});
};

// ─── acceptConfirmationForObject ─────────────────────────────────────────────

SteamCommunity.prototype.acceptConfirmationForObject = function (
	this: SteamCommunity,
	identitySecret: string | Buffer,
	objectID: string | number,
	callback: SimpleCallback,
): void {
	this._usedConfTimes ??= [];

	if (this._timeOffset !== undefined) {
		doConfirmation();
	} else {
		SteamTotp.getTimeOffset((err, offset) => {
			if (err) { callback(err); return; }
			this._timeOffset = offset;
			doConfirmation();
			setTimeout(() => { delete this._timeOffset; }, 1000 * 60 * 60 * 12).unref();
		});
	}

	const self = this;

	function doConfirmation(): void {
		const offset = self._timeOffset!;
		let time = SteamTotp.time(offset);
		const confKey = SteamTotp.getConfirmationKey(identitySecret as string, time, 'list');

		self.getConfirmations(time, { tag: 'list', key: confKey }, (err, confs) => {
			if (err) { callback(err); return; }

			const conf = confs.find((c) => c.creator === String(objectID));
			if (!conf) { callback(new Error('Could not find confirmation for object ' + objectID)); return; }

			let localOffset = 0;
			do {
				time = SteamTotp.time(offset) + localOffset++;
			} while (self._usedConfTimes!.includes(time));

			self._usedConfTimes!.push(time);
			if (self._usedConfTimes!.length > 60) {
				self._usedConfTimes!.splice(0, self._usedConfTimes!.length - 60);
			}

			const acceptKey = SteamTotp.getConfirmationKey(identitySecret as string, time, 'accept');
			conf.respond(time, { tag: 'accept', key: acceptKey }, true, callback);
		});
	}
};

// ─── acceptAllConfirmations ───────────────────────────────────────────────────

SteamCommunity.prototype.acceptAllConfirmations = function (
	this: SteamCommunity,
	time: number,
	confKey: string,
	allowKey: string,
	callback: Callback<CConfirmation[]>,
): void {
	this.getConfirmations(time, confKey, (err, confs) => {
		if (err) { callback(err, null!); return; }
		if (confs.length === 0) { callback(null, []); return; }

		this.respondToConfirmation(
			confs.map((c) => c.id),
			confs.map((c) => c.key),
			time,
			allowKey,
			true,
			(respErr) => {
				if (respErr) { callback(respErr, null!); return; }
				callback(null, confs);
			},
		);
	});
};

// ─── Confirmation checker ─────────────────────────────────────────────────────

SteamCommunity.prototype.startConfirmationChecker = function (
	this: SteamCommunity,
	pollInterval: number,
	identitySecret?: string | Buffer | null,
): void {
	this._confirmationPollInterval = pollInterval;
	this._knownConfirmations ??= {};
	this._confirmationKeys ??= {};
	this._identitySecret = identitySecret as string | undefined;

	if (this._confirmationTimer) clearTimeout(this._confirmationTimer);
	setTimeout(() => this.checkConfirmations(), 500);
};

SteamCommunity.prototype.stopConfirmationChecker = function (this: SteamCommunity): void {
	delete this._confirmationPollInterval;
	delete this._identitySecret;
	if (this._confirmationTimer) {
		clearTimeout(this._confirmationTimer);
		delete this._confirmationTimer;
	}
};

SteamCommunity.prototype.checkConfirmations = function (this: SteamCommunity): void {
	if (this._confirmationTimer) {
		clearTimeout(this._confirmationTimer);
		delete this._confirmationTimer;
	}

	this.emit('debug', 'Checking confirmations');

	const resetTimer = (): void => {
		if (this._confirmationPollInterval) {
			this._confirmationTimer = setTimeout(() => this.checkConfirmations(), this._confirmationPollInterval);
		}
	};

	this._confirmationCheckerGetKey('conf', (err, keyObj) => {
		if (err) { resetTimer(); return; }

		this.getConfirmations(keyObj!.time, keyObj!.key, (confErr, confirmations) => {
			if (confErr) {
				this.emit('debug', "Can't check confirmations: " + confErr.message);
				resetTimer();
				return;
			}

			const known = this._knownConfirmations!;
			const newOnes = confirmations.filter((c) => !known[c.id]);

			if (newOnes.length < 1) { resetTimer(); return; }

			for (const conf of newOnes) {
				known[conf.id] = conf;
				enqueueConfirmation(this, conf);
			}

			resetTimer();
		});
	});
};

function enqueueConfirmation(community: SteamCommunity, conf: CConfirmation): void {
	community._confirmationQueueState ??= { items: [], processing: false };
	community._confirmationQueueState.items.push(conf);
	if (!community._confirmationQueueState.processing) {
		processNextConfirmation(community);
	}
}

function processNextConfirmation(community: SteamCommunity): void {
	const state = community._confirmationQueueState;
	if (!state) return;

	const conf = state.items.shift();
	if (!conf) { state.processing = false; return; }

	state.processing = true;

	if (community._identitySecret) {
		community.emit('debug', 'Accepting confirmation #' + conf.id);
		const time = Math.floor(Date.now() / 1000);
		const key = SteamTotp.getConfirmationKey(community._identitySecret, time, 'allow');

		conf.respond(time, key, true, (respondErr) => {
			if (!respondErr) community.emit('confirmationAccepted', conf);
			delete community._knownConfirmations![conf.id];
			setTimeout(() => processNextConfirmation(community), 1000);
		});
	} else {
		community.emit('newConfirmation', conf);
		setTimeout(() => processNextConfirmation(community), 1000);
	}
}

// ─── acknowledgeTradeProtection ───────────────────────────────────────────────

SteamCommunity.prototype.acknowledgeTradeProtection = function (this: SteamCommunity, callback?: SimpleCallback): void {
	this.httpRequestPost(
		{ uri: 'https://steamcommunity.com//trade/new/acknowledge', form: { sessionid: this.getSessionID(), message: 1 } },
		(err) => { if (callback) callback(err); },
		'steamcommunity',
	);
};

// ─── _confirmationCheckerGetKey ───────────────────────────────────────────────

SteamCommunity.prototype._confirmationCheckerGetKey = function (
	this: SteamCommunity,
	tag: string,
	callback: (err: Error | null, key?: ConfirmationKey) => void,
): void {
	if (this._identitySecret) {
		if (tag === 'details') { callback(new Error('Disabled')); return; }
		const time = Math.floor(Date.now() / 1000);
		callback(null, { time, key: SteamTotp.getConfirmationKey(this._identitySecret, time, tag) });
		return;
	}

	const existing = this._confirmationKeys![tag];
	const reusable = ['conf', 'details'];

	if (reusable.includes(tag) && existing && Date.now() - existing.time * 1000 < 1000 * 60 * 5) {
		callback(null, existing);
		return;
	}

	this.emit('confKeyNeeded', tag, (err: Error | null, time: number, key: string) => {
		if (err) { callback(err); return; }
		this._confirmationKeys![tag] = { time, key };
		callback(null, { time, key });
	});
};
