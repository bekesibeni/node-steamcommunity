import { HttpClient } from '@doctormckay/stdlib/http';
import SteamID from 'steamid';
import { XMLParser } from 'fast-xml-parser';

import { EResult } from '../resources/EResult';
import { SteamError } from '../types';

// Shared client for vanity URL resolution (no session needed)
const _vanityHttpClient = new HttpClient();

export const Helpers = {

	/** Returns true if `input` has the four SteamID property keys. */
	isSteamID(input: unknown): input is SteamID {
		if (!input || typeof input !== 'object') return false;
		const keys = Object.keys(input as object);
		if (keys.length !== 4) return false;
		return ['universe', 'type', 'instance', 'accountid'].every((k) => keys.includes(k));
	},

	/**
	 * Decode a Steam-style relative/absolute time string into a Date.
	 * Examples: "Apr 10 @ 3:22pm", "5 minutes ago", "2 hours ago"
	 */
	decodeSteamTime(time: string): Date {
		const date = new Date();

		if (time.includes('@')) {
			const parts = time.split('@');
			if (!parts[0]!.includes(',')) {
				parts[0] += ', ' + date.getFullYear();
			}
			return new Date(parts.join('@').replace(/(am|pm)/, ' $1') + ' UTC');
		}

		// Relative time
		const amount = parseInt(time.replace(/(\d) (minutes|hour|hours) ago/, '$1'), 10);
		if (time.includes('minutes')) {
			date.setMinutes(date.getMinutes() - amount);
		} else if (/hour|hours/.test(time)) {
			date.setHours(date.getHours() - amount);
		}
		return date;
	},

	/**
	 * Returns a SteamError for a given EResult value, or null if the result is OK.
	 */
	eresultError(eresult: number): SteamError | null {
		if (eresult === EResult.OK) {
			return null;
		}
		const err = new SteamError(EResult[eresult] ?? `Error ${eresult}`);
		err.eresult = eresult;
		return err;
	},

	/** Decode a base64url JWT payload. */
	decodeJwt(jwt: string): Record<string, unknown> {
		const parts = jwt.split('.');
		if (parts.length !== 3) {
			throw new Error('Invalid JWT');
		}
		const standardBase64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
		return JSON.parse(Buffer.from(standardBase64, 'base64').toString('utf8')) as Record<string, unknown>;
	},

	/**
	 * Resolve a Steam vanity URL (or full profile URL) to a steamID64 + vanityURL pair.
	 */
	resolveVanityURL(
		url: string,
		callback: (err: Error | null, result?: { vanityURL: string; steamID: string }) => void,
	): void {
		if (!url.includes('steamcommunity.com')) {
			url = 'https://steamcommunity.com/id/' + url;
		}

		_vanityHttpClient.request({ method: 'GET', url: url + '/?xml=1' }).then((response) => {
			const body = typeof response.textBody === 'string'
				? response.textBody
				: response.rawBody.toString('utf8');

			let doc: { profile?: { steamID64?: string; customURL?: string }; response?: { error?: string } };
			try {
				doc = new XMLParser({ parseTagValue: false }).parse(body) as typeof doc;
			} catch {
				callback(new Error("Couldn't parse XML response"));
				return;
			}

			if (doc.response?.error) {
				callback(new Error("Couldn't find Steam ID"));
				return;
			}
			const steamID64 = doc.profile?.steamID64;
			if (!steamID64) {
				callback(new Error("Couldn't parse XML response"));
				return;
			}
			callback(null, { vanityURL: doc.profile?.customURL ?? '', steamID: steamID64 });
		}).catch((err: Error) => callback(err));
	},

	/** Coerce a string or SteamID-shaped object into a SteamID instance. */
	steamID(input: SteamID | string): SteamID {
		if (Helpers.isSteamID(input)) {
			return input as SteamID;
		}
		if (typeof input !== 'string') {
			throw new Error(`Input SteamID value "${String(input)}" is not a string`);
		}
		return new SteamID(input);
	},
};
