import type { SimpleCallback } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        enableTwoFactor(callback: (err: Error | null, response?: Record<string, unknown>) => void): void;
        finalizeTwoFactor(secret: string | Buffer, activationCode: string, callback: SimpleCallback): void;
        disableTwoFactor(revocationCode: string, callback: SimpleCallback): void;
    }
}
//# sourceMappingURL=twofactor.d.ts.map