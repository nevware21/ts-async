# v0.5.3 Oct 27th, 2024

## Changelog

- [#237](https://github.com/nevware21/ts-async/issues/237) [BUG] Sourcemap load errors in debugger from @nevware21 dependencies
  - Also Bumps ts-utils to 0.11.5
- [#218](https://github.com/nevware21/ts-async/pull/218) Bump @nevware21/grunt-ts-plugin from 0.4.5 to 0.4.6
- [#219](https://github.com/nevware21/ts-async/pull/219) Bump @nevware21/grunt-eslint-ts from 0.2.4 to 0.2.5
- [#220](https://github.com/nevware21/ts-async/pull/220) Bump @nevware/grunt-ts-plugin and grunt-es-plugin to 0.5.0
- [#229](https://github.com/nevware21/ts-async/pull/229) chore: Update codecov uploading
- [#230](https://github.com/nevware21/ts-async/pull/230) chore: Update to auto generate docs and remove typedoc from repo
- [#228](https://github.com/nevware21/ts-async/pull/228) chore: Update to ts-utils 0.11.4
- [#231](https://github.com/nevware21/ts-async/pull/231) Exclude typedoc folder
- [#232](https://github.com/nevware21/ts-async/pull/232) update @nevware21/grunt plugins from 0.5.0 to ^0.5.1
- [#233](https://github.com/nevware21/ts-async/pull/233) Update doAwait docs
- [#234](https://github.com/nevware21/ts-async/pull/234) Typeedoc: Fixup name issue
- [#235](https://github.com/nevware21/ts-async/pull/235) Bump puppeteer from 21.6.0 to 23.4.0
- [#236](https://github.com/nevware21/ts-async/pull/236) Bump @types/chai from 4.3.20 to 5.0.0

# v0.5.2 June 27th, 2024

## Changelog

- #173 Bump @microsoft/rush from 5.120.4 to 5.121.0
- #174 Bump @microsoft/rush from 5.121.0 to 5.122.0
- #183 Bump @microsoft/rush from 5.122.0 to 5.124.6
- #210 Update Copyright message to comply with LLC operating agreement
- #195 Bump nyc from 15.1.0 to 17.0.0
- #212 Bump @nevware21/ts-utils from 0.11.2 to 0.11.3
- #213 Bump typedoc from 0.25.13 to 0.26.2
- #214 Bump @microsoft/rush from 5.124.6 to 5.129.6

# v0.5.1 Apr 16th, 2024

## Changelog

- #165 Generate single unified es module for exports
  - Minification hints and optimizations for webpack using ts-utils 0.11.2
- #162 Bump @microsoft/rush from 5.118.7 to 5.120.0
- #164 Bump @microsoft/rush from 5.120.0 to 5.120.2
- #167 Bump @microsoft/rush from 5.120.2 to 5.120.4

# v0.5.0 Mar 29th, 2024

## Changelog

- #115 [Feature] Add size tests
- #116 [Bug] createAllPromise signature is different from native Promise.all
- #117 [Feature] Add Asynchronous helper functions
- #132 [Bug] Package sizes are too large
- #148 [Feature] Add Race and Any Promise support
- #149 Update rush.json to 5.118.1
- #119 Update generation for better Tree-Shaking

# v0.4.0 Dec 13th, 2023

## Changelog

- #108 [Bug] doAwaitResponse should return / handle any additional value returned by the callback function

# v0.3.0 Aug 17th, 2023

## Changelog

- #79 [Bug] remove typescript should not be a peer dependency
- #82 Bump @nevware21/ts-utils to minimum of 0.10.0
- #81 Bump @microsoft/rush to 5.102.0
- #74 Bump @typescript-eslint/eslint-plugin from 5.62.0 to 6.1.0

# v0.2.6 June 12th, 2023

## Changelog

- #65 [Bug] Dependency @nevware21/tools-pre-proc@0.1.0 cannot be resolved

# v0.2.5 June 11th, 2023

## Changelog

- #54 Add Pre-Processor to remove _debugLog from modules
  - This removes the debug / test code from the final generated packages (resulting in smaller production bundles)
- #57 Bump @rollup/plugin-commonjs from 24.1.0 to 25.0.0 in /lib
- #60 Bump @nevware21/ts-utils min version from 0.9.5 to 0.9.7
- #61 Bump @microsoft/rush from 5.98.0 to 5.99.0
- #62 Create SECURITY.md
- #63 Add Issue Templates

# v0.2.4 Apr 25th, 2023

## Changelog

- #50 [Bug] SCRIPT5009: 'Promise' is undefined
- #52 Update ts-utils to 0.9.5

# v0.2.3 Apr 24th, 2023

## Changelog

- #47 Add alias for Promise to avoid matching "new Promise"
- #46 Bump typedoc to ^0.24.4
- #45 Update release packaging and publishing steps
- #44 Bump @microsoft/rush from 5.97.0 to 5.97.1
- #39 Bump @microsoft/rush from 5.95.0 to 5.97.0

# v0.2.2 Mar 25th, 2023

## Changelog

- #36 [Packaging] The single module file is causing some packagere issues
  - Update ts-utils version to 0.9.3
  - Update rush to 5.95.0

# v0.2.1 Mar 2nd, 2023

## Changelog

- #27 [Bug] v0.2.0 of the scheduler is throwing an error when a waited task rejects
- #28 Update to ts-utils@0.8.1

# v0.2.0 Feb 26th, 2023

## Changelog

- #23 [Feature] Migrate Promise based Task Scheduler
  - Migrated the task scheduler from internal usage to public
  - Uses promises to sequence tasks

# v0.1.2 Feb 17th, 2023

## Changelog

- #18 [Bug] Version 0.1.1 does not support resolving a promise with a promise properly.
- #20 Update Packaging to create single rollup packages

# v0.1.1 Feb 5th, 2023

## Changelog

- #12 Update prep_release target to copy README.md to npm pack
- #13 Add root coverage config
- #14 Update npm pack to also copy LICENSE file
- #15 chore: Fix worker coverage reporting.

# v0.1.0 Jan 21st, 2023

## Changelog

- #1 Initial Implementation includes
