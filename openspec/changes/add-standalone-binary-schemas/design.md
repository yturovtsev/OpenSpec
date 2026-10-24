## Context

See proposal.md for the motivation. The current mechanism:

- `getPackageSchemasDir()` in `src/core/artifact-graph/resolver.ts` returns `<dir of resolver.js>/../../../schemas`, computed from `import.meta.url`. In an npm install that is `<package>/schemas`, which ships in the tarball through `"files"` in `package.json`.
- Every built-in lookup goes through that one function: `getSchemaDir` (tier 3), `listSchemas`, `listSchemasWithInfo`, `checkAllLocations` in `src/commands/schema.ts` (`schema which`, which labels the location `package`), and the `spec-driven` task-numbering check in `src/core/validation/validator.ts:498`.
- In a packaged executable, `import.meta.url` points into the packager's virtual filesystem, or into a meaningless real path. Examples: Bun gives `/$bunfs/root/…`, which resolves to `/schemas`; a CommonJS bundle for Node SEA leaves `import.meta.url` undefined unless the bundler shims it, and then `fileURLToPath` throws.
- The fork is maintained as a rebased patch stack. Every edited upstream line is a potential conflict on sync, so fork logic goes into new files behind a small call site (see `FORK-RUNBOOK.md`, "Правила").

## Goals / Non-Goals

**Goals:**
- A standalone executable finds built-in schemas in `schemas/` next to itself, on Linux, macOS and Windows, with no launcher cooperation and no configuration.
- Zero behavior change for npm, pnpm and source-checkout installs, including no extra directory being consulted.
- Work with whatever packager is chosen later (Node SEA, Bun `--compile`, `pkg`, …) without code specific to any one of them.

**Non-Goals:**
- Making `import.meta.url` or `package.json` available inside the executable. Other modules (`src/core/init.ts:95`, `src/cli/index.ts:97`, `src/core/update.ts:81`, …) still call `createRequire(import.meta.url)`, so the packaging step has to provide a usable `import.meta.url` anyway. This change only ensures schemas do not depend on it.
- A second built-in tier that merges both locations.

## Decisions

### 1. Fall back only when the packaged location is missing

`getPackageSchemasDir()` returns the packaged location when that directory exists. Otherwise it returns `<dir of the real executable>/schemas`, provided that directory exists. If neither exists, it returns the packaged location as before, so every downstream "not found" path and message stays the same.

The condition is a plain existence check, not a "standalone" check.

*Alternatives considered:*
- **Sniff the packager** (`require('node:sea').isSea()`, `process.pkg`, `typeof Bun`, `Bun.main` prefix). Rejected: this needs one branch per packager, breaks on the next packager, and the project rules say not to invent detection mechanisms. An existence check covers every packager whose virtual path does not exist on disk.
- **Executable location first.** Rejected: in an npm install `process.execPath` is the Node.js binary, so this would read `/usr/local/bin/schemas`, `~/.nvm/versions/node/<v>/bin/schemas` or `C:\Program Files\nodejs\schemas` ahead of the real package. That is a behavior change upstream, and it lets a directory planted next to `node` shadow built-in schemas.
- **Launcher-set environment variable** (for example `OPENSPEC_BUILTIN_SCHEMAS_DIR`, exported by `bin/openspec` and `openspec.cmd`). Rejected for now: running `app/openspec.exe` directly bypasses the launcher, as IDE integrations and agents spawning the binary by absolute path do. It would also add a public configuration surface. It can be added later on top of this change without conflicting with it.

### 2. "Next to the executable" means the canonical executable path

The base is `path.dirname(FileSystemUtils.canonicalizeExistingPath(process.execPath))`, joined with `'schemas'` through `path.join`. No string manipulation and no hardcoded separators.

Canonicalizing makes the behavior independent of how the OS reports `execPath` for a symlinked launcher. Linux reads `/proc/self/exe`, which is already resolved. macOS uses `_NSGetExecutablePath` plus realpath in libuv. Windows uses `GetModuleFileNameW`, and `realpathSync.native` also expands 8.3 short names. A Windows `.cmd` launcher is a separate `cmd.exe` process that starts `app\openspec.exe` by path, so `execPath` is already the payload. Canonicalizing is a no-op there and harmless.

### 3. A failure to compute the packaged location counts as "missing"

`fileURLToPath(import.meta.url)` is wrapped so that a throw (undefined or non-`file:` URL in a CommonJS bundle) makes the packaged location count as absent instead of crashing schema resolution. If the location next to the executable is missing too, the function returns that location (it always has a value, unlike the packaged one), and callers take their usual "not found" paths. This is cheap protection; it does not replace the packaging work described in Non-Goals.

### 4. Same `package` source label, no new tier

Schemas next to the executable are the built-in schemas of that install, so they keep `source: 'package'` in `listSchemasWithInfo`, `openspec schemas` and `schema which`. The `SchemaSource` union, the JSON payloads and `docs/agent-contract.md` do not change. Shadowing works unchanged because `schema which` compares the three locations it already knows.

The existing trust checks apply as they are: `getSchemaCandidateDir` (the `schema.yaml` must stay within its schema directory), `isSchemaDir`, and the transient fork/init directory exclusion.

### 5. Fork logic in a new file, one-line call site

New file `src/core/artifact-graph/standalone-schemas.ts` exports a small function that takes its inputs explicitly: the packaged location (or `null` when it could not be computed) and the executable path. It returns the directory to use. `getPackageSchemasDir()` keeps the `import.meta.url` computation (it must stay in `resolver.ts`, since the path is relative to that module) and delegates the choice. Tests drive the helper with temp directories and never need to fake `import.meta.url` or overwrite `process.execPath`.

New tests go in a new file, `test/core/artifact-graph/standalone-schemas.test.ts`. `test/core/artifact-graph/resolver.test.ts` is not edited, per the runbook rule against editing upstream test files.

## Risks / Trade-offs

- **[Risk] In a bundle, the packaged location can resolve to a real but unrelated path** (`/schemas`, `/home/schemas`, `C:\Users\<user>\AppData\Local\schemas`, depending on how the bundler shims `import.meta.url`). If such a directory exists, it wins over `app/schemas`. → These paths are outside the install root and are never created by OpenSpec. `openspec schema which <name>` prints the real path, so the problem is diagnosable. A packaging step that shims `import.meta.url` to a path inside `app/` avoids it.
- **[Trade-off] One built-in location, not a merge.** If a packager embeds some schemas (for example `pkg` with `assets`) and the installer adds others to `app/schemas`, only the embedded set is used. → The install contract is that schemas ship in `app/schemas` and are not embedded in the binary. Documented in the docs task.
- **[Trade-off] `existsSync` on every call.** `getPackageSchemasDir()` runs a handful of times per command, so up to two extra `stat` calls each. → Negligible next to the YAML parsing that follows. No caching, which also keeps tests free of module state.
- **[Platform] Windows.** Paths with spaces (`C:\Users\Ivan Petrov\…`) and 8.3 short names are handled by `path.join` and canonicalization. No drive-letter logic is involved. Case-insensitivity does not matter because the directory is used as returned and never compared.
- **[Platform] macOS.** An unsigned or quarantined executable will not start at all, so this code never runs. That is packaging territory and outside this change.

## Migration Plan

- No data migration. Existing installs are unaffected (Decision 1).
- Installers for the standalone build place schemas in `<install-root>/app/schemas/<name>/` on every platform, next to `openspec` / `openspec.exe`.
- Once the packaging pipeline produces real executables, repeat the smoke checks from tasks.md group 3 against them on all three platforms. That is outside this change because it depends on the packager.
- Rollback: drop the `patch(standalone-schemas)` commit from the stack. Standalone installs then lose built-in schemas again. npm installs see no difference either way.
