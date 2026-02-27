declare module 'steam-totp' {
	import type SteamID from 'steamid';

	export function getDeviceID(steamID: SteamID | string): string;
	export function generateAuthCode(secret: string | Buffer, timeOffset?: number): string;
	export function time(timeOffset?: number): number;
	export function getConfirmationKey(identitySecret: string | Buffer, time: number, tag: string): string;
	export function getTimeOffset(callback: (err: Error | null, offset: number, latency: number) => void): void;
}

declare module '@doctormckay/user-agents' {
	export function chrome(): string;
}
