/**
 * Test: getUserComments — no login required for public profiles.
 *
 * Fetches the comment section of a Steam profile page and uses
 * node-html-parser to parse the returned HTML fragment (author names,
 * SteamIDs, timestamps, comment text).
 *
 * Usage:
 *   npx tsx examples/get-user-comments.ts [steamID64]
 *   STEAM_ID=76561198... npx tsx examples/get-user-comments.ts
 */

import * as readline from 'readline';
import SteamCommunity from '../src/index';
import type { UserComment } from '../src/index';

// Public profile with visible comments used as default
const DEFAULT_STEAM_ID = '76561198006409530';

const community = new SteamCommunity();

async function main(): Promise<void> {
	let steamID = process.argv[2] ?? process.env['STEAM_ID'] ?? '';

	if (!steamID) {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		steamID = await new Promise<string>((resolve) => {
			rl.question(`Steam ID (leave blank for default ${DEFAULT_STEAM_ID}): `, (ans) => {
				rl.close();
				resolve(ans.trim() || DEFAULT_STEAM_ID);
			});
		});
	}

	// Accept full profile URLs
	steamID = (steamID.match(/steamcommunity\.com\/profiles\/(\d+)/)?.[1] ?? steamID) || DEFAULT_STEAM_ID;

	console.log(`\nFetching comments for ${steamID}...\n`);

	const [comments, totalCount] = await new Promise<[UserComment[], number]>((resolve, reject) => {
		community.getUserComments(
			steamID,
			{ start: 0, count: 10 },
			(err, result) => {
				if (err) reject(err);
				else resolve(result);
			},
		);
	});

	console.log(`Total comments on profile: ${totalCount}`);
	console.log(`Fetched this request:      ${comments.length}\n`);

	if (comments.length === 0) {
		console.log('No comments visible (profile may be private or have no comments).');
		return;
	}

	console.log('─'.repeat(60));
	for (const comment of comments) {
		console.log(comment);
	}

	// Validate the parsed output
	console.log('\n── Validation ────────────────────────────────────────────');
	let passed = 0;
	let failed = 0;

	const check = (label: string, ok: boolean) => {
		console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`);
		ok ? passed++ : failed++;
	};

	check('all comments have non-empty id',     comments.every((c) => c.id.length > 0));
	check('all comments have valid SteamID',    comments.every((c) => c.author.steamID.isValid()));
	check('all comments have a Date object',    comments.every((c) => c.date instanceof Date && !isNaN(c.date.getTime())));
	check('all comments have non-empty text',   comments.every((c) => c.text.length > 0));
	check('all comments have non-empty html',   comments.every((c) => c.html.length > 0));
	check('all author names are non-empty',     comments.every((c) => c.author.name.length > 0));

	console.log(`\n${passed} passed, ${failed} failed`);
}

main()
	.then(() => process.exit(0))
	.catch((err: Error) => {
		console.error('Error:', err.message);
		process.exit(1);
	});
