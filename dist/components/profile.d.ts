import type { Callback, SimpleCallback, ProfileEditSettings, ProfilePrivacySettings } from '../types';
declare module '../SteamCommunity' {
    interface SteamCommunity {
        setupProfile(callback?: SimpleCallback): void;
        editProfile(settings: ProfileEditSettings, callback?: SimpleCallback): void;
        profileSettings(settings: ProfilePrivacySettings, callback?: Callback<unknown>): void;
        uploadAvatar(image: Buffer | string, format?: string | SimpleCallback, callback?: SimpleCallback): void;
        postProfileStatus(statusText: string, options?: {
            appID?: number;
        } | SimpleCallback, callback?: Callback<number>): void;
        deleteProfileStatus(postID: number, callback?: SimpleCallback): void;
    }
}
//# sourceMappingURL=profile.d.ts.map