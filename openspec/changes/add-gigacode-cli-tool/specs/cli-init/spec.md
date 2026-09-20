## MODIFIED Requirements

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with skills and slash commands using a searchable multi-select experience.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** display animated welcome screen with OpenSpec logo
- **AND** present a searchable multi-select that shows all available tools
- **AND** mark already configured tools with "(configured ✓)" indicator
- **AND** pre-select configured tools for easy refresh
- **AND** sort configured tools to appear first in the list
- **AND** allow filtering by typing to search

#### Scenario: Default tool is pre-selected when a project is set up for the first time

- **WHEN** `openspec init` runs interactively in a project that has no OpenSpec directory yet and no tool is configured
- **THEN** GigaCode CLI SHALL be pre-selected in the tool list
- **AND** it SHALL be ordered among the tools shown first, so its selection is visible without scrolling or searching

#### Scenario: Default tool is not forced onto an already configured project

- **WHEN** `openspec init` runs interactively in a project that already has an OpenSpec directory, or where at least one tool is already configured
- **THEN** GigaCode CLI SHALL appear in the list unselected unless it is itself already configured
- **AND** the tools that are already configured SHALL remain the ones pre-selected

#### Scenario: A pre-selected default is still the user's to reject

- **WHEN** the user clears GigaCode CLI from the selection before confirming
- **THEN** the command SHALL configure only the tools left selected
- **AND** SHALL NOT create a `.gigacode` directory

#### Scenario: Selecting tools to configure

- **WHEN** user selects tools and confirms
- **THEN** generate skills in `.<tool>/skills/` directory for each selected tool
- **AND** generate slash commands for each selected tool with a command adapter, at that adapter's own path (for example `.claude/commands/opsx/<id>.md` or `.gigacode/commands/opsx-<id>.md`)
- **AND** create `openspec/config.yaml` with default schema setting
