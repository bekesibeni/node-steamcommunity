import type { SteamCommunity } from '../SteamCommunity';
import type { SimpleCallback } from '../types';
import { EConfirmationType } from '../resources/EConfirmationType';

export class CConfirmation {
	/** Non-enumerable back-reference to the parent community instance. */
	declare private readonly _community: SteamCommunity;

	readonly id: string;
	readonly type: EConfirmationType;
	/** For Trade confirmations this is the trade offer ID; for Market listings the listing ID. */
	readonly creator: string;
	/** The nonce/key for this specific confirmation. */
	readonly key: string;
	readonly title: string;
	readonly receiving: string;
	readonly sending: string;
	/** ISO string — kept for backward compatibility. */
	readonly time: string;
	readonly timestamp: Date;
	readonly icon: string;
	/** Convenience: trade offer ID if this is a Trade confirmation, else null. */
	readonly offerID: string | null;

	constructor(community: SteamCommunity, data: {
		id: string | number;
		type: EConfirmationType;
		creator: string | number;
		key: string;
		title: string;
		receiving: string;
		sending: string;
		time: string;
		timestamp: Date;
		icon: string;
	}) {
		Object.defineProperty(this, '_community', { value: community, enumerable: false });

		this.id = String(data.id);
		this.type = data.type;
		this.creator = String(data.creator);
		this.key = data.key;
		this.title = data.title;
		this.receiving = data.receiving;
		this.sending = data.sending;
		this.time = data.time;
		this.timestamp = data.timestamp;
		this.icon = data.icon;
		this.offerID = this.type === EConfirmationType.Trade ? this.creator : null;
	}

	/**
	 * Get the trade offer ID associated with this confirmation.
	 * For Trade confirmations the ID is already available locally,
	 * so `time` and `key` are not needed and can be omitted.
	 */
	getOfferID(
		time: number,
		key: string,
		callback: (err: Error | null, offerID: string | null) => void,
	): void {
		if (this.type && this.creator) {
			if (this.type !== EConfirmationType.Trade) {
				callback(new Error('Not a trade confirmation'), null);
				return;
			}
			callback(null, this.creator);
			return;
		}
		this._community.getConfirmationOfferID(this.id, time, key, callback);
	}

	/** Accept or cancel this confirmation. */
	respond(
		time: number,
		key: string | { tag: string; key: string },
		accept: boolean,
		callback: SimpleCallback,
	): void {
		this._community.respondToConfirmation(this.id, this.key, time, key, accept, callback);
	}
}
