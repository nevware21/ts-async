# Copilot Instructions for `@nevware21/ts-async`

## Project Overview

`@nevware21/ts-async` is a TypeScript library that provides support for asynchronous development with:
- A Promise-based task scheduler (`createTaskScheduler`)
- Multiple Promise implementations: synchronous (`createSyncPromise`), idle (`createIdlePromise`), asynchronous (`createAsyncPromise`), and native runtime wrappers (`createNativePromise`)
- Await helpers (`doAwait`, `doFinally`, `doAwaitResponse`)
- Alias functions for switching between Promise implementations without changing code

The primary goal is to support creation of code that can be better minified, resulting in smaller runtime payloads for improved page load performance.

## Repository Structure

```
/                        - Root directory
├── .github/             - GitHub configuration (workflows, issue templates, copilot instructions)
├── common/              - Rush common scripts
├── lib/                 - Main source code and tests
│   ├── src/             - TypeScript source files
│   ├── test/            - Test files
│   └── package.json     - Library package manifest (published to npm)
├── package.json         - Root package manifest (devDependencies, scripts)
├── README.md            - Project documentation (includes recommended version)
├── CHANGELIST.md        - Release history and changelog
├── rush.json            - Rush monorepo configuration
└── publish-groups.json  - npm publish configuration
```

Only `lib/package.json` is published to npm. The root `package.json` is for the monorepo tooling.

## Build, Lint, and Test

```bash
npm run lint     # Run ESLint via grunt
npm run build    # Build via Rush
npm test         # Run tests via Rush
```

Full rebuild (clean build + tests + size checks):
```bash
npm run rebuild
```

## Release Process

All releases **must** follow this process precisely:

### 1. Commit Message Format

Release commits must use the format:
```
[Release] Increase version to x.y.z
```

### 2. Files to Update

When creating a release for version `x.y.z`:

#### `package.json` (root)
Update the `"version"` field:
```json
"version": "x.y.z"
```

#### `lib/package.json`
Update the `"version"` field to match:
```json
"version": "x.y.z"
```

#### `README.md`
Update the recommended version range in the Quickstart section:
```json
"@nevware21/ts-async": ">= x.y.z < 2.x"
```

#### `CHANGELIST.md`
- Leave the `# Unreleased` section in place and keep it empty except for the `## Changelog` heading
- Move all current unreleased entries under a new versioned release section immediately below `# Unreleased`
- Preserve all unreleased changes as-is — do not remove or reduce them
- Add a full changelog comparison link at the end of the new version section
- The format for a new release section is:

```markdown
# Unreleased

## Changelog

# v{new-version} {Month} {Day}, {Year}

## Changelog

- {unreleased changes preserved exactly as written}

For full details see [v{prev-version}...v{new-version}](https://github.com/nevware21/ts-async/compare/v{prev-version}...v{new-version})

# v{prev-version} ...
```

**Important CHANGELIST.md rules:**
- Only include significant changes (features, bugs, important dependency updates)
- If there are listed unreleased items, include them exactly as-is — do not summarize or reduce them
- Always add a `For full details see [v{prev}...v{new}](...)` comparison link using the GitHub compare URL
- Leave the `# Unreleased` section empty (with `## Changelog`) above the new version section for future changes

### Example CHANGELIST.md After a Release

Before (unreleased changes present):
```markdown
# Unreleased

## Changelog

- [#123](https://github.com/nevware21/ts-async/issues/123) [Feature] Some new feature
- [#124](https://github.com/nevware21/ts-async/issues/124) [Bug] Fixed something

# v0.5.5 Jan 5th, 2026
...
```

After releasing as `v0.5.6`:
```markdown
# Unreleased

## Changelog

# v0.5.6 May 11th, 2026

## Changelog

- [#123](https://github.com/nevware21/ts-async/issues/123) [Feature] Some new feature
- [#124](https://github.com/nevware21/ts-async/issues/124) [Bug] Fixed something

For full details see [v0.5.5...v0.5.6](https://github.com/nevware21/ts-async/compare/v0.5.5...v0.5.6)

# v0.5.5 Jan 5th, 2026
...
```

## Coding Conventions

- TypeScript with ES5 compatibility target for v0.x and v1.x
- Functions designed for minification (short, tree-shakeable exports)
- Tests run in Node.js (18, 20, 22, 24), browser (Chromium headless), and Web Worker (Chromium headless)
- Use `@nevware21/ts-utils` as the primary utility dependency

## Dependencies

- **Runtime dependency**: `@nevware21/ts-utils` (>= 0.12.6 < 2.x)
- **Package manager**: Rush (for monorepo management) + npm
- **Build**: TypeScript + Rollup + Grunt
- **Testing**: Mocha + Karma + nyc coverage
