## Why

The fork is distributed as a standalone executable installed per user (`<install-root>/app/openspec[.exe]`, with the shipped schemas in `<install-root>/app/schemas/`), not only as an npm package. OpenSpec finds its built-in schemas relative to its own JavaScript files, which in a packaged executable live inside the packager's virtual filesystem, so a standalone install finds neither `spec-driven` nor the corporate `corp-driven` schema and every workflow command fails with "Schema '…' not found".

## What Changes

- When OpenSpec runs as a standalone executable and its packaged schemas location does not exist, it uses the `schemas/` directory next to the executable as the built-in schemas location.
- The directory is next to the real executable, not the launcher: a launcher script or symlink placed in another directory (`<install-root>/bin/openspec`, `<install-root>\bin\openspec.cmd`) does not change where built-in schemas come from.
- npm, pnpm and source-checkout installs behave exactly as before: their packaged `schemas/` directory always exists, so the location next to the executable is never consulted.
- Schemas found there keep the existing source label `package` in `openspec schemas`, `openspec schema which` and their `--json` output, so the agent contract does not change.
- The precedence order is unchanged: project-local and user schemas still shadow built-in schemas of the same name.
- Docs: the schema precedence section notes where built-in schemas live for a standalone install.

Non-goals:
- Building or packaging the executable itself (bundler choice, code signing, installers).
- Changing which schema name is used by default. The remaining hardcoded `spec-driven` fallbacks belong to the default-schema patch, not this one.
- Other files the CLI reads relative to its own code (for example `package.json` for the version string). Making those available is the packaging step's job.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `schema-resolution`: add where built-in schemas are found when OpenSpec runs as a standalone executable, and how that location is reported.

## Impact

- `src/core/artifact-graph/resolver.ts`: `getPackageSchemasDir()` gains the fallback. Every caller (`getSchemaDir`, `listSchemas`, `listSchemasWithInfo`, `openspec schema which`, the `spec-driven` task-numbering check in the validator) picks it up with no further edits.
- One new fork-owned source file and one new fork-owned test file; no upstream test file is edited.
- No change to the JSON output of any command, no new configuration, no new environment variables, no new dependencies.
- The install layout gains a contract: an installer places schemas in `<install-root>/app/schemas/<name>/` on every platform.
