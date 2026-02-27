/**
 * Log in, then interactively view, edit, or delete a group announcement.
 *
 * Usage: npx tsx examples/edit-group-announcement.ts
 */

import * as readline from 'readline';
import SteamCommunity from '../src/index';
import type { CSteamGroup } from '../src/index';
import type { GroupAnnouncement } from '../src/index';

const community = new SteamCommunity();

// ── Prompt helper ─────────────────────────────────────────────────────────────

function createRl(): readline.Interface {
	return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => rl.question(question, resolve));
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(rl: readline.Interface): Promise<void> {
	const accountName = await ask(rl, 'Username: ');
	const password    = await ask(rl, 'Password: ');
	await attemptLogin(rl, accountName, password);
}

async function attemptLogin(
	rl: readline.Interface,
	accountName: string,
	password: string,
	authCode?: string,
	twoFactorCode?: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		community.login({ accountName, password, authCode, twoFactorCode }, async (err) => {
			if (err?.message === 'SteamGuardMobile') {
				const code = await ask(rl, 'Steam Authenticator Code: ');
				await attemptLogin(rl, accountName, password, undefined, code);
				resolve();
				return;
			}

			if (err?.message === 'SteamGuard') {
				const domain = (err as NodeJS.ErrnoException & { emaildomain?: string }).emaildomain;
				console.log(`An email has been sent to your address at ${domain}`);
				const code = await ask(rl, 'Steam Guard Code: ');
				await attemptLogin(rl, accountName, password, code);
				resolve();
				return;
			}

			if (err) { reject(err); return; }
			console.log('\nLogged in!\n');
			resolve();
		});
	});
}

// ── Group announcements ───────────────────────────────────────────────────────

async function manageAnnouncements(rl: readline.Interface): Promise<void> {
	const gid = await ask(rl, 'Group ID or URL: ');

	const group = await new Promise<CSteamGroup>((resolve, reject) => {
		community.getSteamGroup(gid, (err, g) => (err ? reject(err) : resolve(g)));
	});

	const announcements = await new Promise<GroupAnnouncement[]>((resolve, reject) => {
		group.getAllAnnouncements((err, list) => (err ? reject(err) : resolve(list)));
	});

	if (announcements.length === 0) {
		console.log('This group has no announcements.');
		return;
	}

	// Print them oldest → newest
	for (let i = announcements.length - 1; i >= 0; i--) {
		const a = announcements[i]!;
		console.log(`[${a.date.toISOString()}] aid=${a.aid}  author=${a.author ?? '?'}  "${a.headline}"`);
	}

	const choice = (await ask(rl, '\nEdit or delete an announcement? (edit/delete/skip): ')).trim().toLowerCase();
	if (choice !== 'edit' && choice !== 'delete') {
		console.log('Skipped.');
		return;
	}

	const aid = (await ask(rl, 'Announcement ID: ')).trim();

	if (choice === 'edit') {
		const newHeadline = await ask(rl, 'New title: ');
		const newBody     = await ask(rl, 'New body: ');
		await new Promise<void>((resolve, reject) => {
			group.editAnnouncement(aid, newHeadline, newBody, (err) =>
				err ? reject(err) : resolve(),
			);
		});
		console.log('Announcement edited!');
	} else {
		await new Promise<void>((resolve, reject) => {
			group.deleteAnnouncement(aid, (err) => (err ? reject(err) : resolve()));
		});
		console.log('Announcement deleted!');
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const rl = createRl();
	try {
		await login(rl);
		await manageAnnouncements(rl);
	} finally {
		rl.close();
	}
}

main()
	.then(() => process.exit(0))
	.catch((err: Error) => {
		console.error(err.message);
		process.exit(1);
	});
