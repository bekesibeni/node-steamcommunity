import { parse } from 'node-html-parser';
import * as FS from 'fs';
import SteamID from 'steamid';

import { SteamCommunity } from '../SteamCommunity';
import { Helpers } from './helpers';
import type { Callback, SimpleCallback, ProfileEditSettings, ProfilePrivacySettings } from '../types';

// ─── Comment privacy state mapping ───────────────────────────────────────────
// Maps ProfilePrivacySettings.comments values to the eCommentPermission integer.
// '1' (private) -> 2, '2' (friends only) -> 0, '3' (public) -> 1

const CommentPrivacyState: Record<string, number> = {
	'1': 2,
	'2': 0,
	'3': 1,
};

// ─── Module augmentation ──────────────────────────────────────────────────────

declare module '../SteamCommunity' {
	interface SteamCommunity {
		setupProfile(callback?: SimpleCallback): void;
		editProfile(settings: ProfileEditSettings, callback?: SimpleCallback): void;
		profileSettings(settings: ProfilePrivacySettings, callback?: Callback<unknown>): void;
		uploadAvatar(image: Buffer | string, format?: string | SimpleCallback, callback?: SimpleCallback): void;
		postProfileStatus(
			statusText: string,
			options?: { appID?: number } | SimpleCallback,
			callback?: Callback<number>,
		): void;
		deleteProfileStatus(postID: number, callback?: SimpleCallback): void;
	}
}

// ─── setupProfile ─────────────────────────────────────────────────────────────

SteamCommunity.prototype.setupProfile = function (
	this: SteamCommunity,
	callback?: SimpleCallback,
): void {
	this._myProfile(
		'edit?welcomed=1',
		null,
		(err, response) => {
			if (err) { callback?.(err); return; }
			if (response.statusCode !== 200) {
				callback?.(new Error('HTTP error ' + response.statusCode));
				return;
			}
			callback?.(null);
		},
		'steamcommunity',
	);
};

// ─── editProfile ──────────────────────────────────────────────────────────────

SteamCommunity.prototype.editProfile = function (
	this: SteamCommunity,
	settings: ProfileEditSettings,
	callback?: SimpleCallback,
): void {
	// Step 1: GET the current profile edit page to read existing values
	this._myProfile(
		'edit/info',
		null,
		(err, _response, body) => {
			if (err) { callback?.(err); return; }

			const html = typeof body === 'string' ? body : '';
			const root = parse(html);

			// The existing profile values are embedded as a data attribute on this element
			const configElem = root.querySelector('#profile_edit_config');
			let existingSettings: Record<string, unknown> = {};

			const dataAttr = configElem?.getAttribute('data-profile-edit');
			if (dataAttr) {
				try {
					existingSettings = JSON.parse(dataAttr) as Record<string, unknown>;
				} catch {
					// Use empty defaults if parsing fails
				}
			}

			// Build the values object from existing settings, then overwrite with user-supplied settings
			const values: Record<string, unknown> = {
				sessionID: this.getSessionID(),
				type: 'profileSave',
				weblink_1_title: '',
				weblink_1_url: '',
				weblink_2_title: '',
				weblink_2_url: '',
				weblink_3_title: '',
				weblink_3_url: '',
				personaName:           existingSettings['strPersonaName']         ?? '',
				real_name:             existingSettings['strRealName']             ?? '',
				summary:               existingSettings['strSummary']              ?? '',
				country:               existingSettings['LocationData']            != null
					? String((existingSettings['LocationData'] as Record<string, unknown>)['locCountryCode'] ?? '')
					: '',
				state:                 existingSettings['LocationData']            != null
					? String((existingSettings['LocationData'] as Record<string, unknown>)['locStateCode'] ?? '')
					: '',
				city:                  existingSettings['LocationData']            != null
					? String((existingSettings['LocationData'] as Record<string, unknown>)['locCityCode'] ?? '')
					: '',
				customURL:             existingSettings['strCustomURL']            ?? '',
				primary_group_steamid: existingSettings['primaryGroupSteamid']    ?? '',
				json: 1,
			};

			// Apply user-supplied settings, mapping friendly names to API names
			if (settings.name !== undefined) {
				values['personaName'] = settings.name;
			}
			if (settings.realName !== undefined) {
				values['real_name'] = settings.realName;
			}
			if (settings.summary !== undefined) {
				values['summary'] = settings.summary;
			}
			if (settings.country !== undefined) {
				values['country'] = settings.country;
			}
			if (settings.state !== undefined) {
				values['state'] = settings.state;
			}
			if (settings.city !== undefined) {
				values['city'] = settings.city;
			}
			if (settings.customURL !== undefined) {
				values['customURL'] = settings.customURL;
			}
			if (settings.primaryGroup !== undefined) {
				const pg = settings.primaryGroup;
				values['primary_group_steamid'] = typeof pg === 'string' ? pg : (pg as SteamID).getSteamID64();
			}

			// Step 2: POST the updated settings
			this._myProfile(
				{ endpoint: 'edit', method: 'POST', json: true },
				values,
				(postErr, _postResponse, postBody) => {
					if (postErr) { callback?.(postErr); return; }

					let parsed: Record<string, unknown> | null = null;
					try {
						parsed = JSON.parse(
							typeof postBody === 'string' ? postBody : JSON.stringify(postBody),
						) as Record<string, unknown>;
					} catch {
						// postBody may already be parsed when json:true
						parsed = postBody as Record<string, unknown> | null;
					}

					if (Number(parsed?.['success']) !== 1) {
						callback?.(new Error(String(parsed?.['errmsg'] ?? 'Unknown error')));
						return;
					}

					callback?.(null);
				},
				'steamcommunity',
			);
		},
		'steamcommunity',
	);
};

// ─── profileSettings ──────────────────────────────────────────────────────────

SteamCommunity.prototype.profileSettings = function (
	this: SteamCommunity,
	settings: ProfilePrivacySettings,
	callback?: Callback<unknown>,
): void {
	// Step 1: GET the current privacy settings
	this._myProfile(
		'edit/settings',
		null,
		(err, _response, body) => {
			if (err) { callback?.(err, null!); return; }

			const html = typeof body === 'string' ? body : '';
			const root = parse(html);

			const configElem = root.querySelector('#profile_edit_config');
			let existingSettings: Record<string, unknown> = {};

			const dataAttr = configElem?.getAttribute('data-profile-edit');
			if (dataAttr) {
				try {
					existingSettings = JSON.parse(dataAttr) as Record<string, unknown>;
				} catch {
					// Use empty defaults
				}
			}

			// Extract existing Privacy object
			const existingPrivacy = (existingSettings['Privacy'] ?? {}) as Record<string, number>;

			// Build the privacy state object from existing settings
			const privacy: Record<string, number> = {
				PrivacyProfile:   existingPrivacy['PrivacyProfile']   ?? 3,
				PrivacyInventory: existingPrivacy['PrivacyInventory'] ?? 3,
				PrivacyInventoryGifts: existingPrivacy['PrivacyInventoryGifts'] ?? 0,
				PrivacyOwnedGames: existingPrivacy['PrivacyOwnedGames'] ?? 3,
				PrivacyPlaytime:  existingPrivacy['PrivacyPlaytime']  ?? 3,
				PrivacyFriendsList: existingPrivacy['PrivacyFriendsList'] ?? 3,
			};

			// Determine existing eCommentPermission
			let eCommentPermission: number = existingPrivacy['eCommentPermission'] ??
				Number(existingSettings['eCommentPermission'] ?? 0);

			// Apply user-requested settings
			if (settings.profile !== undefined) {
				privacy['PrivacyProfile'] = settings.profile;
			}
			if (settings.comments !== undefined) {
				const mappedPermission = CommentPrivacyState[String(settings.comments)];
				if (mappedPermission !== undefined) {
					eCommentPermission = mappedPermission;
				}
			}
			if (settings.inventory !== undefined) {
				privacy['PrivacyInventory'] = settings.inventory;
			}
			if (settings.inventoryGifts !== undefined) {
				privacy['PrivacyInventoryGifts'] = settings.inventoryGifts ? 0 : 1;
			}
			if (settings.gameDetails !== undefined) {
				privacy['PrivacyOwnedGames'] = settings.gameDetails;
			}
			if (settings.playtime !== undefined) {
				privacy['PrivacyPlaytime'] = settings.playtime ? 3 : 1;
			}
			if (settings.friendsList !== undefined) {
				privacy['PrivacyFriendsList'] = settings.friendsList;
			}

			// Step 2: POST the updated privacy settings
			this._myProfile(
				{
					endpoint: 'ajaxsetprivacy/',
					method: 'POST',
					json: true,
				},
				{
					sessionid: this.getSessionID(),
					Privacy: JSON.stringify(privacy),
					eCommentPermission: String(eCommentPermission),
				},
				(postErr, _postResponse, postBody) => {
					if (postErr) { callback?.(postErr, null!); return; }
					callback?.(null, postBody);
				},
				'steamcommunity',
			);
		},
		'steamcommunity',
	);
};

// ─── uploadAvatar ─────────────────────────────────────────────────────────────

SteamCommunity.prototype.uploadAvatar = function (
	this: SteamCommunity,
	image: Buffer | string,
	format?: string | SimpleCallback,
	callback?: SimpleCallback,
): void {
	if (typeof format === 'function') {
		callback = format;
		format = undefined;
	}

	const doUpload = (buffer: Buffer, contentType: string): void => {
		const ext = contentType.replace('image/', '');
		const filename = `avatar.${ext}`;

		if (!this.steamID) {
			callback?.(new Error('Not logged in'));
			return;
		}

		this.httpRequestPost(
			{
				uri: 'https://steamcommunity.com/actions/FileUploader',
				formData: {
					MAX_FILE_SIZE: '1048576',
					type: 'player_avatar_image',
					sId: this.steamID.getSteamID64(),
					sessionid: this.getSessionID(),
					doSub: '1',
					json: '1',
					avatar: {
						value: buffer,
						options: {
							filename,
							contentType,
						},
					},
				},
				json: true,
			},
			(err, _response, body) => {
				if (err) { callback?.(err); return; }

				const b = body as Record<string, unknown> | null;
				if (!b?.['success']) {
					callback?.(new Error(String(b?.['message'] ?? 'Unknown error')));
					return;
				}

				callback?.(null);
			},
			'steamcommunity',
		);
	};

	if (Buffer.isBuffer(image)) {
		doUpload(image, format ?? 'image/jpeg');
	} else if (/^https?:\/\//i.test(image as string)) {
		// Download from URL
		this.httpRequestGet(
			{ uri: image as string, encoding: null },
			(err, response, body) => {
				if (err) { callback?.(err); return; }
				const contentType = String(
					(response.headers as Record<string, string>)['content-type'] ?? format ?? 'image/jpeg',
				).split(';')[0]!.trim();
				doUpload(body as Buffer, contentType);
			},
			'steamcommunity',
		);
	} else {
		// Read from filesystem — guess format from extension
		const filePath = image as string;
		const ext = filePath.split('.').pop()?.toLowerCase() ?? 'jpg';
		const contentType: string = (() => {
			switch (ext) {
				case 'png':  return 'image/png';
				case 'gif':  return 'image/gif';
				case 'jpg':
				case 'jpeg':
				default:     return 'image/jpeg';
			}
		})();

		FS.readFile(filePath, (readErr, data) => {
			if (readErr) { callback?.(readErr); return; }
			doUpload(data, format ? String(format) : contentType);
		});
	}
};

// ─── postProfileStatus ────────────────────────────────────────────────────────

SteamCommunity.prototype.postProfileStatus = function (
	this: SteamCommunity,
	statusText: string,
	options?: { appID?: number } | SimpleCallback,
	callback?: Callback<number>,
): void {
	if (typeof options === 'function') {
		callback = options as unknown as Callback<number>;
		options = {};
	}

	const opts = (options ?? {}) as { appID?: number };

	this._myProfile(
		'ajaxpostuserstatus/',
		{
			appid:       opts.appID ?? 0,
			sessionid:   this.getSessionID(),
			status_text: statusText,
		},
		(err, _response, body) => {
			if (err) { callback?.(err, null!); return; }

			let parsed: Record<string, unknown> | null = null;
			try {
				parsed = JSON.parse(
					typeof body === 'string' ? body : JSON.stringify(body),
				) as Record<string, unknown>;
			} catch {
				parsed = body as Record<string, unknown> | null;
			}

			const blotterHtml = String(parsed?.['blotter_html'] ?? '');
			const match = blotterHtml.match(/id="userstatus_(\d+)_/);
			if (!match?.[1]) {
				callback?.(new Error('Could not find post ID in response'), null!);
				return;
			}

			callback?.(null, parseInt(match[1], 10));
		},
		'steamcommunity',
	);
};

// ─── deleteProfileStatus ──────────────────────────────────────────────────────

SteamCommunity.prototype.deleteProfileStatus = function (
	this: SteamCommunity,
	postID: number,
	callback?: SimpleCallback,
): void {
	this._myProfile(
		'ajaxdeleteuserstatus/',
		{
			sessionid: this.getSessionID(),
			postid:    postID,
		},
		(err, _response, body) => {
			if (err) { callback?.(err); return; }

			let parsed: Record<string, unknown> | null = null;
			try {
				parsed = JSON.parse(
					typeof body === 'string' ? body : JSON.stringify(body),
				) as Record<string, unknown>;
			} catch {
				parsed = body as Record<string, unknown> | null;
			}

			const eresultErr = Helpers.eresultError(Number(parsed?.['success'] ?? 0));
			callback?.(eresultErr);
		},
		'steamcommunity',
	);
};
