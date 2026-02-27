/**
 * node-steamcommunity — TypeScript rewrite
 *
 * Architecture: SteamCommunity base class defined in SteamCommunity.ts.
 * Each component file augments the class via TypeScript module augmentation
 * (declare module + prototype assignment).  This file loads all components
 * as side-effects to ensure every prototype method is attached before
 * anything is exported.
 */
export { SteamCommunity } from './SteamCommunity';
export { EResult } from './resources/EResult';
export { EConfirmationType } from './resources/EConfirmationType';
export { EChatState } from './resources/EChatState';
export { EFriendRelationship } from './resources/EFriendRelationship';
export { EPersonaState } from './resources/EPersonaState';
export { EPersonaStateFlag } from './resources/EPersonaStateFlag';
export { ESharedFileType } from './resources/ESharedFileType';
export { CEconItem } from './classes/CEconItem';
export { CConfirmation } from './classes/CConfirmation';
export { CSteamUser } from './classes/CSteamUser';
export { CSteamGroup } from './classes/CSteamGroup';
export { CSteamSharedFile } from './classes/CSteamSharedFile';
export type { SharedFileData } from './classes/CSteamSharedFile';
export { CMarketItem } from './classes/CMarketItem';
export { CMarketSearchResult } from './classes/CMarketSearchResult';
export { SteamError, PrivacyState } from './types';
export type { SimpleCallback, Callback, SteamHttpRequestOptions, SteamHttpResponse, HttpCallback, SteamCommunityOptions, LoginResult, SteamNotifications, ProfileEditSettings, ProfilePrivacySettings, BoosterPackCatalogResult, CreateApiKeyOptions, CreateApiKeyResponse, GroupAnnouncement, GroupHistoryResult, UserComment, InventoryHistoryOptions, InventoryHistoryResult, } from './types';
import './components/http';
import './components/login';
import './components/webapi';
import './components/users';
import './components/profile';
import './components/market';
import './components/groups';
import './components/sharedfiles';
import './components/inventoryhistory';
import './components/twofactor';
import './components/confirmations';
import './components/help';
import './classes/CSteamUser';
import './classes/CSteamGroup';
import './classes/CMarketItem';
import './classes/CSteamSharedFile';
export { Helpers } from './components/helpers';
import { SteamCommunity } from './SteamCommunity';
export default SteamCommunity;
//# sourceMappingURL=index.d.ts.map