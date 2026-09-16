## 1. Constants and formatting

- [x] 1.1 Add the `MCP_CONTEXT_PROFILE_NAME` constant and a `formatContextProfile(profile)` helper beside `formatLanguageContext` in `src/core/init.ts`, and verify a unit test asserts the exact emitted line for a sample profile
- [x] 1.2 Add a `formatContextProfilePrefix()` helper used for lookup, and verify a unit test shows the formatted line starts with the prefix so the two cannot drift apart

## 2. Option validation

- [x] 2.1 Register `--context-profile <name>` on `openspec init` in `src/cli/index.ts` and pass it into `InitCommand`, and verify `openspec init --help` lists the flag
- [x] 2.2 Add the option to `InitCommandOptions` and normalize it in the `InitCommand` constructor the way `normalizeLanguage` does, and verify unit tests reject empty, multiline, control-character, and oversized values before any file is created

## 3. Context editing

- [x] 3.1 Implement a context-editing helper that appends the profile line to a `context` string, replacing any line matching the prefix and leaving the context unchanged when the line is already last, and verify unit tests cover append, replace, and no-op
- [x] 3.2 Implement the `config.yaml` update using the `yaml` package's `parseDocument`/`toString` round-trip so only the `context` node is rewritten, and verify a test that a config with comments, `rules`, and `operations` keeps all of them after an update
- [x] 3.3 Preserve the file's dominant line ending when rewriting, and verify a test that a CRLF config stays CRLF

## 4. Wiring into init

- [x] 4.1 Add an applicability pre-flight beside the `assertLanguageCanBeApplied` call in `execute()` that fails on an unreadable, unparseable, or unwritable config before the first write, and verify a test that a failing run leaves the project untouched
- [x] 4.2 Extend `createConfig` to write the profile into a newly created config and to update an existing one, adding an `updated` outcome to its return type, and verify tests for both the fresh-init and extend-mode paths
- [x] 4.3 Report the `updated` outcome in `displaySuccessMessage` so the output distinguishes it from `(exists)`, and verify a test asserting the output text

## 5. Behavior coverage

- [x] 5.1 Add `test/core/init.test.ts` coverage for every scenario in the `cli-init` delta: fresh project, existing context, config without context, re-run with the same profile, replacing a different profile, and combination with `--language` on a fresh config
- [x] 5.2 Add an end-to-end check in `test/cli-e2e/basic.test.ts` that `openspec init --tools none --context-profile <name>` writes the line into `openspec/config.yaml`, and verify it passes against the built CLI
- [x] 5.3 Build paths in all new tests with `path.join`, and verify the suite passes on the Windows CI matrix job

## 6. Documentation and release

- [x] 6.1 Add the flag to `docs/cli.md` alongside `--language`, and verify the documented behavior matches the delta spec
- [x] 6.2 Run `pnpm changeset` and commit the generated file, and verify `pnpm exec changeset status --since=origin/main` reports the change
- [x] 6.3 Run `pnpm build && pnpm test && pnpm exec tsc --noEmit && pnpm lint` and verify all four pass, matching what CI runs
