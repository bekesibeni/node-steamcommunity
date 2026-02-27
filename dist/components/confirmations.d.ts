import { CConfirmation } from '../classes/CConfirmation';
import type { SimpleCallback, Callback, ConfirmationKey } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        getConfirmations(time: number, key: string | {
            tag: string;
            key: string;
        }, callback: Callback<CConfirmation[]>): void;
        getConfirmationOfferID(confID: string, time: number, key: string, callback: (err: Error | null, offerID: string | null) => void): void;
        respondToConfirmation(confID: string | string[], confKey: string | string[], time: number, key: string | {
            tag: string;
            key: string;
        }, accept: boolean, callback?: SimpleCallback): void;
        acceptAllConfirmations(time: number, confKey: string, allowKey: string, callback: Callback<CConfirmation[]>): void;
        startConfirmationChecker(pollInterval: number, identitySecret?: string | Buffer | null): void;
        stopConfirmationChecker(): void;
        checkConfirmations(): void;
        acknowledgeTradeProtection(callback?: SimpleCallback): void;
        _confirmationCheckerGetKey(tag: string, callback: (err: Error | null, key?: ConfirmationKey) => void): void;
    }
}
//# sourceMappingURL=confirmations.d.ts.map