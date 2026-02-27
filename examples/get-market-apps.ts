/**
 * Test: getMarketApps — no login required.
 *
 * Fetches the Steam Community Market homepage and uses node-html-parser to
 * scrape the list of games that have market listings.
 *
 * Usage: npx tsx examples/get-market-apps.ts
 */

import SteamCommunity from '../src/index';

const community = new SteamCommunity();

console.log('Fetching Steam Market app list...\n');

community.getMarketApps((err, apps) => {
	if (err) {
		console.error('Error:', err.message);
		process.exit(1);
	}

	const entries = Object.entries(apps);
	console.log(`Found ${entries.length} games on the Steam Market\n`);

	// Print first 20 sorted by appid
	const sorted = entries
		.map(([appid, name]) => ({ appid: parseInt(appid, 10), name }))
		.sort((a, b) => a.appid - b.appid)
		.slice(0, 20);

	const pad = (s: string | number, n: number) => String(s).padEnd(n);

	console.log(pad('AppID', 10) + 'Name');
	console.log('-'.repeat(50));
	for (const { appid, name } of sorted) {
		console.log(pad(appid, 10) + name);
	}

	if (entries.length > 20) {
		console.log(`\n... and ${entries.length - 20} more.`);
	}

	// Spot-check a few well-known appids
	console.log('\n── Spot checks ───────────────────────────────────');
	const checks: Record<number, string> = {
		730: 'Counter-Strike 2',
		440: 'Team Fortress 2',
		570: 'Dota 2',
		252490: 'Rust',
	};
	for (const [appid, expectedName] of Object.entries(checks)) {
		const found = apps[appid];
		const ok = found !== undefined;
		console.log(`  ${ok ? 'OK' : 'MISSING'} appid ${appid} → ${found ?? '(not found)'}`);
	}

	process.exit(0);
});
