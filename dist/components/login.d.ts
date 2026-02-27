import SteamID from 'steamid';
import type { LoginResult } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        login(details: LoginDetails, callback: LoginCallback): void;
        getClientLogonToken(callback: (err: Error | null, token?: ClientLogonToken) => void): void;
        _modernLogin(logOnDetails: LoginDetails & {
            disableMobile: boolean;
        }): Promise<LoginResult>;
    }
}
export interface LoginDetails {
    accountName: string;
    password: string;
    steamguard?: string;
    authCode?: string;
    twoFactorCode?: string;
    disableMobile?: boolean;
}
export interface ClientLogonToken {
    steamID: SteamID;
    accountName: string;
    webLogonToken: string;
}
type LoginCallback = (err: Error | null, sessionID?: string, cookies?: string[], steamguard?: string, _unused?: null) => void;
export {};
//# sourceMappingURL=login.d.ts.map