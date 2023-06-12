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
