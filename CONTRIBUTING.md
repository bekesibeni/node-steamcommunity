# Contributing

Thanks for your interest in contributing to this TypeScript fork of node-steamcommunity!

## Issues

- **Bug report** — include a descriptive title, what you expected vs. what happened, a minimal code snippet, and the full error message + stack trace.
- **Feature request** — describe what you want and why it fits the scope of this library.
- **Question / support** — open a Discussion, not an Issue.

## Pull Requests

### Code style

- TypeScript with strict mode — no `any` unless unavoidable
- Tabs for indentation
- camelCase for variables and functions
- Opening braces on the same line
- All new public methods must be declared in the relevant `declare module` augmentation block

### Adding a method

1. Add the implementation to the relevant `src/components/*.ts` or `src/classes/*.ts` file
2. Declare the method signature in the same file's `declare module '../SteamCommunity'` block
3. Export any new public types from `src/index.ts`
4. Add a runnable example in `examples/` if the method is testable without login

### Things to keep in mind

- Do not increment the version in `package.json` — that is handled at release time
- Run `pnpm build` before submitting to make sure the TypeScript compiles cleanly
- The `dist/` directory is committed — rebuild it (`pnpm build`) if your change affects the output
- Do not add `pnpm-lock.yaml` — this is a library, consumers manage their own lockfiles
- Avoid breaking changes to existing public method signatures

## Architecture notes

The codebase uses TypeScript **module augmentation** to keep the modular file structure of the original JavaScript:

```text
src/SteamCommunity.ts        ← base class (constructor, cookie management)
src/components/http.ts       ← attaches httpRequest / httpRequestGet / httpRequestPost
src/components/users.ts      ← attaches addFriend, getUserInventoryContents, etc.
...
```

Each component file does:

```ts
declare module '../SteamCommunity' {
    interface SteamCommunity {
        myNewMethod(...): void;
    }
}

SteamCommunity.prototype.myNewMethod = function(this: SteamCommunity, ...) {
    // implementation
};
```

**Important:** Use `declare fieldName: Type` (not `fieldName!: Type`) for any prototype method stubs in the base class. The `!:` syntax creates an ES2024 class field initialised to `undefined` which shadows the prototype method.

## Running examples

```bash
pnpm run example:inventory     # CS2 inventory (no login)
pnpm run example:market-apps   # Steam Market app list (no login)
pnpm run example:comments      # Profile comments (no login)
pnpm run example:user          # Steam user profile (no login)
pnpm run example:group-info    # Group info + RSS (no login)
pnpm run example:confirmations # Confirmations (requires login)
pnpm run example:enable-2fa    # Enable 2FA (requires login)
pnpm run example:disable-2fa   # Disable 2FA (requires login)
```
