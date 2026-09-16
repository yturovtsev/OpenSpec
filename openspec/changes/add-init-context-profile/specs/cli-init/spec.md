## ADDED Requirements

### Requirement: MCP Context Profile Configuration

The command SHALL let users record the repository's MCP context profile during initialization, so agents planning work in the project are told which profile to use.

The recorded guidance SHALL be a single line at the end of the project context, naming the MCP server and the selected profile, and it SHALL be available to artifact instructions like any other project context.

#### Scenario: Recording a profile for a new project

- **WHEN** the user runs `openspec init --context-profile <name>` and no OpenSpec config exists
- **THEN** create `openspec/config.yaml` with a project context whose last line names the MCP server and `<name>` as the context profile
- **AND** make that guidance available to artifact instructions

#### Scenario: Recording a profile alongside existing project context

- **WHEN** the user runs `openspec init --context-profile <name>` and an OpenSpec config already exists with project context
- **THEN** add the profile line to the end of the existing context
- **AND** preserve the rest of the configuration, including comments, per-artifact rules, and every other configured field

#### Scenario: Recording a profile when the config has no context

- **WHEN** the user runs `openspec init --context-profile <name>` and an OpenSpec config already exists without project context
- **THEN** give the configuration a project context containing the profile line
- **AND** preserve the rest of the configuration

#### Scenario: Re-running initialization with the same profile

- **WHEN** the user runs `openspec init --context-profile <name>` and the context already ends with that same profile line
- **THEN** leave the project context unchanged
- **AND** report initialization as successful

#### Scenario: Replacing a previously recorded profile

- **WHEN** the user runs `openspec init --context-profile <name>` and the context already records a different profile for the same MCP server
- **THEN** leave exactly one profile line in the context, naming `<name>`
- **AND** preserve the rest of the context

#### Scenario: Recording a profile together with an artifact language

- **WHEN** the user runs `openspec init` with both `--context-profile <name>` and `--language <language>`
- **THEN** the project context carries both the language guidance and the profile line
- **AND** neither instruction displaces the other

#### Scenario: Rejecting an unsafe profile value

- **WHEN** the `--context-profile` value is empty, multiline, contains control characters, or would exceed the project context size limit
- **THEN** fail before creating or changing OpenSpec files
- **AND** explain why the value is invalid

#### Scenario: Profile cannot be written

- **WHEN** the user runs `openspec init --context-profile <name>` and the configuration cannot be written
- **THEN** fail instead of reporting successful initialization
- **AND** leave any existing configuration as it was

## MODIFIED Requirements

### Requirement: Config File Generation

The command SHALL create an OpenSpec config file with schema settings.

An existing config file SHALL be preserved as it is, except where the user explicitly asks initialization to record guidance into it.

#### Scenario: Creating config.yaml

- **WHEN** initialization completes
- **AND** config.yaml does not exist
- **THEN** create `openspec/config.yaml` with default schema setting
- **AND** display config location in output

#### Scenario: Preserving existing config.yaml

- **WHEN** initialization runs in extend mode
- **AND** `openspec/config.yaml` already exists
- **AND** no option asks initialization to record guidance into it
- **THEN** preserve the existing config file
- **AND** display "(exists)" indicator in output

#### Scenario: Updating an existing config.yaml on request

- **WHEN** initialization runs in extend mode
- **AND** `openspec/config.yaml` already exists
- **AND** the user asks initialization to record guidance into the project context
- **THEN** update only the project context
- **AND** preserve every other part of the file
- **AND** report in the output that the config was updated rather than left untouched
