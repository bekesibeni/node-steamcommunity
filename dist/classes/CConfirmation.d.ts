import type { SteamCommunity } from '../SteamCommunity';
import type { SimpleCallback } from '../types';
import { EConfirmationType } from '../resources/EConfirmationType';
export declare class CConfirmation {
    /** Non-enumerable back-reference to the parent community instance. */
    private readonly _community;
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
    });
    /**
     * Get the trade offer ID associated with this confirmation.
     * For Trade confirmations the ID is already available locally,
     * so `time` and `key` are not needed and can be omitted.
     */
    getOfferID(time: number, key: string, callback: (err: Error | null, offerID: string | null) => void): void;
    /** Accept or cancel this confirmation. */
    respond(time: number, key: string | {
        tag: string;
        key: string;
    }, accept: boolean, callback: SimpleCallback): void;
}
//# sourceMappingURL=CConfirmation.d.ts.map