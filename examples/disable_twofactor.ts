/**
 * Disable Steam Guard Mobile Authenticator (2FA) on the logged-in account.
 * You will need the revocation code from when you enabled 2FA.
 *
 * Usage: npx tsx examples/disable_twofactor.ts
 */

import * as readline from 'readline';
import SteamTotp from 'steam-totp';
import SteamCommunity from '../src/index';

const community = new SteamCommunity();

// ── Prompt helper ─────────────────────────────────────────────────────────────

function promptAsync(question: string, sensitiveInput = false): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: sensitiveInput ? undefined : process.stdout,
			terminal: true,
		});

		if (sensitiveInput) process.stdout.write(question);

		rl.question(question, (result) => {
			if (sensitiveInput) process.stdout.write('\n');
			rl.close();
			resolve(result);
		});
	});
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const accountName = await promptAsync('Username: ');
	const password    = await promptAsync('Password (hidden): ', true);
	await attemptLogin(accountName, password);
}

async function attemptLogin(accountName: string, password: string, twoFactorCode?: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		community.login({ accountName, password, twoFactorCode, disableMobile: false }, async (err) => {
			if (err?.message === 'SteamGuardMobile') {
				let code = await promptAsync('Steam Guard App Code or Shared Secret: ');
				// If a shared secret was provided, derive the code from it
				if (code.length > 5) {
					code = SteamTotp.generateAuthCode(code);
				}
				await attemptLogin(accountName, password, code);
				resolve();
				return;
			}

			if (err) { reject(err); return; }
			resolve();
		});
	});

	await doRevoke();
}

// ── Revoke ────────────────────────────────────────────────────────────────────

async function doRevoke(): Promise<void> {
	const code = await promptAsync('Revocation Code (without the leading R): R');

	await new Promise<void>((resolve, reject) => {
		community.disableTwoFactor('R' + code, (err) => {
			if (err) { reject(err); return; }
			console.log('\nTwo-factor authentication disabled!');
			resolve();
		});
	});
}

main()
	.then(() => process.exit(0))
	.catch((err: Error) => {
		console.error(err.message);
		process.exit(1);
	});
