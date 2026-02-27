import type { SimpleCallback } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        restorePackage(packageID: number | string, callback?: SimpleCallback): void;
        removePackage(packageID: number | string, callback?: SimpleCallback): void;
    }
}
//# sourceMappingURL=help.d.ts.map