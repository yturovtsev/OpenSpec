## ADDED Requirements

### Requirement: Built-in schemas next to a standalone executable

When OpenSpec runs as a standalone executable (a single executable file rather than Node.js running the package's files) and the schemas directory shipped inside the package is not present on disk, the system SHALL use the `schemas/` directory located next to the real executable file as its built-in schemas location. This location SHALL behave exactly like the packaged built-in location: it is the lowest-priority source, after project-local and user schemas, and each schema in it is a `<name>/schema.yaml` directory with its `templates/`.

When the schemas directory shipped inside the package is present, the system SHALL keep using it as the only built-in location, so installs from npm, pnpm, or a source checkout resolve built-in schemas exactly as before.

#### Scenario: Standalone executable on Linux or macOS finds schemas next to itself
- **WHEN** OpenSpec runs as the standalone executable `$HOME/.openspec/app/openspec`
- **AND** a schema exists at `$HOME/.openspec/app/schemas/corp-driven/schema.yaml`
- **AND** no project-local or user schema named "corp-driven" exists
- **THEN** `openspec schemas` SHALL list "corp-driven" with source `package`
- **AND** workflow commands for a change using "corp-driven" SHALL load its schema and templates from `$HOME/.openspec/app/schemas/corp-driven/`

#### Scenario: Standalone executable on Windows finds schemas next to itself
- **WHEN** OpenSpec runs as the standalone executable `C:\Users\Ivan Petrov\AppData\Local\Programs\OpenSpec\app\openspec.exe`
- **AND** a schema exists at `C:\Users\Ivan Petrov\AppData\Local\Programs\OpenSpec\app\schemas\corp-driven\schema.yaml`
- **AND** no project-local or user schema named "corp-driven" exists
- **THEN** `openspec schemas` SHALL list "corp-driven" with source `package`
- **AND** the schema SHALL resolve to `C:\Users\Ivan Petrov\AppData\Local\Programs\OpenSpec\app\schemas\corp-driven`, written with Windows path separators

#### Scenario: Launcher in another directory does not move the built-in location
- **WHEN** the user starts OpenSpec through a launcher outside the executable's directory, such as the script `<install-root>\bin\openspec.cmd` on Windows or a script or symlink `$HOME/.openspec/bin/openspec` on Linux and macOS
- **AND** the launcher runs the standalone executable in `<install-root>/app/`
- **THEN** built-in schemas SHALL be read from `<install-root>/app/schemas/`
- **AND** a `schemas/` directory next to the launcher SHALL NOT be used

#### Scenario: Package install keeps its packaged schemas
- **WHEN** OpenSpec is installed from npm and runs through Node.js
- **THEN** built-in schemas SHALL come from the `schemas/` directory inside the installed package
- **AND** a `schemas/` directory next to the Node.js executable SHALL NOT be listed or resolved

#### Scenario: Packaged location wins when both are present
- **WHEN** the schemas directory shipped inside the package is present
- **AND** a `schemas/` directory also exists next to the executable
- **THEN** built-in schemas SHALL come only from the schemas directory shipped inside the package

#### Scenario: Project and user schemas still take precedence
- **WHEN** OpenSpec runs as a standalone executable with "corp-driven" next to it
- **AND** a schema named "corp-driven" also exists at `<projectRoot>/openspec/schemas/corp-driven/schema.yaml`
- **THEN** "corp-driven" SHALL resolve to the project-local schema
- **AND** `openspec schema which corp-driven` SHALL report the schema next to the executable as shadowed, with source `package`

#### Scenario: No built-in schemas available
- **WHEN** OpenSpec runs as a standalone executable
- **AND** neither the schemas directory shipped inside the package nor a `schemas/` directory next to the executable exists
- **THEN** a command that needs a schema SHALL fail with the existing "Schema '<name>' not found" error listing the project-local and user schemas that are available

### Requirement: Built-in schemas next to a standalone executable are reported as package schemas

The system SHALL report schemas found next to a standalone executable with the same source label as packaged built-in schemas, `package`, in human-readable and `--json` output, with the full path of the directory they were read from.

#### Scenario: Schema which reports the location next to the executable
- **WHEN** OpenSpec runs as the standalone executable `<install-root>/app/openspec`
- **AND** "corp-driven" resolves from `<install-root>/app/schemas/corp-driven/`
- **AND** user runs `openspec schema which corp-driven --json`
- **THEN** the output SHALL contain `"source": "package"`
- **AND** `path` SHALL be the full path of `<install-root>/app/schemas/corp-driven`, using the platform's path separators

#### Scenario: Schema list reports package source
- **WHEN** OpenSpec runs as a standalone executable with "spec-driven" and "corp-driven" next to it
- **AND** user runs `openspec schemas --json`
- **THEN** both schemas SHALL be listed with source `package`
