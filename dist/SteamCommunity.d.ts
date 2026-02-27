import { EventEmitter } from 'events';
import { HttpClient, CookieJar } from '@doctormckay/stdlib/http';
import SteamID from 'steamid';
import { EResult } from './resources/EResult';
import { EConfirmationType } from './resources/EConfirmationType';
import { ESharedFileType } from './resources/ESharedFileType';
import { EFriendRelationship } from './resources/EFriendRelationship';
import { EPersonaState } from './resources/EPersonaState';
import { EPersonaStateFlag } from './resources/EPersonaStateFlag';
import { EChatState } from './resources/EChatState';
import { PrivacyState } from './types';
import type { SteamCommunityOptions, ConfirmationKey, ConfirmationQueueState, PreHttpRequestHook, SteamHttpRequestOptions } from './types';
import type { CConfirmation } from './classes/CConfirmation';
export { SteamID, EResult, EConfirmationType, ESharedFileType, EFriendRelationship, PrivacyState };
export declare class SteamCommunity extends EventEmitter {
    static readonly SteamID: typeof SteamID;
    static readonly EResult: typeof EResult;
    static readonly ConfirmationType: typeof EConfirmationType;
    static readonly ESharedFileType: typeof ESharedFileType;
    static readonly EFriendRelationship: typeof EFriendRelationship;
    static readonly ChatState: typeof EChatState;
    static readonly PersonaState: typeof EPersonaState;
    static readonly PersonaStateFlag: typeof EPersonaStateFlag;
    static readonly PrivacyState: {
        readonly Private: 1;
        readonly FriendsOnly: 2;
        readonly Public: 3;
    };
    /** Logged-in account SteamID — set by `setCookies()`. */
    steamID: SteamID | null;
    /** Mobile app access token — set by `setMobileAppAccessToken()`. */
    mobileAccessToken?: string;
    /** Set this to intercept HTTP requests before they are sent. Return true to delay the request. */
    onPreHttpRequest?: PreHttpRequestHook;
    _httpClient: HttpClient;
    _jar: CookieJar;
    _captchaGid: number;
    _httpRequestID: number;
    _options: SteamCommunityOptions;
    _profileURL?: string;
    _httpRequestConvenienceMethod?: string;
    _timeOffset?: number;
    _usedConfTimes?: number[];
    _confirmationTimer?: ReturnType<typeof setTimeout>;
    _confirmationPollInterval?: number;
    _knownConfirmations?: Record<string, CConfirmation>;
    _confirmationKeys?: Record<string, ConfirmationKey>;
    _identitySecret?: string;
    _confirmationQueueState?: ConfirmationQueueState;
    constructor(options?: SteamCommunityOptions | string);
    _setCookie(cookie: string, _secure?: boolean): void;
    setCookies(cookies: string[]): void;
    getSessionID(host?: string): string;
    getCookies(url?: string): string;
    _myProfile(endpoint: string | (SteamHttpRequestOptions & {
        endpoint: string;
    }), form: Record<string, unknown> | null, callback: (err: Error | null, response: import('./types').SteamHttpResponse, body: unknown) => void, source?: string): void;
    /** @internal implemented in components/http.ts */
    httpRequest: (uriOrOptions: string | SteamHttpRequestOptions, optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback, callbackOrSource?: import('./types').HttpCallback | string, source?: string) => void;
    /** @internal implemented in components/http.ts */
    httpRequestGet: (uriOrOptions: string | SteamHttpRequestOptions, optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback, callbackOrSource?: import('./types').HttpCallback | string, source?: string) => void;
    /** @internal implemented in components/http.ts */
    httpRequestPost: (uriOrOptions: string | SteamHttpRequestOptions, optionsOrCallback?: SteamHttpRequestOptions | import('./types').HttpCallback, callbackOrSource?: import('./types').HttpCallback | string, source?: string) => void;
    /** @internal implemented in components/http.ts */
    _performHttpRequest: (options: SteamHttpRequestOptions, callback: import('./types').HttpCallback) => void;
    /** @internal implemented in components/http.ts */
    _notifySessionExpired: (err: Error) => void;
    /** @internal implemented in components/http.ts */
    _checkHttpError: (err: Error | null, response: import('./types').SteamHttpResponse, callback: import('./types').HttpCallback, body: unknown) => Error | false;
    /** @internal implemented in components/webapi.ts */
    _verifyMobileAccessToken: () => void;
    /** @internal implemented in components/confirmations.ts */
    acceptConfirmationForObject: (identitySecret: string | Buffer, objectID: string | number, callback: import('./types').SimpleCallback) => void;
}
//# sourceMappingURL=SteamCommunity.d.ts.map