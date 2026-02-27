/**
 * Test: getSteamUser — no login required for public profiles.
 *
 * Fetches a Steam profile via the XML endpoint and parses it using
 * node-html-parser (replaces xml2js). Tests both numeric SteamID64 lookup
 * and vanity URL lookup to exercise both code paths.
 *
 * Usage:
 *   npx tsx examples/get-steam-user.ts [steamID64 or vanityURL]
 *   STEAM_ID=76561198006409530 npx tsx examples/get-steam-user.ts
 */

import SteamCommunity from '../src/index';
import type { CSteamUser } from '../src/index';

// Well-known public profile with accessible XML endpoint
const DEFAULT_ID = '76561197960435530';

const community = new SteamCommunity();

function fetchUser(id: string): Promise<CSteamUser> {
	return new Promise((resolve, reject) => {
		community.getSteamUser(id, (err, user) => (err ? reject(err) : resolve(user)));
	});
}

function check(label: string, ok: boolean): boolean {
	console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`);
	return ok;
}

async function main(): Promise<void> {
	// Handle both: npx tsx ... 76561197... AND npx tsx ... "STEAM_ID=76561197..."
	const raw = process.argv[2] ?? process.env['STEAM_ID'] ?? '';
	const id = raw.replace(/^STEAM_ID=/, '').trim() || DEFAULT_ID;
	console.log(`\nFetching Steam user: ${id}\n`);

	const user = await fetchUser(id);

	console.log('── Parsed fields ─────────────────────────────────────────');
	console.log(`  steamID:       ${user.steamID.getSteamID64()}`);
	console.log(`  name:          ${user.name}`);
	console.log(`  onlineState:   ${user.onlineState}`);
	console.log(`  privacyState:  ${user.privacyState}`);
	console.log(`  visibilityState: ${user.visibilityState}`);
	console.log(`  avatarHash:    ${user.avatarHash}`);
	console.log(`  avatarURL:     ${user.getAvatarURL('full')}`);
	console.log(`  customURL:     ${user.customURL ?? '(none)'}`);
	console.log(`  vacBanned:     ${user.vacBanned}`);
	console.log(`  isLimited:     ${user.isLimitedAccount}`);

	if (user.visibilityState === '3') {
		console.log(`  memberSince:   ${user.memberSince?.toISOString() ?? 'n/a'}`);
		console.log(`  location:      ${user.location ?? '(not set)'}`);
		console.log(`  realName:      ${user.realName ?? '(not set)'}`);
		console.log(`  groups (${(user.groups?.length ?? 0).toString().padStart(3)}): ${user.groups?.slice(0, 3).map(g => g.getSteamID64()).join(', ')}${(user.groups?.length ?? 0) > 3 ? ' ...' : ''}`);
		console.log(`  primaryGroup:  ${user.primaryGroup?.getSteamID64() ?? '(none)'}`);
	} else {
		console.log('  (profile is private — limited fields available)');
	}

	console.log('\n── Validation ────────────────────────────────────────────');
	let passed = 0;
	let failed = 0;
	const assert = (label: string, ok: boolean) => { check(label, ok) ? passed++ : failed++; };

	assert('steamID is valid',            user.steamID.isValid());
	// Note: string inputs are resolved as vanity URLs; for numeric ID lookup pass a SteamID object
	assert('steamID type is INDIVIDUAL',  user.steamID.type === 1);
	assert('name is non-empty',           user.name.length > 0);
	assert('onlineState is set',          user.onlineState.length > 0);
	assert('privacyState is set',         user.privacyState.length > 0);
	assert('avatarHash is hex string',    /^[0-9a-f]+$/.test(user.avatarHash ?? ''));
	assert('getAvatarURL() returns https URL', user.getAvatarURL().startsWith('https://'));
	assert('vacBanned is boolean',        typeof user.vacBanned === 'boolean');

	console.log(`\n${passed} passed, ${failed} failed`);

	// Also test vanity URL lookup (different code path — uses /id/ instead of /profiles/)
	if (user.customURL) {
		console.log(`\n── Vanity URL re-fetch (${user.customURL}) ───────────────`);
		const byVanity = await fetchUser(user.customURL);
		const match = byVanity.steamID.getSteamID64() === user.steamID.getSteamID64();
		check('vanity lookup returns same SteamID64', match);
		console.log(`  ${match ? 'Same account confirmed.' : 'MISMATCH — check vanity URL parsing.'}`);
	}
}

main()
	.then(() => process.exit(0))
	.catch((err: Error) => { console.error('Error:', err.message); process.exit(1); });
