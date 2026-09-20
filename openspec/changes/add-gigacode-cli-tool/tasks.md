## 1. Tool registration

- [x] 1.1 Add the GigaCode CLI entry to `AI_TOOLS` in `src/core/config.ts` with `value: 'gigacode'` and `skillsDir: '.gigacode'`, and verify `openspec init --tools gigacode` in a temp directory writes `.gigacode/skills/openspec-*/SKILL.md`
- [x] 1.2 Add `src/core/command-generation/adapters/gigacode.ts` building its path with `path.join('.gigacode', 'commands', \`opsx-${commandId}.md\`)`, and verify the generated frontmatter matches the Qwen adapter's shape
- [x] 1.3 Register the adapter in `src/core/command-generation/registry.ts` and export it from `adapters/index.ts`, and verify `CommandAdapterRegistry.get('gigacode')` returns it

## 2. Pre-selection

- [x] 2.1 Add the default-selection field to `AIToolOption` in `src/core/config.ts` and set it on the GigaCode CLI entry, and verify `pnpm exec tsc --noEmit` passes
- [x] 2.2 Consult the field in the pre-selection decision in `src/core/init.ts` so it applies only on first-time setup, reusing the existing first-time condition rather than restating it, and verify the interactive choice list marks GigaCode CLI pre-selected in an empty project and unselected in extend mode
- [x] 2.3 Consult the field in the choice sort in `src/core/init.ts` so a pre-selected default is ordered with the tools shown first, and verify it appears above the unconfigured pool in the built choice list

## 3. Tests

- [x] 3.1 Add a test asserting a fresh `openspec init --tools gigacode` writes both `.gigacode/skills/openspec-*/SKILL.md` and `.gigacode/commands/opsx-*.md`, with every expected path built via `path.join()` rather than hardcoded separators
- [x] 3.2 Add a test asserting GigaCode CLI's generated commands and skills spell references as `/opsx-<id>` and contain no `/opsx:` form, mirroring the existing Qwen assertions in `test/core/update.test.ts`
- [x] 3.3 Add a test asserting the generated `.gigacode` tree contains no reference to any other tool's directory
- [x] 3.4 Add tests for the pre-selection rule: pre-selected on first-time setup, not pre-selected in extend mode, not pre-selected when another tool is already configured, and absent from the result when the user deselects it
- [x] 3.5 Add a test asserting the "Getting started" hint printed after init names GigaCode CLI's commands in the `/opsx-` form

## 4. Documentation

- [x] 4.1 Add the GigaCode CLI row to the tool directory reference in `docs/supported-tools.md` and verify its command path and invocation form match what the adapter writes

## 5. Verification

- [x] 5.1 Run `pnpm build && pnpm test && pnpm exec tsc --noEmit && pnpm lint` and verify all four pass
- [ ] 5.2 Verify the Windows CI job passes, confirming `.gigacode` skill and command paths resolve correctly on a non-POSIX separator platform
- [x] 5.3 Confirm this change touches no file touched by the `default-all-workflows` change, so the two patches stay independent in the fork stack
