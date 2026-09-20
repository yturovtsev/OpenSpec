## MODIFIED Requirements

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include `skillsDir` for tools that support the Agent Skills specification.

#### Scenario: Claude Code paths defined

- **WHEN** looking up the `claude` tool
- **THEN** `skillsDir` SHALL be `.claude`

#### Scenario: Cursor paths defined

- **WHEN** looking up the `cursor` tool
- **THEN** `skillsDir` SHALL be `.cursor`

#### Scenario: Devin Desktop paths defined

- **WHEN** looking up the `devin` tool
- **THEN** `skillsDir` SHALL be `.devin`

#### Scenario: Legacy Windsurf tool ID

- **WHEN** initializing with `openspec init --tools windsurf`
- **THEN** the `windsurf` alias SHALL resolve to `devin`
- **AND** when skill delivery is enabled, skills SHALL be generated under `.devin/skills/`, not `.windsurf/skills/`

#### Scenario: Kimi Code paths defined

- **WHEN** looking up the `kimi` tool
- **THEN** `skillsDir` SHALL be `.kimi-code`
- **AND** OpenSpec-managed skills remaining under the legacy `.kimi/skills` directory SHALL be migrated to `.kimi-code/skills` during init and update, preserving user files

#### Scenario: Hermes Agent paths defined

- **WHEN** looking up the `hermes` tool
- **THEN** `skillsDir` SHALL be `.hermes`
- **AND** `setupNote` SHALL explain that project `.hermes/skills` must be added to `skills.external_dirs` in `~/.hermes/config.yaml`
- **AND** `openspec init` and `openspec update` SHALL display the note whenever `hermes` is configured

#### Scenario: GigaCode CLI paths defined

- **WHEN** looking up the `gigacode` tool
- **THEN** `skillsDir` SHALL be `.gigacode`
- **AND** the tool SHALL own that directory alone, so no other tool's skills are written into it or read from it

#### Scenario: GigaCode CLI skills are written where the assistant reads them

- **WHEN** `openspec init` or `openspec update` configures GigaCode CLI with skill delivery enabled
- **THEN** skills SHALL be written under `.gigacode/skills/`, composed with `path.join()` so the location is identical on macOS, Linux, and Windows
- **AND** the generated skill content SHALL be free of any reference to another tool's directory, so the installed tree describes only GigaCode CLI

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported
