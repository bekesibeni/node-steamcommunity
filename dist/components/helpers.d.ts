import SteamID from 'steamid';
import { SteamError } from '../types';
export declare const Helpers: {
    /** Returns true if `input` has the four SteamID property keys. */
    isSteamID(input: unknown): input is SteamID;
    /**
     * Decode a Steam-style relative/absolute time string into a Date.
     * Examples: "Apr 10 @ 3:22pm", "5 minutes ago", "2 hours ago"
     */
    decodeSteamTime(time: string): Date;
    /**
     * Returns a SteamError for a given EResult value, or null if the result is OK.
     */
    eresultError(eresult: number): SteamError | null;
    /** Decode a base64url JWT payload. */
    decodeJwt(jwt: string): Record<string, unknown>;
    /**
     * Resolve a Steam vanity URL (or full profile URL) to a steamID64 + vanityURL pair.
     */
    resolveVanityURL(url: string, callback: (err: Error | null, result?: {
        vanityURL: string;
        steamID: string;
    }) => void): void;
    /** Coerce a string or SteamID-shaped object into a SteamID instance. */
    steamID(input: SteamID | string): SteamID;
};
//# sourceMappingURL=helpers.d.ts.map