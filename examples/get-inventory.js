/**
 * Script to call getUserInventoryContents and print inventory (e.g. CS:GO).
 * Usage: node scripts/get-inventory.js [steamID]
 *        STEAM_ID=76561198... node scripts/get-inventory.js
 * If steamID is omitted, reads from STEAM_ID env var or prompts.
 */

const SteamCommunity = require('../index.js');
const Readline = require('readline');

const CSGO_APP_ID = 730;
const CSGO_CONTEXT_ID = 2;

const community = new SteamCommunity();

function prompt(question) {
	return new Promise((resolve) => {
		const rl = Readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(question, (answer) => {
			rl.close();
			resolve((answer || '').trim());
		});
	});
}

function getInventory(steamID, callback) {
	community.getUserInventoryContents(
		steamID,
		CSGO_APP_ID,
		CSGO_CONTEXT_ID,
		false,  // tradableOnly
		'english',
		callback
	);
}

function main() {
	let steamID = process.argv[2] || process.env.STEAM_ID;

	(async () => {
		if (!steamID) {
			steamID = await prompt('Steam ID (profile URL or SteamID64): ');
		}
		if (!steamID) {
			console.error('No Steam ID provided.');
			process.exit(1);
		}

		// Allow pasting full profile URL
		const match = steamID.match(/steamcommunity\.com\/profiles\/(\d+)/);
		if (match) {
			steamID = match[1];
		}

		console.log('Fetching inventory for', steamID, '...\n');

		getInventory(steamID, (err, inventory, currency, totalCount) => {
			if (err) {
				console.error('Error:', err.message);
				process.exit(1);
			}

			console.log('Total count (API):', totalCount);
			console.log('Items (this page):', inventory.length);
			console.log('Currency items:', currency.length);
			console.log(inventory[0]);
			process.exit(0);
		});
	})();
}

main();
