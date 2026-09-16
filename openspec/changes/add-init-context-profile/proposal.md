## Why

Agents already receive project background through the `context` field of `openspec/config.yaml`, which OpenSpec injects into every artifact instruction. Teams whose context lives behind an MCP server keep that background per application ("context profiles"), and today the only way to tell an agent which profile belongs to a repository is to hand-edit `config.yaml` after every `openspec init`. That step is easy to forget and easy to get wrong, so agents plan without the profile their team expects them to use.

`--context-profile` turns that manual edit into a declared part of initialization.

## What Changes

- Add `openspec init --context-profile <name>`, which records the repository's MCP context profile in the project context agents already read.
- The recorded guidance is a single line appended at the end of the project context: `Если ты используешь mcp MCP_NAME, то твой контекстный профиль: <name>`.
- When no OpenSpec config exists, initialization creates `openspec/config.yaml` with that line ending the context.
- When a config already exists, the line is appended to the end of the existing context, and everything else in the file — comments, `rules`, `operations`, and any other field — is preserved.
- Re-running initialization with the same profile leaves the context unchanged, so repeated `init` runs never accumulate duplicate lines.
- A profile value that is empty, spans multiple lines, contains control characters, or would push the context past its size limit fails before any file is created or changed.
- `--context-profile` and `--language` compose: using both records both pieces of guidance in the same context.

## Capabilities

### New Capabilities

None. The flag extends an existing command and writes into an existing context channel.

### Modified Capabilities

- `cli-init`: gains a requirement for configuring a repository's MCP context profile during initialization, and extends config file generation so an existing config can receive the profile line instead of being left untouched.

## Impact

- `src/cli/index.ts` — flag registration and option plumbing for `init`.
- `src/core/init.ts` — option validation, pre-flight check, and the config write path.
- `src/core/config-prompts.ts` — `serializeConfig` today only builds a whole config from scratch; appending into an existing file needs a path that preserves the rest of the document.
- `test/core/init.test.ts` — coverage for fresh init, extend mode, idempotence, validation, and composition with `--language`.
- `docs/cli.md` and `openspec/specs/cli-init/spec.md` — user-facing documentation and the capability spec.
- A changeset, since the change is user-facing.

## Open decisions

- **The MCP server name.** The recorded line names a specific MCP server (`MCP_NAME` above). That literal must be settled before implementation: it is part of the text agents read. Whether it is a fixed constant in this fork or itself configurable is the one question this proposal leaves open.
