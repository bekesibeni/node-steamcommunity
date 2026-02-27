/**
 * Test: getSteamGroup + getAllGroupAnnouncements — no login required.
 *
 * Exercises:
 *  1. getSteamGroup        → parses group memberList XML (node-html-parser)
 *  2. getGroupMembers      → paginates memberList XML
 *  3. getAllGroupAnnouncements → parses RSS feed including the <link> void-element edge case
 *
 * Usage:
 *   npx tsx examples/get-group-info.ts [groupURL or SteamID64]
 *   GROUP=tf2 npx tsx examples/get-group-info.ts
 */

import SteamCommunity from '../src/index';
import type { CSteamGroup } from '../src/index';
import type { GroupAnnouncement } from '../src/index';

const DEFAULT_GROUP = 'tf2'; // Valve's official TF2 group

const community = new SteamCommunity();

function check(label: string, ok: boolean): boolean {
	console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`);
	return ok;
}

async function main(): Promise<void> {
	const groupId = process.argv[2] ?? process.env['GROUP'] ?? DEFAULT_GROUP;
	console.log(`\nFetching Steam group: ${groupId}\n`);

	// ── 1. getSteamGroup ─────────────────────────────────────────────────────
	const group = await new Promise<CSteamGroup>((resolve, reject) => {
		community.getSteamGroup(groupId, (err, g) => (err ? reject(err) : resolve(g)));
	});

	console.log('── Group info (from memberList XML) ──────────────────────');
	console.log(`  steamID:       ${group.steamID.getSteamID64()}`);
	console.log(`  name:          ${group.name}`);
	console.log(`  url:           ${group.url}`);
	console.log(`  headline:      ${group.headline.slice(0, 60)}${group.headline.length > 60 ? '…' : ''}`);
	console.log(`  avatarHash:    ${group.avatarHash}`);
	console.log(`  avatarURL:     ${group.getAvatarURL('full')}`);
	console.log(`  members:       ${group.members.toLocaleString()}`);
	console.log(`  membersOnline: ${group.membersOnline.toLocaleString()}`);
	console.log(`  membersInGame: ${group.membersInGame.toLocaleString()}`);
	console.log(`  membersInChat: ${group.membersInChat.toLocaleString()}`);

	console.log('\n── getSteamGroup validation ──────────────────────────────');
	let passed = 0; let failed = 0;
	const assert = (label: string, ok: boolean) => { check(label, ok) ? passed++ : failed++; };

	assert('steamID is valid',            group.steamID.isValid());
	assert('steamID is clan type',        group.steamID.type === 7); // SteamID.Type.CLAN
	assert('name is non-empty',           group.name.length > 0);
	assert('url is non-empty',            group.url.length > 0);
	assert('avatarHash is hex',           /^[0-9a-f]+$/.test(group.avatarHash));
	assert('getAvatarURL returns https',  group.getAvatarURL().startsWith('https://'));
	assert('members > 0',                 group.members > 0);
	assert('membersOnline >= 0',          group.membersOnline >= 0);

	// ── 2. getGroupMembers (first page only) ──────────────────────────────────
	console.log('\n── getGroupMembers (first page of XML pagination) ────────');
	const members = await new Promise<import('steamid')[]>((resolve, reject) => {
		community.getGroupMembers(group.steamID, (err, list) => (err ? reject(err) : resolve(list)));
	});
	console.log(`  Members fetched (first page): ${members.length}`);
	assert('fetched at least 1 member',     members.length > 0);
	assert('all members have valid SteamID', members.every(m => m.isValid()));
	assert('all members are INDIVIDUAL type', members.every(m => m.type === 1));

	// ── 3. getAllGroupAnnouncements — exercises the RSS <link> edge case ───────
	console.log('\n── getAllGroupAnnouncements (RSS XML + <link> parsing) ────');
	const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // last 1 year
	const announcements = await new Promise<GroupAnnouncement[]>((resolve, reject) => {
		group.getAllAnnouncements(since, (err, list) => (err ? reject(err) : resolve(list)));
	});
	console.log(`  Announcements in last year: ${announcements.length}`);

	if (announcements.length > 0) {
		const first = announcements[0]!;
		console.log(`\n  Latest announcement:`);
		console.log(`    headline: ${first.headline.slice(0, 60)}${first.headline.length > 60 ? '…' : ''}`);
		console.log(`    aid:      ${first.aid}`);
		console.log(`    date:     ${first.date.toISOString()}`);
		console.log(`    author:   ${first.author ?? '(none)'}`);

		assert('all announcements have non-empty aid', announcements.every(a => a.aid.length > 0));
		assert('aid is numeric string',               announcements.every(a => /^\d+$/.test(a.aid)));
		assert('all dates are valid Date objects',    announcements.every(a => a.date instanceof Date && !isNaN(a.date.getTime())));
		assert('all headlines are non-empty',         announcements.every(a => a.headline.length > 0));
	} else {
		console.log('  (no announcements in the last year — skipping announcement assertions)');
	}

	console.log(`\n${passed} passed, ${failed} failed`);
}

main()
	.then(() => process.exit(0))
	.catch((err: Error) => { console.error('Error:', err.message); process.exit(1); });
