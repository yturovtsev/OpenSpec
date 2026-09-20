## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

The system SHALL define a `ToolCommandAdapter` interface for per-tool formatting.

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandId: string)`: returns file path for command (relative from project root, or absolute for global-scoped tools like Codex)
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **WHEN** formatting a command for Windsurf
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.windsurf/workflows/opsx-<id>.md`

#### Scenario: Trae adapter formatting

- **WHEN** formatting a command for Trae
- **THEN** the adapter SHALL output YAML frontmatter with `name` and `description` fields
- **AND** file path SHALL follow pattern `.trae/commands/opsx-<id>.md`

#### Scenario: GigaCode CLI adapter formatting

- **WHEN** formatting a command for GigaCode CLI
- **THEN** the adapter SHALL output YAML frontmatter with a `description` field
- **AND** file path SHALL follow pattern `.gigacode/commands/opsx-<id>.md`, composed with `path.join()` so it resolves identically on macOS, Linux, and Windows

#### Scenario: GigaCode CLI commands are invoked by filename

- **WHEN** OpenSpec generates commands or skills for GigaCode CLI
- **THEN** every `/opsx:<id>` reference in the generated text SHALL be spelled `/opsx-<id>`, matching the name GigaCode CLI registers from the filename
- **AND** the "Getting started" hint printed after `openspec init` and `openspec update` SHALL use that same spelling
