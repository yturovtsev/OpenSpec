## 1. Built-in location selection

- [x] 1.1 Create `src/core/artifact-graph/standalone-schemas.ts` exporting a helper that takes the packaged schemas location (`string | null`) and an executable path. It returns the packaged location when that directory exists; otherwise `path.join(path.dirname(FileSystemUtils.canonicalizeExistingPath(executablePath)), 'schemas')` when that directory exists; otherwise the packaged location unchanged, or the location next to the executable if the packaged one is `null` (design decisions 1–3). Verify with `pnpm exec tsc --noEmit`.
- [x] 1.2 In `src/core/artifact-graph/resolver.ts`, change only `getPackageSchemasDir()`: compute the packaged location from `import.meta.url` inside a `try`, use `null` if it throws (design decision 3), and return the helper's result for `process.execPath`. Verify that `git diff` on `resolver.ts` touches only that function, and that `test/core/artifact-graph/resolver.test.ts` and `test/core/init.test.ts` pass unmodified.

## 2. Unit tests

- [x] 2.1 Add `test/core/artifact-graph/standalone-schemas.test.ts` (new file; upstream test files stay untouched). Build every path with `path.join` under a temp dir and compare via `fs.realpathSync.native()`. Cover:
  - packaged location exists: it is returned even when `schemas/` also exists next to the executable;
  - packaged location missing, `schemas/` next to the executable exists: the latter is returned;
  - packaged location `null`: `schemas/` next to the executable is returned;
  - neither exists: the packaged location is returned unchanged;
  - neither exists and packaged is `null`: the (missing) `schemas/` next to the executable is returned (design decision 3);
  - executable reached through a symlink in another directory: the `schemas/` beside the symlink target is returned, a decoy `schemas/` beside the link is not (skip on `win32` as `resolver.test.ts` does for symlinks);
  - temp root containing a space.

  Verify with `pnpm exec vitest run test/core/artifact-graph/standalone-schemas.test.ts`.

## 3. End-to-end smoke on a standalone-like layout

- [x] 3.1 After `pnpm build`, script this layout in a scratch dir: `<tmp>/pkg/` holds copies of `dist/`, `bin/` and `package.json`, with `node_modules` linked from the repo and **no** `schemas/`. `<tmp>/app/node` (or `node.exe`) is a copy of the running Node binary. `<tmp>/app/schemas/` holds copies of the repo's shipped schemas. Run `<tmp>/app/node <tmp>/pkg/bin/openspec.js schemas --json` and `… schema which spec-driven --json` with `XDG_CONFIG_HOME`/`XDG_DATA_HOME` pointed at temp dirs and `OPENSPEC_TELEMETRY=0`. Verify every schema is listed with `"source": "package"` and that `path` is `<tmp>/app/schemas/spec-driven`.
- [x] 3.2 Repeat 3.1 through a launcher in `<tmp>/bin/` (a shell script and a symlink on macOS/Linux, a `.cmd` script on Windows), with a decoy `<tmp>/bin/schemas/` present. Verify `path` still points into `<tmp>/app/schemas/`.
- [x] 3.3 In a scratch project containing `openspec/schemas/spec-driven/`, run `schema which spec-driven --json` on the 3.1 layout. Verify `source` is `project` and `shadows` lists `package` at `<tmp>/app/schemas/spec-driven`.
- [x] 3.4 Remove `<tmp>/app/schemas/` and run a schema-dependent command (`templates --schema spec-driven --json`). Verify it exits 1 with the existing "Schema 'spec-driven' not found" diagnostic.
- [x] 3.5 Regression: from the repo, run `node bin/openspec.js schema which spec-driven --json`. Verify `path` is still `<repo>/schemas/spec-driven`.

## 4. Cross-platform verification

- [ ] 4.1 Run the 2.1 test file and smoke steps 3.1–3.2 on Windows (the CI Windows job on the PR, or a Windows machine), using a temp root with a space in it. Verify `path` uses backslashes and resolves into `<tmp>\app\schemas\`.
- [ ] 4.2 Confirm the CI Linux and macOS jobs pass the 2.1 test file, including the symlink case.

## 5. Docs and delivery

- [x] 5.1 In `docs/cli.md` ("Schema precedence", item 3) and the user-level note in `docs/customization.md`, add one line each: a standalone executable reads built-in schemas from `schemas/` next to the executable, and schemas are shipped there, not embedded in the binary. Verify the diff stays at one line per file.
- [ ] 5.2 Run the CI gate `pnpm build && pnpm exec tsc --noEmit && pnpm lint && pnpm test` and verify it is green.
- [ ] 5.3 Land as its own patch, independent of `feat/default-schema`: branch `feat/standalone-schemas` off `fork/main`, carrying this change folder plus the code. Squash title: `patch(standalone-schemas): resolve built-in schemas next to a standalone executable`. Verify with `git show --stat` that the commit holds only these files and no generated artifacts.
