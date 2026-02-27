# node-steamcommunity (TypeScript fork)

[![license](https://img.shields.io/npm/l/steamcommunity.svg)](https://github.com/bekesibeni/node-steamcommunity/blob/master/LICENSE)

> **This is a TypeScript rewrite of [DoctorMcKay/node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity).**
> All source is now in `src/` with full strict TypeScript, modern dependencies, and a clean public API.

---

## Installation

Install directly from GitHub:

```bash
npm install github:bekesibeni/node-steamcommunity
# or
pnpm add github:bekesibeni/node-steamcommunity
```

## Quick start

```ts
import SteamCommunity from 'steamcommunity';

const community = new SteamCommunity();

// Log in
community.login({ accountName: 'user', password: 'pass' }, (err, sessionID, cookies) => {
    if (err) throw err;
    console.log('Logged in!', sessionID);
});

// Fetch a CS2 inventory (no login required for public profiles)
community.getUserInventoryContents('76561198XXXXXXXXX', 730, 2, false, 'english', (err, items, currency, total) => {
    if (err) throw err;
    console.log(`${total} items`);
    for (const item of items) {
        console.log(item.market_hash_name, item.asset_properties.float_value);
    }
});
```

## What changed from the original

### TypeScript rewrite

- Full source in `src/` — strict TypeScript, ES2024 target, NodeNext modules
- All enums (`EResult`, `EConfirmationType`, etc.) are proper TypeScript numeric enums with built-in bidirectional mapping
- `dist/` is pre-built and committed so the library works with `npm install github:...` installs

### Dependency replacements

| Old | New | Reason |
| --- | --- | --- |
| `cheerio` (~987 KB, 11 deps) | `node-html-parser` (~165 KB, 2 deps) | 6× smaller, 6× faster, standard DOM API |
| `xml2js` (~3.4 MB, 2 deps) | `fast-xml-parser` (~607 KB, 2 deps) | Proper XML parsing, CDATA handled correctly |

### Removed (broken or defunct)

The following have been removed entirely because they no longer work with Steam's current API:

| Method | Reason |
| --- | --- |
| `chatLogon()`, `chatMessage()`, `chatLogoff()` | Steam killed the old web chat API years ago. Use [steam-user](https://github.com/DoctorMcKay/node-steam-user) instead. |
| `oAuthLogin()` | OAuth tokens are no longer issued by Steam. |
| `getWebApiOauthToken()` | Same as above. |

### Fixes over the original

- `getSteamUser()` now accepts a 17-digit SteamID64 string directly (the original only accepted vanity URLs as strings or explicit `SteamID` objects)
- `getUserComments()` correctly resolves author SteamIDs for users with vanity URLs via `data-miniprofile` (the original also did this; the initial port regressed it — now fixed)
- `getUserInventory()` error handling matches the original exactly

### New in v4 (asset properties)

`getUserInventoryContents()` returns `CEconItem` objects with two new fields parsed from Steam's `asset_properties` data:

```ts
item.asset_properties  // { paint_seed?, float_value?, nametag?, finish_catalog?, ... }
item.asset_accessories // Array<{ classid, sticker_wear? }>
```

## Running examples

```bash
# CS2 inventory (no login)
STEAM_ID=76561198XXXXXXXXX pnpm run example:inventory

# Steam Market app list (no login)
pnpm run example:market-apps

# Profile comments (no login for public profiles)
STEAM_ID=76561198XXXXXXXXX pnpm run example:comments

# Steam user profile (no login)
pnpm run example:user

# Group info + member list + announcements (no login)
pnpm run example:group-info

# Accept all confirmations (requires login + identity secret)
pnpm run example:confirmations

# Enable 2FA (requires login)
pnpm run example:enable-2fa

# Disable 2FA (requires login + revocation code)
pnpm run example:disable-2fa
```

## Building from source

```bash
pnpm install
pnpm build        # compiles src/ → dist/
pnpm build:watch  # watch mode
```

## Original library

For the original JavaScript version and documentation, see:
**[DoctorMcKay/node-steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity)**

The original wiki documentation applies for all methods that haven't changed.

## License

MIT — see [LICENSE](LICENSE)
