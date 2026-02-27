/**
 * Enable Steam Guard Mobile Authenticator (2FA) on the logged-in account.
 * Saves the secrets to twofactor_<steamid>.json in the current directory.
 *
 * Usage: npx tsx examples/enable_twofactor.ts
 */

import * as readline from 'readline';
import * as fs from 'fs';
import SteamCommunity from '../src/index';
import { EResult } from '../src/index';

const community = new SteamCommunity();

// ── Prompt helper ─────────────────────────────────────────────────────────────

let abortPromptFn: (() => void) | null = null;

function promptAsync(question: string, sensitiveInput = false): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: sensitiveInput ? undefined : process.stdout,
			terminal: true,
		});

		abortPromptFn = () => { rl.close(); resolve(''); };

		if (sensitiveInput) process.stdout.write(question);

		rl.question(question, (result) => {
			if (sensitiveInput) process.stdout.write('\n');
			abortPromptFn = null;
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

async function attemptLogin(accountName: string, password: string, authCode?: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		community.login({ accountName, password, authCode, disableMobile: false }, async (err) => {
			if (err?.message === 'SteamGuard') {
				const code = await promptAsync(`Steam Guard email code (sent to *${(err as NodeJS.ErrnoException & { emaildomain?: string }).emaildomain}): `);
				await attemptLogin(accountName, password, code);
				resolve();
				return;
			}

			if (err) { reject(err); return; }
			resolve();
		});
	});

	await doSetup();
}

// ── 2FA setup ─────────────────────────────────────────────────────────────────

async function doSetup(): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		community.enableTwoFactor((err, response) => {
			if (err) {
				if (err.eresult === EResult.Fail) {
					console.error('Failed — do you have a phone number attached to your account?');
				} else if (err.eresult === EResult.RateLimitExceeded) {
					console.error('Rate limit exceeded. Try again later.');
				} else {
					console.error(err);
				}
				process.exit(1);
				return;
			}

			const r = response!;

			if (r['status'] !== EResult.OK) {
				console.error(`Unexpected status: ${r['status']}`);
				process.exit(1);
				return;
			}

			const filename = `twofactor_${community.steamID!.getSteamID64()}.json`;
			fs.writeFileSync(filename, JSON.stringify(r, null, '\t'));
			console.log(`\nSecrets written to ${filename}`);
			console.log(`Revocation code: ${r['revocation_code']}`);

			promptActivationCode(r).then(resolve).catch(reject);
		});
	});
}

async function promptActivationCode(response: Record<string, unknown>): Promise<void> {
	if (response['phone_number_hint']) {
		console.log(`\nAn activation code was sent to your phone ending in ${response['phone_number_hint']}.`);
	} else if (response['confirm_type'] === 3) {
		console.log('\nAn activation code was sent to your email.');
	}

	const smsCode = await promptAsync('Activation Code: ');

	await new Promise<void>((resolve, reject) => {
		community.finalizeTwoFactor(response['shared_secret'] as string, smsCode, (err) => {
			if (err) {
				if (err.message === 'Invalid activation code') {
					console.log('Invalid code, try again.');
					promptActivationCode(response).then(resolve).catch(reject);
					return;
				}
				reject(err);
				return;
			}
			console.log('\nTwo-factor authentication enabled!');
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
