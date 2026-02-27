/**
 * Fetch a CS2 inventory and print item details.
 *
 * Usage:
 *   npx tsx examples/get-inventory.ts [steamID64]
 *   STEAM_ID=76561198... npx tsx examples/get-inventory.ts
 */

import * as readline from 'readline';
import SteamCommunity from '../src/index';
import type { CEconItem } from '../src/index';

const CS2_APP_ID    = 730;
const CS2_CONTEXT_ID = 2;

const community = new SteamCommunity();

// ── Helpers ───────────────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

function getInventory(steamID: string): Promise<{ inventory: CEconItem[]; currency: CEconItem[]; totalCount: number }> {
	return new Promise((resolve, reject) => {
		community.getUserInventoryContents(
			steamID,
			CS2_APP_ID,
			CS2_CONTEXT_ID,
			false,       // tradableOnly — false so we see all items
			'english',
			(err, inventory, currency, totalCount) => {
				if (err) return reject(err);
				resolve({ inventory, currency, totalCount });
			},
		);
	});
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	let steamID = process.argv[2] ?? process.env['STEAM_ID'] ?? '';

	if (!steamID) {
		steamID = await prompt('Steam ID (SteamID64 or profile URL): ');
	}

	if (!steamID) {
		console.error('No Steam ID provided.');
		process.exit(1);
	}

	// Accept full profile URLs
	const urlMatch = steamID.match(/steamcommunity\.com\/profiles\/(\d+)/);
	if (urlMatch) steamID = urlMatch[1]!;

	console.log(`\nFetching CS2 inventory for ${steamID}...\n`);

	try {
		const { inventory, currency, totalCount } = await getInventory(steamID);

		console.log(`Total count (reported by Steam API): ${totalCount}`);
		console.log(`Items received this request:         ${inventory.length}`);
		console.log(`Currency items:                      ${currency.length}`);

		if (inventory.length > 0) {
			const first = inventory[0]!;
			console.log('\n── First item ───────────────────────────────────────────');
			console.log(`  name:          ${first.market_hash_name ?? first.name ?? '(unknown)'}`);
			console.log(`  assetid:       ${first.assetid}`);
			console.log(`  classid:       ${first.classid}`);
			console.log(`  tradable:      ${first.tradable}`);
			console.log(`  marketable:    ${first.marketable}`);
			console.log(`  image URL:     ${first.getImageURL()}`);

			// v4 CS2 asset properties (float, paint seed, stickers)
			const props = first.asset_properties;
			if (Object.keys(props).length > 0) {
				console.log(`  paint_seed:    ${props.paint_seed ?? 'n/a'}`);
				console.log(`  float_value:   ${props.float_value ?? 'n/a'}`);
				console.log(`  nametag:       ${props.nametag ?? 'n/a'}`);
			}

			if (first.asset_accessories.length > 0) {
				console.log(`  stickers:      ${first.asset_accessories.length}`);
				for (const acc of first.asset_accessories) {
					console.log(`    classid=${acc.classid} wear=${acc.sticker_wear ?? 'n/a'}`);
				}
			}

			console.log('\n── All items ────────────────────────────────────────────');
			for (const item of inventory) {
				const name = (item.market_hash_name ?? item.name ?? '(unknown)').padEnd(60);
				const float = item.asset_properties.float_value?.toFixed(10) ?? '          ';
				console.log(`  [${item.assetid}] ${name}  float: ${float}`);
			}
		}
	} catch (err: unknown) {
		const e = err as Error;
		console.error(`\nError: ${e.message}`);
		process.exit(1);
	}
}

main();
