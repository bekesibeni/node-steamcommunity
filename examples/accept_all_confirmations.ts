/**
 * Log in via steam-session (MobileApp platform) then accept all pending
 * confirmations using an identity secret.
 *
 * Usage: npx tsx examples/accept_all_confirmations.ts
 */

import * as readline from 'readline';
import {
	LoginSession,
	EAuthTokenPlatformType,
	EAuthSessionGuardType,
} from 'steam-session';
import SteamTotp from 'steam-totp';

import SteamCommunity from '../src/index';
import { EConfirmationType } from '../src/index';
import type { CConfirmation } from '../src/index';

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

function abortPrompt(): void {
	if (!abortPromptFn) return;
	abortPromptFn();
	process.stdout.write('\n');
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const accountName = await promptAsync('Username: ');
	const password    = await promptAsync('Password (hidden): ', true);

	const session = new LoginSession(EAuthTokenPlatformType.MobileApp);

	session.on('authenticated', async () => {
		abortPrompt();
		const cookies = await session.getWebCookies();
		community.setCookies(cookies);
		await doConfirmations();
	});

	session.on('timeout', () => {
		abortPrompt();
		console.log('Login attempt timed out.');
		process.exit(1);
	});

	session.on('error', (err: Error) => {
		abortPrompt();
		console.error(`Login error: ${err.message}`);
		process.exit(1);
	});

	const startResult = await session.startWithCredentials({ accountName, password });

	if (startResult.actionRequired) {
		const codeTypes = [EAuthSessionGuardType.EmailCode, EAuthSessionGuardType.DeviceCode];
		const codeAction = startResult.validActions?.find(
			(a: { type: number; detail?: string }) => codeTypes.includes(a.type),
		);

		if (codeAction) {
			if (codeAction.type === EAuthSessionGuardType.EmailCode) {
				console.log(`A code was sent to your email at ${codeAction.detail}.`);
			} else {
				console.log('Enter your Steam Guard Mobile Authenticator code.');
			}

			let code = await promptAsync('Code or Shared Secret: ');
			if (!code) return; // user aborted

			// If it looks like a shared secret (base64, longer than a code) generate the code
			if (code.length > 10) {
				code = SteamTotp.generateAuthCode(code);
			}

			await session.submitSteamGuardCode(code);
		}
	}
}

// ── Confirmations ─────────────────────────────────────────────────────────────

async function doConfirmations(): Promise<void> {
	const identitySecret = await promptAsync('Identity Secret: ');

	const time    = SteamTotp.time();
	const listKey = SteamTotp.getConfirmationKey(identitySecret, time, 'conf');

	const confs = await new Promise<CConfirmation[]>((resolve, reject) => {
		community.getConfirmations(time, listKey, (err, confs) => {
			err ? reject(err) : resolve(confs);
		});
	});

	console.log(`\nFound ${confs.length} outstanding confirmation${confs.length === 1 ? '' : 's'}.\n`);

	let previousTime = 0;

	for (const conf of confs) {
		const typeName = EConfirmationType[conf.type] ?? `Type${conf.type}`;
		process.stdout.write(`Accepting ${typeName} — ${conf.title} ... `);

		try {
			await new Promise<void>((resolve, reject) => {
				let t = SteamTotp.time();
				if (t === previousTime) t++;
				previousTime = t;

				const key = SteamTotp.getConfirmationKey(identitySecret, t, 'allow');
				conf.respond(t, key, true, (err) => (err ? reject(err) : resolve()));
			});
			console.log('OK');
		} catch (ex: unknown) {
			console.log(`FAILED — ${(ex as Error).message}`);
		}

		// Small pause so we don't exhaust the current timestamp
		await new Promise((r) => setTimeout(r, 500));
	}

	console.log('\nDone.');
	process.exit(0);
}

main().catch((err: Error) => {
	console.error(err.message);
	process.exit(1);
});
