import type { IncomingHttpHeaders } from 'http';

// ─── Callback primitives ────────────────────────────────────────────────────

/** Callback that only signals success or failure. */
export type SimpleCallback = (err: Error | null) => void;

/** Callback that returns a single typed result on success. */
export type Callback<T> = (err: Error | null, result: T) => void;

// ─── Augmented Steam error ───────────────────────────────────────────────────

/** Error enriched with Steam-specific fields set by various methods. */
export class SteamError extends Error {
	eresult?: number;
	code?: number;
	emaildomain?: string;
	inner?: unknown;
	line?: number;

	constructor(message: string) {
		super(message);
		this.name = 'SteamError';
	}
}

// ─── HTTP layer types ────────────────────────────────────────────────────────

/** Shape of a multipart field with metadata. */
export interface FormDataField {
	value: Buffer | string;
	options?: {
		filename?: string;
		contentType?: string;
	};
}

/** Request options accepted by `httpRequest()` / `httpRequestGet()` / `httpRequestPost()`. */
export interface SteamHttpRequestOptions {
	uri?: string;
	url?: string;
	method?: string;
	headers?: Record<string, string | number>;
	form?: Record<string, unknown>;
	formData?: Record<string, Buffer | string | FormDataField>;
	body?: Buffer | string;
	qs?: Record<string, unknown>;
	json?: boolean;
	followRedirect?: boolean;
	followAllRedirects?: boolean;
	checkHttpError?: boolean;
	checkCommunityError?: boolean;
	checkTradeError?: boolean;
	checkJsonError?: boolean;
	encoding?: null | string;
	timeout?: number;
	rejectUnauthorized?: boolean;
	localAddress?: string;
	/** Internal — endpoint path, used by `_myProfile()`. */
	endpoint?: string;
}

/** Normalised response object passed to every HTTP callback. */
export interface SteamHttpResponse {
	statusCode: number;
	statusMessage: string;
	headers: IncomingHttpHeaders;
	body: unknown;
	url: string;
	request: { uri: { href: string } };
}

/** Signature of every HTTP callback used internally. */
export type HttpCallback = (
	err: Error | null,
	response: SteamHttpResponse,
	body: unknown,
) => void;

// ─── `_myProfile()` endpoint argument ───────────────────────────────────────

/** Plain string endpoint, or a full options object passed to `_myProfile()`. */
export type MyProfileEndpoint =
	| string
	| (SteamHttpRequestOptions & { endpoint: string });

// ─── `onPreHttpRequest` hook ─────────────────────────────────────────────────

export type PreHttpRequestHook = (
	requestID: number,
	source: string,
	options: SteamHttpRequestOptions,
	continueRequest: (err: Error | null) => void,
) => boolean;

// ─── Constructor options ─────────────────────────────────────────────────────

export interface SteamCommunityOptions {
	userAgent?: string;
	localAddress?: string;
	socksProxy?: string;
	httpProxy?: string;
	timeout?: number;
	request?: unknown;
}

// ─── Confirmation checker internal state ────────────────────────────────────

export interface ConfirmationKey {
	time: number;
	key: string;
}

export interface ConfirmationQueueState {
	items: import('./classes/CConfirmation').CConfirmation[];
	processing: boolean;
}

// ─── Login callback result ───────────────────────────────────────────────────

export interface LoginResult {
	sessionID: string;
	cookies: string[];
	steamguard: string;
	mobileAccessToken: string | null;
}

// ─── Inventory types ─────────────────────────────────────────────────────────

/** Raw asset_properties entry returned by the inventory endpoint. */
export interface RawAssetProperty {
	propertyid: number;
	int_value?: string | number;
	float_value?: string | number;
	string_value?: string;
}

export interface RawAssetAccessory {
	classid: string;
	parent_relationship_properties?: RawAssetProperty[];
}

export interface RawAssetPropertiesEntry {
	assetid: string;
	asset_properties?: RawAssetProperty[];
	asset_accessories?: RawAssetAccessory[];
}

// ─── Notification counts ─────────────────────────────────────────────────────

export interface SteamNotifications {
	trades: number;
	gameTurns: number;
	moderatorMessages: number;
	comments: number;
	items: number;
	invites: number;
	gifts: number;
	chat: number;
	helpRequestReplies: number;
	accountAlerts: number;
}

// ─── Profile edit settings ───────────────────────────────────────────────────

export interface ProfileEditSettings {
	name?: string;
	realName?: string;
	summary?: string;
	country?: string;
	state?: string;
	city?: string;
	customURL?: string;
	primaryGroup?: import('steamid') | string;
}

export interface ProfilePrivacySettings {
	profile?: number;
	comments?: number;
	inventory?: number;
	inventoryGifts?: boolean;
	gameDetails?: number;
	playtime?: boolean;
	friendsList?: number;
}

// ─── Market types ────────────────────────────────────────────────────────────

export interface MedianSalePrice {
	hour: Date;
	price: number;
	quantity: number;
}

export interface BoosterPackCatalogEntry {
	appid: number;
	name: string;
	series: number;
	price: number;
	unavailable: boolean;
	availableAtTime: Date | null;
}

export interface BoosterPackCatalogResult {
	totalGems: number;
	tradableGems: number;
	untradableGems: number;
	catalog: Record<number, BoosterPackCatalogEntry>;
}

// ─── WebAPI types ────────────────────────────────────────────────────────────

export interface CreateApiKeyOptions {
	domain: string;
	requestID?: string;
	identitySecret?: string | Buffer;
}

export interface CreateApiKeyResponse {
	confirmationRequired: boolean;
	apiKey?: string;
	finalizeOptions?: CreateApiKeyOptions;
}

// ─── Group announcement ──────────────────────────────────────────────────────

export interface GroupAnnouncement {
	headline: string;
	content: string;
	date: Date;
	author: string | null;
	aid: string;
}

// ─── Group history ───────────────────────────────────────────────────────────

export interface GroupHistoryItem {
	type: string;
	user?: import('steamid');
	actor?: import('steamid');
	date: Date;
}

export interface GroupHistoryResult {
	first?: number;
	last?: number;
	total?: number;
	items: GroupHistoryItem[];
}

// ─── Group comment ───────────────────────────────────────────────────────────

export interface GroupComment {
	authorName: string;
	authorId: string;
	date: Date;
	commentId: string;
	text: string;
}

// ─── User comments ───────────────────────────────────────────────────────────

export interface UserComment {
	id: string;
	author: {
		steamID: import('steamid');
		name: string;
		avatar: string | undefined;
		state: string;
	};
	date: Date;
	text: string;
	html: string;
}

// ─── Inventory history ───────────────────────────────────────────────────────

export interface InventoryHistoryOptions {
	direction?: 'past' | 'future';
	startTime?: Date | number;
	startTrade?: string;
	resolveVanityURLs?: boolean;
}

export interface InventoryHistoryResult {
	firstTradeTime?: Date;
	firstTradeID?: string;
	lastTradeTime?: Date;
	lastTradeID?: string;
	trades: InventoryHistoryTrade[];
}

export interface InventoryHistoryTrade {
	onHold: boolean;
	date: Date;
	partnerName: string | null;
	partnerSteamID: import('steamid') | null;
	partnerVanityURL: string | null;
	itemsReceived: import('./classes/CEconItem').CEconItem[];
	itemsGiven: import('./classes/CEconItem').CEconItem[];
}

// ─── Privacy state constants ─────────────────────────────────────────────────

export const PrivacyState = {
	Private: 1,
	FriendsOnly: 2,
	Public: 3,
} as const;

export type PrivacyStateValue = (typeof PrivacyState)[keyof typeof PrivacyState];
